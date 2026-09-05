/**
 * Post-build step that turns the Angular static output into a
 * deploy-ready Cloudflare artifact.
 *
 * It does two things that cannot be written by hand:
 *
 * 1. Generates `_headers`, including a Content-Security-Policy whose
 *    `script-src` lists the SHA-256 hash of every inline script Angular
 *    actually emitted. Those hashes change whenever Angular or the app
 *    changes, so hardcoding them would silently break the site.
 * 2. Copies the prerendered /404 page to `404.html`, which Cloudflare serves
 *    (with a real 404 status) for any unmatched path.
 * 3. Writes `ads.txt` when an AdSense publisher id is configured, and widens
 *    the CSP to the hosts Google's ad stack needs. Both are driven from
 *    site.config.ts so the policy can never allow ad hosts on a build that
 *    is not actually serving ads.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'app', 'browser');

// --- Third-party configuration ----------------------------------------------

/**
 * site.config.ts is the single source of truth for what the app loads, so the
 * CSP is derived from it rather than maintained in parallel. A build with no
 * publisher id keeps the strict, hash-only policy it has today.
 */
const siteConfig = readFileSync(join(root, 'src', 'app', 'core', 'site.config.ts'), 'utf8');

function readConst(name) {
  // Deliberately free of backslash escapes: a lone escape inside a template
  // literal collapses before the RegExp constructor ever sees it.
  const match = new RegExp(`export const ${name}[ ]*=[ ]*['"]([^'"]*)['"]`).exec(siteConfig);
  return match ? match[1] : '';
}

/**
 * Cloudflare's JavaScript Detections (and Bot Fight Mode) rewrite every HTML
 * response at the edge, adding an inline bootstrap for
 * /cdn-cgi/challenge-platform/scripts/jsd/main.js. That happens AFTER this build
 * and after the Worker, so nothing here can change what it emits.
 *
 * It cannot be allowed with a hash: the snippet embeds a per-request token
 * (__CF$cv$params.r), so its SHA-256 differs on every single response. A page
 * load produces several violations, each naming a different required hash.
 *
 * So there are exactly two options, and this flag picks between them:
 *
 *   false — keep the strict hash-only script-src. Cloudflare's snippet is
 *           blocked, which logs a console error on every page load. Nothing
 *           user-facing breaks; the blocked script only feeds bot scoring,
 *           which therefore does not work either.
 *
 *   true  — allow inline scripts, silencing the error. Note that the hashes are
 *           dropped entirely rather than kept alongside: a CSP that contains
 *           hashes makes browsers IGNORE 'unsafe-inline', so keeping both would
 *           change nothing at all.
 *
 * Set this back to false once JavaScript Detections is off in the Cloudflare
 * dashboard (Security -> Settings), which is the real fix.
 */
const ALLOW_EDGE_INJECTED_SCRIPTS = false;

const adsenseClient = readConst('ADSENSE_CLIENT');
const adsEnabled = adsenseClient.startsWith('ca-pub-');
const analyticsToken = readConst('CF_ANALYTICS_TOKEN');
const analyticsEnabled = analyticsToken.length > 0;

/**
 * Hosts Google's ad stack fetches from. Google does not publish a stable,
 * exhaustive list, so this covers the documented set: the loader, the ad
 * server, the creative frames, the consent messaging (CMP) used for EEA
 * traffic, and the ad-traffic-quality endpoints.
 */
const AD_SCRIPT_HOSTS = [
  'https://pagead2.googlesyndication.com',
  'https://partner.googleadservices.com',
  'https://tpc.googlesyndication.com',
  'https://www.googletagservices.com',
  'https://adservice.google.com',
  'https://googleads.g.doubleclick.net',
  'https://fundingchoicesmessages.google.com',
  'https://ep2.adtrafficquality.google',
];

const AD_FRAME_HOSTS = [
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://pagead2.googlesyndication.com',
  'https://www.google.com',
  // Google's consent messaging (CMP) renders its dialog in an iframe from this
  // origin. Without it, EEA and UK visitors never see the consent prompt, and
  // because consent is never obtained, no ads serve to them at all.
  'https://fundingchoicesmessages.google.com',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
];

const AD_CONNECT_HOSTS = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://fundingchoicesmessages.google.com',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
  'https://csi.gstatic.com',
];

if (!existsSync(outDir)) {
  console.error(`No build output at ${outDir}. Run "ng build" first.`);
  process.exit(1);
}

// --- Collect inline script hashes -------------------------------------------

/** Script types the CSP `script-src` directive actually governs. */
const EXECUTABLE_TYPES = new Set(['', 'text/javascript', 'module', 'application/javascript']);

function htmlFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) htmlFiles(full, found);
    else if (entry.endsWith('.html')) found.push(full);
  }
  return found;
}

const sha256 = (value) => `'sha256-${createHash('sha256').update(value, 'utf8').digest('base64')}'`;

const hashes = new Set();
/**
 * Inline event handlers, kept separate because allowing them needs the
 * `unsafe-hashes` keyword. Angular's build optimizer adds
 * `onload="this.media='all'"` to deferred stylesheets, so this is not something
 * the source can avoid.
 */
const handlerHashes = new Set();
const handlerSources = new Set();

for (const file of htmlFiles(outDir)) {
  const html = readFileSync(file, 'utf8');

  const scriptPattern = /<script((?![^>]*\bsrc=)[^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = scriptPattern.exec(html)) !== null) {
    const [, attrs, body] = match;
    const type = (/type\s*=\s*"([^"]*)"/.exec(attrs)?.[1] ?? '').toLowerCase();
    // JSON-LD and Angular's hydration payload are data blocks, not scripts.
    if (!EXECUTABLE_TYPES.has(type)) continue;
    hashes.add(sha256(body));
  }

  const handlerPattern = /\son[a-z]+\s*=\s*"([^"]*)"/gi;
  while ((match = handlerPattern.exec(html)) !== null) {
    handlerHashes.add(sha256(match[1]));
    handlerSources.add(match[1]);
  }
}

// 'unsafe-inline' also covers inline event handlers, so the handler hashes and
// the 'unsafe-hashes' keyword are unnecessary in that mode.
const ownScripts = ALLOW_EDGE_INJECTED_SCRIPTS
  ? ["'unsafe-inline'"]
  : [
      ...[...hashes].sort(),
      ...(handlerHashes.size ? ["'unsafe-hashes'", ...[...handlerHashes].sort()] : []),
    ];

const scriptSrc = [
  "'self'",
  ...ownScripts,
  ...(adsEnabled ? AD_SCRIPT_HOSTS : []),
  ...(analyticsEnabled ? ['https://static.cloudflareinsights.com'] : []),
].join(' ');

const connectSrc = [
  "'self'",
  ...(adsEnabled ? AD_CONNECT_HOSTS : []),
  ...(analyticsEnabled ? ['https://cloudflareinsights.com'] : []),
].join(' ');

// Ad creatives are served from a long tail of advertiser CDNs that cannot be
// enumerated, so the image policy has to widen to https: once ads are on. It
// stays pinned to 'self' otherwise.
const imgSrc = adsEnabled ? `'self' data: blob: https:` : `'self' data: blob:`;

const csp = [
  `default-src 'self'`,
  `script-src ${scriptSrc}`,
  // Angular inlines critical CSS and server-renders [style.x] bindings as style
  // attributes, both of which require unsafe-inline for styles specifically.
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  // data: for Base64 previews, blob: for canvas and PDF output.
  `img-src ${imgSrc}`,
  `connect-src ${connectSrc}`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  ...(adsEnabled ? [`frame-src ${AD_FRAME_HOSTS.join(' ')}`] : []),
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'none'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

// --- _headers ---------------------------------------------------------------

const cspNote = ALLOW_EDGE_INJECTED_SCRIPTS
  ? "script-src uses 'unsafe-inline' so Cloudflare's edge-injected bot script is not blocked."
  : 'The CSP script-src hashes are recomputed from the build output on every run.';

// An ad click-through opens a popup that reads window.opener. 'same-origin'
// severs that reference and breaks click tracking, so the policy relaxes by
// exactly one step — and only on builds that actually serve ads.
const coop = adsEnabled ? 'same-origin-allow-popups' : 'same-origin';

const headers = `# Generated by scripts/prepare-cloudflare.mjs — do not edit by hand.
# ${cspNote}

/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: ${coop}
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=15552000; includeSubDomains

# Fingerprinted build artefacts never change under the same URL.
/chunk-*.js
  Cache-Control: public, max-age=31536000, immutable
/main-*.js
  Cache-Control: public, max-age=31536000, immutable
/polyfills-*.js
  Cache-Control: public, max-age=31536000, immutable
/styles-*.css
  Cache-Control: public, max-age=31536000, immutable
/media/*
  Cache-Control: public, max-age=31536000, immutable

# Icons are stable but not fingerprinted, so allow revalidation.
/icons/*
  Cache-Control: public, max-age=604800
/favicon.ico
  Cache-Control: public, max-age=604800
/icon.svg
  Cache-Control: public, max-age=604800
/og-image.png
  Cache-Control: public, max-age=604800

# HTML must revalidate so a deploy is picked up immediately.
/
  Cache-Control: public, max-age=0, must-revalidate
/*.html
  Cache-Control: public, max-age=0, must-revalidate

# A stale service worker would pin users to an old build.
/sw.js
  Cache-Control: no-cache
  Service-Worker-Allowed: /
/manifest.webmanifest
  Cache-Control: public, max-age=86400
/sitemap.xml
  Cache-Control: public, max-age=3600
/robots.txt
  Cache-Control: public, max-age=3600
`;

writeFileSync(join(outDir, '_headers'), headers);

// --- Service worker precache manifest ---------------------------------------

/**
 * Every JS and CSS bundle, plus the small always-needed assets. HTML pages are
 * deliberately excluded: there are 76 of them totalling several megabytes, and
 * the cached shell can render any of them client-side once the bundles are
 * present.
 */
const precache = [
  ...readdirSync(outDir)
    .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
    .filter((name) => name !== 'sw.js')
    .map((name) => `/${name}`),
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
].sort();

const swPath = join(outDir, 'sw.js');
const swSource = readFileSync(swPath, 'utf8');

// Version the caches by the content of the precache list, so a deploy that
// changes any bundle invalidates the old caches and nothing else does.
const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);

const patchedSw = swSource
  .replace("'__QT_VERSION__'", JSON.stringify(version))
  .replace("['__QT_PRECACHE__']", JSON.stringify(precache));

if (patchedSw === swSource) {
  console.error('sw.js did not contain the expected build-time markers.');
  process.exit(1);
}
writeFileSync(swPath, patchedSw);

// --- 404.html ---------------------------------------------------------------

const prerendered404 = join(outDir, '404', 'index.html');
if (existsSync(prerendered404)) {
  copyFileSync(prerendered404, join(outDir, '404.html'));
} else {
  console.error('Expected a prerendered /404 page but none was found.');
  process.exit(1);
}

// --- ads.txt ----------------------------------------------------------------

const NL = String.fromCharCode(10);

// Written only when a publisher id is configured. An ads.txt containing a
// placeholder is worse than none at all — AdSense reports it as invalid and
// flags the account rather than simply noting the file is absent.
if (adsEnabled) {
  const pubId = adsenseClient.replace(/^ca-/, '');
  writeFileSync(
    join(outDir, 'ads.txt'),
    [
      '# Authorized Digital Sellers — https://iabtechlab.com/ads-txt/',
      '# Generated by scripts/prepare-cloudflare.mjs from ADSENSE_CLIENT in site.config.ts.',
      `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`,
      '',
    ].join(NL) + NL,
  );
}

console.log(
  ALLOW_EDGE_INJECTED_SCRIPTS
    ? "  script-src: 'unsafe-inline' — ALLOW_EDGE_INJECTED_SCRIPTS is on. Set it back to " +
        'false once JavaScript Detections is disabled in the Cloudflare dashboard.'
    : `  script-src: hash-only, ${hashes.size} inline-script hashes, no unsafe-inline.`,
);
console.log(
  'Cloudflare artefacts ready: _headers, ' +
    `404.html, and sw.js precaching ${precache.length} files (version ${version})`,
);
if (handlerSources.size && !ALLOW_EDGE_INJECTED_SCRIPTS) {
  console.log(
    `  Also allowed ${handlerSources.size} inline event handler(s) via unsafe-hashes: ` +
      [...handlerSources].map((h) => JSON.stringify(h)).join(', '),
  );
}
console.log(
  adsEnabled
    ? `  AdSense ON (${adsenseClient}): ads.txt written, CSP widened to Google ad hosts.`
    : '  AdSense OFF: no ads.txt, CSP stays hash-only. Set ADSENSE_CLIENT in site.config.ts.',
);
console.log(
  analyticsEnabled
    ? '  Cloudflare Web Analytics ON: beacon host allowed in CSP.'
    : '  Cloudflare Web Analytics OFF. Set CF_ANALYTICS_TOKEN in site.config.ts.',
);

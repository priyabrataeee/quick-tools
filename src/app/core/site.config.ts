/**
 * Canonical origin used for absolute URLs in SEO tags, JSON-LD and the sitemap.
 *
 * This is the single source of truth: `scripts/generate-sitemap.mjs` reads this
 * value out of this file so the sitemap can never disagree with the canonical
 * tags. Set the SITE_URL environment variable to override it for a preview
 * deployment.
 */
export const SITE_URL = 'https://ondevice-tools.org';

export const SITE_NAME = 'OnDevice Tools';

export const SITE_TAGLINE = 'Free browser-based tools that never upload your data';

export const SITE_DESCRIPTION =
  'A fast, private collection of free online utilities for developers, designers and writers. Everything runs in your browser — nothing is uploaded.';

/**
 * Builds the absolute URL that the host actually serves with a 200.
 *
 * The static build writes each route as `<path>/index.html`. The host serves
 * that at `<path>/` and redirects `<path>` to it, so canonical tags,
 * og:url, JSON-LD and the sitemap all use the trailing-slash form — otherwise
 * every declared URL would be a redirect to the real one.
 */
export function canonicalUrl(path: string): string {
  const clean = `/${path.replace(/^\/+|\/+$/g, '')}`;
  return clean === '/' ? `${SITE_URL}/` : `${SITE_URL}${clean}/`;
}

/** Default social sharing image (served from /public). */
export const SITE_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Google AdSense publisher id, e.g. `ca-pub-1234567890123456`.
 *
 * Leave it empty and the site ships exactly as it does today: no ad script, no
 * ad slots, no third-party cookies. Fill it in and `AdsService` injects the
 * loader during prerender (so the tag is in the static HTML the AdSense crawler
 * fetches) and `<app-ad-slot>` starts rendering units.
 *
 * The same value must also appear in `public/ads.txt`.
 */
export const ADSENSE_CLIENT = 'ca-pub-4291402082894202';

/** True once a publisher id has been configured. */
export const ADS_ENABLED = ADSENSE_CLIENT.startsWith('ca-pub-');

/**
 * Published addresses, routed to a real inbox by Cloudflare Email Routing.
 *
 * Three rather than one because they are read in different contexts and get
 * quoted on different pages: a data-protection request and a bug report should
 * not land in the same thread, and a published privacy contact is what
 * regulators and ad networks look for.
 */
export const EMAIL = {
  /** General enquiries, press, advertising. Shown on About and Contact. */
  contact: 'contact@ondevice-tools.org',
  /** Bug reports and tool problems. */
  support: 'support@ondevice-tools.org',
  /** Data-protection and policy questions. Shown on Privacy and Terms. */
  privacy: 'privacy@ondevice-tools.org',
} as const;

/** Default address where a page has no more specific one. */
export const CONTACT_EMAIL = EMAIL.contact;

/**
 * Voluntary support, for visitors who block ads or would simply rather pay
 * directly. A plain outbound link, deliberately not an embedded widget — a
 * widget would mean another third-party script and another CSP exception.
 */
export const DONATION_URL = 'https://buymeacoffee.com/priyabrataeee';

/** Shown on the About page and emitted as the schema.org Organization founder. */
export const SITE_AUTHOR = 'Priyabrata Saha';

/** Year the site first went live — used in the About page and Terms. */
export const SITE_FOUNDED = '2026';

/**
 * Cloudflare Web Analytics beacon token.
 *
 * Cookieless and per-site rather than per-visitor, which is why it is used here
 * instead of Google Analytics — the privacy page makes that claim explicitly.
 * Empty means no beacon is loaded and no analytics host is allowed by the CSP.
 */
export const CF_ANALYTICS_TOKEN = '';

/**
 * Ad unit ids from the AdSense dashboard (the `data-ad-slot` values).
 *
 * Placement is deliberately conservative: nothing above the fold and nothing
 * beside a tool's primary action, so an ad can never be mistaken for part of
 * the tool. That is both an AdSense policy requirement and the difference
 * between a usable utility and one people stop coming back to.
 */
export const ADSENSE_SLOTS = {
  /** Below the tool UI, above the long-form copy. */
  toolMid: '',
  /** Foot of a tool page, after the related-tools rail. */
  toolFoot: '',
} as const;

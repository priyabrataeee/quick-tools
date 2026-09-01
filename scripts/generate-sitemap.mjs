/**
 * Builds sitemap.xml from the prerendered output.
 *
 * Walking the build result rather than the source registry means the sitemap
 * can never list a page that was not actually generated.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = join(root, 'dist', 'app', 'browser');

/**
 * The canonical origin lives in site.config.ts so the app and the sitemap can
 * never disagree. SITE_URL overrides it for preview deployments.
 */
function resolveSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const config = readFileSync(join(root, 'src', 'app', 'core', 'site.config.ts'), 'utf8');
  const match = /export const SITE_URL\s*=\s*['"]([^'"]+)['"]/.exec(config);
  if (!match) throw new Error('Could not read SITE_URL from src/app/core/site.config.ts');
  return match[1].replace(/\/$/, '');
}

const siteUrl = resolveSiteUrl();

/** Routes that exist but should not be indexed. */
const EXCLUDED = new Set(['/favorites', '/404']);

function findPages(dir, pages = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findPages(full, pages);
    } else if (entry === 'index.html') {
      const rel = relative(browserDir, dirname(full)).split(sep).filter(Boolean).join('/');
      pages.push(rel ? `/${rel}` : '/');
    }
  }
  return pages;
}

function priorityFor(path) {
  if (path === '/') return '1.0';
  if (path === '/tools') return '0.9';
  if (path.startsWith('/category/')) return '0.8';
  if (path.startsWith('/tools/')) return '0.7';
  return '0.4';
}

let pages;
try {
  pages = findPages(browserDir);
} catch {
  console.error(`No prerendered output found at ${browserDir}. Run "npm run build" first.`);
  process.exit(1);
}

const routes = pages.filter((p) => !EXCLUDED.has(p)).sort();
const lastmod = new Date().toISOString().slice(0, 10);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((path) =>
    [
      '  <url>',
      // Trailing slash to match `canonicalUrl()` in src/app/core/site.config.ts:
      // that is the form the host serves with a 200 rather than a redirect.
      `    <loc>${siteUrl}${path === '/' ? '/' : `${path}/`}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${priorityFor(path)}</priority>`,
      '  </url>',
    ].join('\n'),
  ),
  '</urlset>',
  '',
].join('\n');

writeFileSync(join(browserDir, 'sitemap.xml'), xml);

// robots.txt is generated rather than shipped as a static asset so its Sitemap
// line always matches the origin the sitemap was actually built for.
const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  '# Personal, per-browser page — nothing to index.',
  'Disallow: /favorites',
  '',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  '',
].join('\n');

writeFileSync(join(browserDir, 'robots.txt'), robots);

console.log(`Wrote sitemap.xml (${routes.length} URLs) and robots.txt for ${siteUrl}`);

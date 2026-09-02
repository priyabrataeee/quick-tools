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

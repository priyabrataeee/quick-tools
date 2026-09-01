/**
 * QuickTools service worker.
 *
 * The precache list and version are injected at build time by
 * `scripts/prepare-cloudflare.mjs`, which knows the content-hashed filenames
 * this file cannot. Editing the two markers below by hand will be overwritten.
 *
 * Strategy:
 *  - Precache every JS/CSS bundle plus the app shell. That is ~350 KB over the
 *    wire and it is what makes offline navigation to a tool the user has never
 *    opened actually work: the shell boots from cache and the tool's lazily
 *    loaded chunk is already there.
 *  - Navigations are network-first so a deploy is picked up immediately, with
 *    the visited page and then the shell as fallbacks.
 *  - Hashed assets are cache-first: their URL changes when their content does,
 *    so a cache hit is always correct.
 */

/* eslint-disable no-undef */

const VERSION = '__QT_VERSION__';
const PRECACHE_URLS = ['__QT_PRECACHE__'];

const PAGE_CACHE = `qt-pages-${VERSION}`;
const ASSET_CACHE = `qt-assets-${VERSION}`;
const SHELL = '/';

/** Requests in small batches with one retry. */
async function precacheAll(cache, urls, batchSize = 6) {
  const failed = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch {
          failed.push(url);
        }
      }),
    );
  }

  // One retry pass: a burst of parallel requests is the usual reason an
  // individual fetch is dropped, and by now the burst is over.
  for (const url of failed) {
    try {
      await cache.add(new Request(url, { cache: 'reload' }));
    } catch {
      // Give up on this file; it will be cached on first use instead.
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGE_CACHE);
      // The shell first: it is what makes an offline cold start work at all.
      await pages.add(new Request(SHELL, { cache: 'reload' })).catch(() => undefined);

      const cache = await caches.open(ASSET_CACHE);
      await precacheAll(cache, PRECACHE_URLS);
    })(),
  );
  // Deliberately no skipWaiting(): swapping the worker under a running tab can
  // leave it lazy-loading chunks that the new deploy has already removed. The
  // update activates on the next full load instead.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('qt-') && key !== PAGE_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept cross-origin requests (the web font, for example) — the
  // browser's own HTTP cache handles those.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          // Offline: the exact page if it has been visited, otherwise the shell,
          // which boots the app and routes client-side to the requested URL.
          return (
            (await caches.match(request)) ??
            (await caches.match(SHELL)) ??
            new Response('You are offline and this page has not been cached yet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});

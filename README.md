# OnDevice Tools

**63 free browser tools that never upload your data.**

[**ondevice-tools.org**](https://ondevice-tools.org) &nbsp;·&nbsp;
[How it works](#how-it-works) &nbsp;·&nbsp;
[Run it locally](#getting-started) &nbsp;·&nbsp;
[Add a tool](#adding-a-tool)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-0f5f8a.svg)](LICENSE)
![No backend](https://img.shields.io/badge/backend-none-1c7048)
![Works offline](https://img.shields.io/badge/offline-yes-1c7048)

<!-- A product screenshot converts better than a branded card. Capture the home page
     at 1280×800 and save it as docs/screenshot.png, then swap the src below. -->

![OnDevice Tools](https://ondevice-tools.org/og-image.png)

---

Most free online tools work the same way: you choose a file, the page uploads it to a server you
know nothing about, something happens there, and a result comes back. For a throwaway snippet
that's fine. For a contract, a passport scan, a database dump, or a JWT from a live environment,
it's a decision most people wouldn't make consciously if the page said out loud what it was doing.

This site removes the decision. Every tool here is JavaScript that runs on your own machine. Your
file is read by the browser, processed by the browser, and handed back by the browser. **There is
no upload step to opt out of, because there is no server capable of receiving one.**

## The thirty-second proof

Don't take the claim on trust — it's falsifiable, which is the point of publishing the source:

1. Open <https://ondevice-tools.org>, press <kbd>F12</kbd>, switch to the **Network** tab.
2. Use any tool. Compress an image, decode a JWT, merge a PDF.
3. Nothing you typed or opened appears in any request.

Or skip all that and **turn off your wifi**. Once the service worker has cached the site, every
tool still works. Software that genuinely uploads your data cannot run on a plane.

## What's in it

| | |
| --- | --- |
| **Developer** | JSON / XML / YAML / SQL formatters, Base64 and URL encoders, JWT decoder, hashing, live regex tester, cron builder |
| **Text** | Diff and compare, word and character counts, case conversion, slugs, sorting, deduplication |
| **Image** | Compress, resize, crop, convert, extract palettes, generate favicons — all via Canvas |
| **PDF** | Merge, split, rotate, build from images |
| **CSS & colour** | Shadow, gradient, grid and flexbox generators, colour conversion, WCAG contrast checking |
| **Calculators** | Percentages, EMI, SIP, GST, compound interest, unit conversion, date arithmetic |

Plus a <kbd>Ctrl</kbd>+<kbd>K</kbd> command palette, favourites and history in `localStorage`, dark
mode, and a PWA install.

## How it works

Each of the 63 tools is prerendered to plain HTML at build time and served as a static file from a
CDN — the same way an image is served. Opening a tool downloads a small JavaScript bundle for that
one tool and runs it locally.

The heavy lifting uses capabilities browsers already ship: **Canvas** for image compression and
resizing, the **File API** for reading files you choose, **Web Crypto** for hashing, and the
built-in parsers for JSON, XML and YAML. Longer jobs run in a **Web Worker** so the page stays
responsive. None of that involves a network request.

## An honest note on funding

The site is funded by advertising, so page views are measured and ad cookies are set. The content
you put into a tool is a separate matter: it is never transmitted, because there is no server that
could receive it.

An advertiser can know you visited the image compressor. It cannot know anything about the image.

`src/app/pages/privacy/privacy.component.ts` states that distinction in the terms a visitor sees.
Its third-party disclosures are gated on `ADS_ENABLED` and `CF_ANALYTICS_TOKEN`, so the policy
can't describe something the build isn't doing — or stay silent once it is. If the site starts
doing something new, that page changes first.

---

## Tech stack

| Concern      | Choice                                                              |
| ------------ | ------------------------------------------------------------------- |
| Framework    | Angular 21, standalone components, zoneless change detection         |
| State        | Signals (`signal` / `computed` / `effect`) — RxJS only for the router |
| Styling      | Tailwind CSS v4 with CSS custom properties for theming               |
| Rendering    | Angular SSR used as a **static site generator** (all routes prerendered) |
| Icons        | Hand-drawn inline SVG set — no icon font, no network request         |
| PDF          | `pdf-lib`, loaded lazily and only on the PDF tool pages              |
| Deployment   | Plain static files — Cloudflare Workers, Netlify, Vercel, S3, anything |

There is **no runtime dependency on a server**. `dist/app/browser` is a folder of static HTML,
CSS, JS and images.

---

## Getting started

```bash
npm install
npm start          # dev server on http://localhost:4200
```

Other scripts:

```bash
npm run build              # production build + sitemap generation
npm run lint               # ESLint over TypeScript and templates
npm run generate:icons     # regenerate favicon.ico, app icons and the OG image
npm run generate:sitemap   # regenerate sitemap.xml from the built output
```

---

## Deploying to Cloudflare

This deploys as a **Workers project with static assets** (`wrangler deploy`), not a Pages project.
Cloudflare now steers new projects to Workers, and the two use different config keys — mixing them
is what causes `Missing entry-point to Worker script or to assets directory`.

### 1. Set your domain

`SITE_URL` in [`src/app/core/site.config.ts`](src/app/core/site.config.ts) is the single source of
truth for canonical tags, Open Graph URLs, JSON-LD and the sitemap. Change it before your first
deploy:

```ts
export const SITE_URL = 'https://your-domain.com';
```

For a throwaway preview you can override it at build time instead:
`SITE_URL=https://ondevice-tools.workers.dev npm run build`.

### 2. Preview exactly what Cloudflare will serve

```bash
npm run preview
```

This builds and runs `wrangler dev` on `http://localhost:8788` using the same asset server as
production — so `_headers`, the 404 status, trailing-slash redirects, the CSP and the service
worker all behave locally exactly as they will once deployed.

### 3. Deploy

From your machine:

```bash
npx wrangler login
npm run deploy
```

Or connect the Git repository in the Cloudflare dashboard:

| Setting        | Value                                 |
| -------------- | ------------------------------------- |
| Build command  | `npm run build`                       |
| Deploy command | `npx wrangler deploy`                 |
| Node version   | 20 or newer (`.node-version` pins 22) |

There is no "build output directory" setting to fill in — `wrangler.toml` points at
`dist/app/browser` via `[assets] directory`. Change `name` in that file if your Worker is called
something else.

`wrangler.toml` has no `main`, which makes this an **assets-only Worker**: Cloudflare serves the
files directly with no script in the request path.

> **If you would rather use Pages**, swap `[assets]` for
> `pages_build_output_dir = "dist/app/browser"` in `wrangler.toml`, and set the deploy command to
> `npx wrangler pages deploy`. Both hosts behave identically for this site; Workers is the default
> for new projects.

### What the build generates

`npm run build` runs `ng build` and then two scripts that produce things which cannot be written by
hand:

- **`_headers`** — security headers plus a Content-Security-Policy whose `script-src` lists the
  SHA-256 hash of every inline script Angular actually emitted. These hashes change with every
  Angular or app change, so they are recomputed from the build output on each run. (Workers Static
  Assets supports `_headers`; `wrangler dev` logs how many rules it parsed.)
- **`404.html`** — a copy of the prerendered `/404` page. `not_found_handling = "404-page"` makes
  Cloudflare serve it with a real 404 status for unmatched paths.
- **`sw.js` precache manifest** — the content-hashed bundle filenames, injected into the service
  worker so a first-time visitor can later open *any* tool offline, not just ones they have already
  visited.
- **`sitemap.xml` and `robots.txt`** — derived from the pages that were actually prerendered.

### A note on trailing slashes

The static build writes each route as `<path>/index.html`, which is served at `<path>/`. Canonical
tags, `og:url`, JSON-LD and the sitemap therefore all use the trailing-slash form, via
`canonicalUrl()` in `site.config.ts` — otherwise every URL you publish would redirect to the real
one. `html_handling = "force-trailing-slash"` in `wrangler.toml` pins the server to the matching
convention, so the two can never drift apart.

### Other static hosts

The output is plain static files, so Netlify, Vercel or S3 + CloudFront all work with build command
`npm run build` and output directory `dist/app/browser`. `_headers` is Cloudflare/Netlify syntax;
other hosts need their own equivalent, and you may need to flip the trailing-slash convention above.

---

## Project structure

```
src/app/
  core/                 Services, the tool registry and shared helpers
    data/tools/         One file per category — the single source of truth
    seo.service.ts      Titles, canonicals, Open Graph, Twitter, JSON-LD
    theme.service.ts    light / dark / system preference
    tool.service.ts     Registry lookups, ranked search, favourites, recents
  layouts/main-layout/  Header, footer, skip link, toasts, command palette
  pages/                Home, all tools, category, favourites, privacy, 404
  shared/components/    Tool layout, cards, upload zone, result panel, icons…
  tools/<category>/     One lazily loaded component per tool
    <category>/lib/     Pure, testable logic (YAML, SQL, cron, colour, units…)
scripts/                Icon and sitemap generators (plain Node, no deps)
public/                 Static assets, manifest, service worker, robots.txt
```

### Adding a tool

1. Add an entry to the relevant file in `src/app/core/data/tools/`. This one entry drives the
   router link, search index, category page, breadcrumb, FAQ block, JSON-LD and sitemap.
2. Create the component and wrap its UI in `<app-tool-layout toolId="your-id">`. The layout
   supplies the heading, description, favourite and share buttons, FAQ, long-form copy and
   related tools from the registry — the component only provides the interactive part.
3. Add a lazy route in `src/app/app.routes.ts`.

Keep any non-trivial logic in a `lib/` file next to the component: those modules are dependency-free
and can be run directly with `node file.ts`, which makes them straightforward to check.

---

## What is implemented

- **Developer (15)** — JSON formatter / validator / minifier, JWT decoder, UUID generator, regex
  tester, cron generator, Base64, URL encoder, HTML entities, Unix timestamps, hashes, SQL, XML
  and YAML.
- **Text (11)** — text compare (diff), word and character counters, reading time, deduplicate,
  sort, reverse, case conversion, slugs, Lorem Ipsum, whitespace cleanup.
- **Image (8)** — compress, resize, crop, convert, to/from Base64, palette extraction, favicons.
- **PDF (4)** — merge, split, rotate, images to PDF.
- **CSS (6)** — box shadow, gradient, border radius, clamp, flexbox, grid.
- **Colour (2)** — format converter, WCAG contrast checker.
- **Calculators (6)** — percentage, EMI, GST, SIP, compound interest, discount.
- **Converters (7)** — length, weight, temperature, area, speed, volume, currency.
- **Date & time (4)** — age, date difference, working days, time zones.

Plus: global Ctrl/Cmd+K command palette, ranked search, favourites and recents in `localStorage`,
light/dark/system theming, a service worker for offline use, per-page SEO metadata with JSON-LD,
and a generated `sitemap.xml`.

---

## Notes and limitations

- **Currency rates are static.** The app makes no network calls, so it ships with a dated snapshot
  of reference rates that the user can override. The UI says so and shows the snapshot date.
- **The JWT decoder does not verify signatures.** Verification needs a secret or public key, which
  should never be pasted into a web page.
- **The YAML parser covers the configuration subset** — mappings, sequences, scalars, comments,
  block scalars and flow collections. Anchors, aliases and custom tags are reported rather than
  silently mis-parsed.
- **MD5 is not offered** by the hash generator: the Web Crypto API deliberately excludes it.
- **AVIF encoding depends on the browser.** The image converter checks the type it actually got
  back and tells the user when it had to fall back.

## Security posture

- **Content-Security-Policy** with hashed inline scripts — no `unsafe-inline` and no `unsafe-eval`
  for scripts. `style-src` does allow `unsafe-inline`, which Angular requires because it inlines
  critical CSS and server-renders `[style.x]` bindings as style attributes.
- `'unsafe-hashes'` is present for exactly one handler, `this.media='all'`, which Angular's build
  optimizer attaches to deferred stylesheets. The generator prints it on every build so it cannot
  grow unnoticed.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` — the site cannot be framed.
- No `bypassSecurityTrust*` calls anywhere in the app. The one place that touches `innerHTML`
  (HTML-entity decoding) writes into a detached `<textarea>` and reads back `.value`, where content
  is parsed as raw text and cannot execute.

## Privacy

The reasoning is in [An honest note on funding](#an-honest-note-on-funding). This is the concrete
inventory.

**Stored on the visitor's device**, never transmitted:

| Key | Holds |
| --- | --- |
| `qt.theme` | light / dark / system preference |
| `qt.favorites` | ids of saved tools |
| `qt.recent` | ids of the last few tools opened |

Clearing site data removes all three, and every tool behaves identically without them.

**Third-party requests**, all of them:

| Origin | Purpose | Cookies |
| --- | --- | --- |
| `fonts.googleapis.com` / `fonts.gstatic.com` | Inter typeface | no |
| `pagead2.googlesyndication.com` + Google ad hosts | AdSense — funds the site | yes |
| `static.cloudflareinsights.com` | Cloudflare Web Analytics — aggregate page views | no |

Once the service worker has cached the app, the tools work offline with none of the above.

Anything that changes this list must change
`src/app/pages/privacy/privacy.component.ts` in the same commit, and the CSP in
`scripts/prepare-cloudflare.mjs` will need the new origin or the request will be blocked.

## License

Licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later). The full
text is in [`LICENSE`](LICENSE).

    OnDevice Tools — free browser-based tools that never upload your data
    Copyright (C) 2026 Priyabrata Saha

    This program is free software: you can redistribute it and/or modify it under
    the terms of the GNU Affero General Public License as published by the Free
    Software Foundation, either version 3 of the License, or (at your option) any
    later version.

    This program is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
    FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
    details.

    You should have received a copy of the GNU Affero General Public License along
    with this program. If not, see <https://www.gnu.org/licenses/>.

### Why AGPL rather than MIT

The AGPL's distinguishing feature is **section 13**: anyone who modifies this code and lets users
interact with it over a network must offer those users the corresponding source. For a hosted web
app that is the clause that matters — a permissive licence would let someone run a modified, closed
copy as a competing service. AGPL does not prevent that, but it requires them to publish their
changes.

It does not restrict *use*. Anyone may run, study, modify and self-host this, commercially included.

All dependencies are MIT, Apache-2.0 or 0BSD, which combine into an AGPL-3.0 work without conflict.

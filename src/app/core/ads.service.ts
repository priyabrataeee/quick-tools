import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ADSENSE_CLIENT, ADS_ENABLED } from './site.config';

const LOADER_ID = 'adsense-loader';
const LOADER_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/**
 * Injects the AdSense loader into `<head>`.
 *
 * This runs during prerender as well as in the browser, so the tag ends up in
 * the static HTML that the AdSense verification crawler fetches — it does not
 * execute JavaScript, and a tag added only at runtime would be invisible to it.
 *
 * Nothing at all is injected while `ADSENSE_CLIENT` is empty, which keeps the
 * default build free of third-party requests.
 */
@Injectable({ providedIn: 'root' })
export class AdsService {
  private readonly document = inject(DOCUMENT);

  readonly enabled = ADS_ENABLED;
  readonly client = ADSENSE_CLIENT;

  install(): void {
    if (!ADS_ENABLED) return;

    const head = this.document.head;
    if (head.querySelector(`#${LOADER_ID}`)) return;

    const script = this.document.createElement('script');
    script.id = LOADER_ID;
    script.async = true;
    script.src = `${LOADER_SRC}?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
    // Required by AdSense: the loader is fetched cross-origin and Google reads
    // the response as an opaque-free CORS request.
    script.crossOrigin = 'anonymous';
    head.appendChild(script);
  }
}

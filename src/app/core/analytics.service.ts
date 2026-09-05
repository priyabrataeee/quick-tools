import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { CF_ANALYTICS_TOKEN } from './site.config';

const BEACON_ID = 'cf-beacon';
const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

/**
 * Cloudflare Web Analytics.
 *
 * Cookieless and aggregate-only, which is the reason it is used here rather
 * than Google Analytics: the privacy page states that no visitor is tracked
 * across sites, and this is the measurement that keeps that true.
 *
 * Loads nothing while `CF_ANALYTICS_TOKEN` is empty.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);

  readonly enabled = CF_ANALYTICS_TOKEN.length > 0;

  install(): void {
    if (!this.enabled) return;

    const head = this.document.head;
    if (head.querySelector(`#${BEACON_ID}`)) return;

    const script = this.document.createElement('script');
    script.id = BEACON_ID;
    // Cloudflare ships this as an ES module, so it must be loaded as one — a
    // classic <script> would fail to parse it. Modules are deferred already,
    // which is why there is no defer attribute here.
    script.type = 'module';
    script.src = BEACON_SRC;
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_ANALYTICS_TOKEN }));
    head.appendChild(script);
  }
}

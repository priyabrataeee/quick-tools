import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AdsService } from '../../../core/ads.service';

/**
 * A single AdSense unit.
 *
 * Renders nothing at all until a publisher id is configured, so the default
 * build stays free of third-party requests and the layout is unchanged.
 *
 * Two details keep this from degrading the page:
 *
 * - The wrapper reserves `minHeight` up front. Without it the unit expands once
 *   the ad arrives and shoves the content below it down, which is measured
 *   directly as Cumulative Layout Shift — the one Core Web Vital that ads
 *   reliably damage.
 * - When Google has no ad to serve it marks the element `data-ad-status`
 *   "unfilled". That is watched for, and the reserved space is released, so a
 *   page with no inventory does not show a labelled empty box.
 */
@Component({
  selector: 'app-ad-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ads.enabled) {
      <aside
        class="my-8 flex-col items-center justify-center overflow-hidden"
        [class.flex]="!unfilled()"
        [class.hidden]="unfilled()"
        [style.min-height.px]="unfilled() ? null : minHeight()"
        aria-label="Advertisement"
      >
        <span class="mb-1 text-[10px] font-medium tracking-wider text-faint uppercase">
          Advertisement
        </span>
        <ins
          #unit
          class="adsbygoogle block w-full"
          [style.min-height.px]="minHeight()"
          [attr.data-ad-client]="ads.client"
          [attr.data-ad-slot]="slot()"
          [attr.data-ad-format]="format()"
          [attr.data-full-width-responsive]="fullWidth() ? 'true' : 'false'"
        ></ins>
      </aside>
    }
  `,
})
export class AdSlotComponent {
  /** Ad unit id from the AdSense dashboard (the `data-ad-slot` value). */
  readonly slot = input.required<string>();
  readonly format = input('auto');
  readonly fullWidth = input(true);
  /** Space reserved before the unit loads. Match it to the unit's usual height. */
  readonly minHeight = input(280);

  protected readonly ads = inject(AdsService);
  protected readonly unfilled = signal(false);

  private readonly unit = viewChild<ElementRef<HTMLElement>>('unit');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const el = this.unit()?.nativeElement;
      if (!this.isBrowser || !this.ads.enabled || !el) return;

      const observer = new MutationObserver(() => {
        if (el.getAttribute('data-ad-status') === 'unfilled') this.unfilled.set(true);
      });
      observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
      this.destroyRef.onDestroy(() => observer.disconnect());

      try {
        const w = window as unknown as { adsbygoogle?: unknown[] };
        (w.adsbygoogle = w.adsbygoogle ?? []).push({});
      } catch {
        // The loader was blocked (ad blocker, offline, CSP). Release the
        // reserved space rather than leaving a labelled gap on the page.
        this.unfilled.set(true);
      }
    });
  }
}

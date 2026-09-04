import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DONATION_URL } from '../../../core/site.config';
import { IconComponent } from '../icon/icon.component';

/**
 * Voluntary-support prompt.
 *
 * Placed after someone has actually got a result rather than before, which is
 * the only point at which the ask is reasonable. Deliberately a plain outbound
 * link and not an embedded widget: a widget would be another third-party
 * script, another CSP exception, and another thing loading on every page.
 */
@Component({
  selector: 'app-support-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <aside
      class="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-amber-300/70 bg-amber-50 p-5 sm:flex-row sm:items-center dark:border-amber-500/30 dark:bg-amber-950/30"
    >
      <span
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950"
      >
        <app-icon name="coffee" class="h-6 w-6" />
      </span>

      <div class="min-w-0 flex-1">
        <p class="font-semibold text-fg">{{ heading() }}</p>
        <p class="mt-0.5 text-sm leading-relaxed text-muted">
          Every tool here is free, with no account and no limits. If one saved you some time, you
          can chip in towards the running costs — entirely optional, and nothing is held back if
          you don't.
        </p>
      </div>

      <a
        [href]="donationUrl"
        target="_blank"
        rel="noopener nofollow"
        class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
      >
        <app-icon name="coffee" class="h-4 w-4" />
        Buy me a coffee
      </a>
    </aside>
  `,
})
export class SupportCardComponent {
  readonly heading = input('Found this useful?');

  protected readonly donationUrl = DONATION_URL;
}

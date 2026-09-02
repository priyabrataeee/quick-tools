import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { formatUnitValue } from '../lib/units';

/**
 * Static reference rates, quoted per 1 USD.
 *
 * OnDevice Tools has no backend and makes no network calls, so these ship with the
 * app. They are indicative only — the UI says so, shows the snapshot date, and
 * lets the user override any rate.
 */
const RATES_DATE = '2026-04-01';
const RATES: { code: string; name: string; perUsd: number }[] = [
  { code: 'USD', name: 'US Dollar', perUsd: 1 },
  { code: 'EUR', name: 'Euro', perUsd: 0.92 },
  { code: 'GBP', name: 'British Pound', perUsd: 0.79 },
  { code: 'INR', name: 'Indian Rupee', perUsd: 83.4 },
  { code: 'JPY', name: 'Japanese Yen', perUsd: 151.2 },
  { code: 'CNY', name: 'Chinese Yuan', perUsd: 7.23 },
  { code: 'AUD', name: 'Australian Dollar', perUsd: 1.53 },
  { code: 'CAD', name: 'Canadian Dollar', perUsd: 1.36 },
  { code: 'CHF', name: 'Swiss Franc', perUsd: 0.9 },
  { code: 'SGD', name: 'Singapore Dollar', perUsd: 1.35 },
  { code: 'AED', name: 'UAE Dirham', perUsd: 3.67 },
  { code: 'BRL', name: 'Brazilian Real', perUsd: 5.02 },
  { code: 'ZAR', name: 'South African Rand', perUsd: 18.8 },
  { code: 'NZD', name: 'New Zealand Dollar', perUsd: 1.67 },
  { code: 'SEK', name: 'Swedish Krona', perUsd: 10.65 },
  { code: 'MXN', name: 'Mexican Peso', perUsd: 16.6 },
];

@Component({
  selector: 'app-currency-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent],
  template: `
    <app-tool-layout toolId="currency-converter">
      <div class="flex flex-col gap-5">
        <div class="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
          <app-icon name="alert" class="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            These are static reference rates from {{ ratesDate }}, bundled with the app so it works
            offline. They are indicative only — override the rate below with the one you were
            actually quoted.
          </span>
        </div>

        <div class="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label class="label" for="cc-amount">Amount</label>
            <div class="flex gap-2">
              <input
                id="cc-amount"
                type="number"
                class="input"
                [value]="amount()"
                (input)="amount.set($any($event.target).value)"
              />
              <select
                class="select w-32"
                [value]="from()"
                (change)="from.set($any($event.target).value)"
                aria-label="Convert from"
              >
                @for (rate of rates; track rate.code) {
                  <option [value]="rate.code">{{ rate.code }}</option>
                }
              </select>
            </div>
          </div>

          <button type="button" class="btn btn-secondary mb-0.5" (click)="swap()" aria-label="Swap currencies">
            <app-icon name="swap" class="h-4 w-4" />
          </button>

          <div>
            <label class="label" for="cc-result">Converted to</label>
            <div class="flex gap-2">
              <input id="cc-result" type="text" class="input" [value]="converted()" readonly />
              <select
                class="select w-32"
                [value]="to()"
                (change)="to.set($any($event.target).value)"
                aria-label="Convert to"
              >
                @for (rate of rates; track rate.code) {
                  <option [value]="rate.code">{{ rate.code }}</option>
                }
              </select>
            </div>
          </div>
        </div>

        <div>
          <label class="label" for="cc-rate">
            Exchange rate — 1 {{ from() }} = ? {{ to() }}
          </label>
          <div class="flex gap-2">
            <input
              id="cc-rate"
              type="number"
              class="input max-w-xs"
              step="any"
              [value]="rate()"
              (input)="customRate.set($any($event.target).value)"
            />
            @if (customRate() !== '') {
              <button type="button" class="btn btn-ghost" (click)="customRate.set('')">
                Reset to bundled rate
              </button>
            }
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            {{ amountLabel() }} in other currencies
          </h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of table(); track row.code) {
                <tr [class.bg-brand-soft]="row.code === to()">
                  <td class="px-3 py-2">
                    <span class="font-medium">{{ row.code }}</span>
                    <span class="ml-2 text-faint">{{ row.name }}</span>
                  </td>
                  <td class="px-3 py-2 text-right font-mono">{{ row.value }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class CurrencyConverterComponent {
  protected readonly rates = RATES;
  protected readonly ratesDate = RATES_DATE;

  protected readonly amount = signal('100');
  protected readonly from = signal('USD');
  protected readonly to = signal('EUR');
  protected readonly customRate = signal('');

  private readonly numericAmount = computed(() => {
    const n = Number(this.amount());
    return Number.isFinite(n) ? n : 0;
  });

  private perUsd(code: string): number {
    return RATES.find((r) => r.code === code)?.perUsd ?? 1;
  }

  private readonly bundledRate = computed(() => this.perUsd(this.to()) / this.perUsd(this.from()));

  protected readonly rate = computed(() => {
    const custom = Number(this.customRate());
    if (this.customRate() !== '' && Number.isFinite(custom) && custom > 0) return custom;
    return this.bundledRate();
  });

  protected readonly converted = computed(() =>
    formatUnitValue(this.numericAmount() * this.rate(), 2),
  );

  protected readonly amountLabel = computed(
    () => `${formatUnitValue(this.numericAmount(), 2)} ${this.from()}`,
  );

  protected readonly table = computed(() => {
    const inUsd = this.numericAmount() / this.perUsd(this.from());
    return RATES.map((entry) => ({
      code: entry.code,
      name: entry.name,
      value: formatUnitValue(inUsd * entry.perUsd, 2),
    }));
  });

  protected swap(): void {
    const from = this.from();
    this.from.set(this.to());
    this.to.set(from);
    // The custom rate belonged to the old direction, so drop it.
    this.customRate.set('');
  }
}

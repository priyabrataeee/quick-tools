import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface YearRow {
  year: number;
  invested: number;
  value: number;
  gain: number;
}

@Component({
  selector: 'app-sip-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="sip-calculator">
      <div class="flex flex-col gap-6">
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <label class="label" for="sip-amount">Monthly investment</label>
            <input
              id="sip-amount"
              type="number"
              class="input"
              min="100"
              [value]="monthly()"
              (input)="monthly.set(+$any($event.target).value)"
            />
            <input
              type="range"
              class="mt-2 w-full"
              min="500"
              max="200000"
              step="500"
              [value]="monthly()"
              (input)="monthly.set(+$any($event.target).value)"
              aria-label="Monthly investment slider"
            />
          </div>

          <div>
            <label class="label" for="sip-return">Expected annual return (%)</label>
            <input
              id="sip-return"
              type="number"
              class="input"
              min="1"
              max="40"
              step="0.5"
              [value]="annualReturn()"
              (input)="annualReturn.set(+$any($event.target).value)"
            />
            <input
              type="range"
              class="mt-2 w-full"
              min="1"
              max="30"
              step="0.5"
              [value]="annualReturn()"
              (input)="annualReturn.set(+$any($event.target).value)"
              aria-label="Expected return slider"
            />
          </div>

          <div>
            <label class="label" for="sip-years">Investment period: {{ years() }} years</label>
            <input
              id="sip-years"
              type="range"
              class="w-full"
              min="1"
              max="40"
              [value]="years()"
              (input)="years.set(+$any($event.target).value)"
            />
          </div>

          <div>
            <label class="label" for="sip-stepup">Annual step-up: {{ stepUp() }}%</label>
            <input
              id="sip-stepup"
              type="range"
              class="w-full"
              min="0"
              max="25"
              [value]="stepUp()"
              (input)="stepUp.set(+$any($event.target).value)"
            />
            <p class="mt-1 text-xs text-faint">Increase your contribution by this much each year.</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold">{{ money(totalInvested()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Total invested</p>
          </div>
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold text-success">{{ money(totalGain()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Estimated gain</p>
          </div>
          <div class="rounded-2xl border border-brand/30 bg-brand-soft p-5 text-center">
            <p class="text-2xl font-bold text-brand">{{ money(maturity()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Maturity value</p>
          </div>
        </div>

        <div>
          <div class="mb-2 flex justify-between text-sm text-muted">
            <span>Invested {{ investedShare() }}%</span>
            <span>Returns {{ 100 - investedShare() }}%</span>
          </div>
          <div class="flex h-3 overflow-hidden rounded-full bg-bg-subtle">
            <div class="bg-brand" [style.width.%]="investedShare()"></div>
            <div class="bg-success" [style.width.%]="100 - investedShare()"></div>
          </div>
        </div>

        <section class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Year by year
          </h3>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-bg-subtle text-xs tracking-wide text-faint uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">Year</th>
                  <th class="px-3 py-2 text-right">Invested</th>
                  <th class="px-3 py-2 text-right">Gain</th>
                  <th class="px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (row of schedule(); track row.year) {
                  <tr>
                    <td class="px-3 py-2">{{ row.year }}</td>
                    <td class="px-3 py-2 text-right">{{ money(row.invested) }}</td>
                    <td class="px-3 py-2 text-right text-success">{{ money(row.gain) }}</td>
                    <td class="px-3 py-2 text-right font-medium">{{ money(row.value) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
          These figures are an illustration based on a constant rate of return. Market-linked
          investments do not deliver a fixed return, and past performance guarantees nothing.
        </p>
      </div>
    </app-tool-layout>
  `,
})
export class SipCalculatorComponent {
  protected readonly monthly = signal(10000);
  protected readonly annualReturn = signal(12);
  protected readonly years = signal(15);
  protected readonly stepUp = signal(0);

  protected readonly schedule = computed<YearRow[]>(() => {
    const rate = this.annualReturn() / 12 / 100;
    let contribution = Math.max(0, this.monthly());
    let value = 0;
    let invested = 0;
    const rows: YearRow[] = [];

    for (let year = 1; year <= this.years(); year++) {
      for (let month = 0; month < 12; month++) {
        // Contribution at the start of the month, then a month of growth.
        value = (value + contribution) * (1 + rate);
        invested += contribution;
      }
      rows.push({ year, invested, value, gain: value - invested });
      contribution *= 1 + this.stepUp() / 100;
    }

    return rows;
  });

  private readonly last = computed(() => this.schedule()[this.schedule().length - 1]);

  protected readonly maturity = computed(() => this.last()?.value ?? 0);
  protected readonly totalInvested = computed(() => this.last()?.invested ?? 0);
  protected readonly totalGain = computed(() => this.last()?.gain ?? 0);

  protected readonly investedShare = computed(() => {
    const total = this.maturity();
    return total > 0 ? Math.round((this.totalInvested() / total) * 100) : 0;
  });

  protected money(value: number): string {
    return formatNumber(Math.round(value), 0);
  }
}

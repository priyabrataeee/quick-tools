import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

const FREQUENCIES = [
  { label: 'Annually', value: 1 },
  { label: 'Half-yearly', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
  { label: 'Daily', value: 365 },
];

@Component({
  selector: 'app-compound-interest-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="compound-interest-calculator">
      <div class="flex flex-col gap-6">
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <label class="label" for="ci-principal">Initial amount</label>
            <input
              id="ci-principal"
              type="number"
              class="input"
              min="0"
              [value]="principal()"
              (input)="principal.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="ci-monthly">Monthly contribution</label>
            <input
              id="ci-monthly"
              type="number"
              class="input"
              min="0"
              [value]="monthly()"
              (input)="monthly.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="ci-rate">Annual interest rate (%)</label>
            <input
              id="ci-rate"
              type="number"
              class="input"
              min="0"
              step="0.1"
              [value]="rate()"
              (input)="rate.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="ci-years">Years: {{ years() }}</label>
            <input
              id="ci-years"
              type="range"
              class="w-full"
              min="1"
              max="50"
              [value]="years()"
              (input)="years.set(+$any($event.target).value)"
            />
          </div>
        </div>

        <div>
          <span class="label">Compounding frequency</span>
          <div class="flex flex-wrap gap-2">
            @for (option of frequencies; track option.value) {
              <button
                type="button"
                class="chip"
                [attr.aria-pressed]="frequency() === option.value"
                (click)="frequency.set(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold">{{ money(totalContributed()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Total contributed</p>
          </div>
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold text-success">{{ money(totalInterest()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Interest earned</p>
          </div>
          <div class="rounded-2xl border border-brand/30 bg-brand-soft p-5 text-center">
            <p class="text-2xl font-bold text-brand">{{ money(finalBalance()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Final balance</p>
          </div>
        </div>

        <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
          Simple interest on the same principal would earn
          <strong class="text-fg">{{ money(simpleInterest()) }}</strong> — compounding adds
          <strong class="text-fg">{{ money(totalInterest() - simpleInterest()) }}</strong> on top,
          before counting your monthly contributions.
        </p>

        <section class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Balance by year
          </h3>
          <div class="max-h-80 overflow-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-bg-subtle text-xs tracking-wide text-faint uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">Year</th>
                  <th class="px-3 py-2 text-right">Contributed</th>
                  <th class="px-3 py-2 text-right">Interest</th>
                  <th class="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (row of schedule(); track row.year) {
                  <tr>
                    <td class="px-3 py-2">{{ row.year }}</td>
                    <td class="px-3 py-2 text-right">{{ money(row.contributed) }}</td>
                    <td class="px-3 py-2 text-right text-success">{{ money(row.interest) }}</td>
                    <td class="px-3 py-2 text-right font-medium">{{ money(row.balance) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </app-tool-layout>
  `,
})
export class CompoundInterestCalculatorComponent {
  protected readonly frequencies = FREQUENCIES;

  protected readonly principal = signal(100000);
  protected readonly monthly = signal(5000);
  protected readonly rate = signal(8);
  protected readonly years = signal(10);
  protected readonly frequency = signal(12);

  protected readonly schedule = computed(() => {
    const n = this.frequency();
    const annualRate = this.rate() / 100;
    const periodsPerYear = n;
    const periodRate = annualRate / periodsPerYear;
    // Monthly contributions are spread evenly across the compounding periods.
    const contributionPerPeriod = (this.monthly() * 12) / periodsPerYear;

    let balance = Math.max(0, this.principal());
    let contributed = Math.max(0, this.principal());
    const rows: { year: number; contributed: number; interest: number; balance: number }[] = [];

    for (let year = 1; year <= this.years(); year++) {
      for (let period = 0; period < periodsPerYear; period++) {
        balance = balance * (1 + periodRate) + contributionPerPeriod;
        contributed += contributionPerPeriod;
      }
      rows.push({ year, contributed, interest: balance - contributed, balance });
    }

    return rows;
  });

  private readonly last = computed(() => this.schedule()[this.schedule().length - 1]);

  protected readonly finalBalance = computed(() => this.last()?.balance ?? this.principal());
  protected readonly totalContributed = computed(() => this.last()?.contributed ?? this.principal());
  protected readonly totalInterest = computed(() => this.finalBalance() - this.totalContributed());

  protected readonly simpleInterest = computed(
    () => (this.principal() * (this.rate() / 100) * this.years()),
  );

  protected money(value: number): string {
    return formatNumber(Math.round(value), 0);
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface YearRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

@Component({
  selector: 'app-emi-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="emi-calculator">
      <div class="flex flex-col gap-6">
        <div class="grid gap-5 md:grid-cols-3">
          <div>
            <label class="label" for="emi-principal">Loan amount</label>
            <input
              id="emi-principal"
              type="number"
              class="input"
              min="0"
              [value]="principal()"
              (input)="principal.set(+$any($event.target).value)"
            />
            <input
              type="range"
              class="mt-2 w-full"
              min="10000"
              max="20000000"
              step="10000"
              [value]="principal()"
              (input)="principal.set(+$any($event.target).value)"
              aria-label="Loan amount slider"
            />
          </div>

          <div>
            <label class="label" for="emi-rate">Annual interest rate (%)</label>
            <input
              id="emi-rate"
              type="number"
              class="input"
              min="0"
              step="0.05"
              [value]="rate()"
              (input)="rate.set(+$any($event.target).value)"
            />
            <input
              type="range"
              class="mt-2 w-full"
              min="1"
              max="30"
              step="0.05"
              [value]="rate()"
              (input)="rate.set(+$any($event.target).value)"
              aria-label="Interest rate slider"
            />
          </div>

          <div>
            <label class="label" for="emi-years">Tenure (years)</label>
            <input
              id="emi-years"
              type="number"
              class="input"
              min="1"
              max="40"
              [value]="years()"
              (input)="years.set(+$any($event.target).value)"
            />
            <input
              type="range"
              class="mt-2 w-full"
              min="1"
              max="40"
              [value]="years()"
              (input)="years.set(+$any($event.target).value)"
              aria-label="Tenure slider"
            />
          </div>
        </div>

        @if (valid()) {
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-brand/30 bg-brand-soft p-5 text-center">
              <p class="text-3xl font-bold text-brand">{{ money(emi()) }}</p>
              <p class="mt-1 text-xs tracking-wide text-faint uppercase">Monthly EMI</p>
            </div>
            <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
              <p class="text-3xl font-bold">{{ money(totalInterest()) }}</p>
              <p class="mt-1 text-xs tracking-wide text-faint uppercase">Total interest</p>
            </div>
            <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
              <p class="text-3xl font-bold">{{ money(totalPayment()) }}</p>
              <p class="mt-1 text-xs tracking-wide text-faint uppercase">Total payable</p>
            </div>
          </div>

          <div>
            <div class="mb-2 flex justify-between text-sm">
              <span class="text-muted">Principal {{ principalShare() }}%</span>
              <span class="text-muted">Interest {{ 100 - principalShare() }}%</span>
            </div>
            <div class="flex h-3 overflow-hidden rounded-full bg-bg-subtle">
              <div class="bg-brand" [style.width.%]="principalShare()"></div>
              <div class="bg-accent" [style.width.%]="100 - principalShare()"></div>
            </div>
          </div>

          <section class="overflow-hidden rounded-xl border border-line">
            <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
              Yearly amortisation
            </h3>
            <div class="max-h-80 overflow-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-bg-subtle text-xs tracking-wide text-faint uppercase">
                  <tr>
                    <th class="px-3 py-2 text-left">Year</th>
                    <th class="px-3 py-2 text-right">Principal</th>
                    <th class="px-3 py-2 text-right">Interest</th>
                    <th class="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (row of schedule(); track row.year) {
                    <tr>
                      <td class="px-3 py-2">{{ row.year }}</td>
                      <td class="px-3 py-2 text-right">{{ money(row.principal) }}</td>
                      <td class="px-3 py-2 text-right">{{ money(row.interest) }}</td>
                      <td class="px-3 py-2 text-right font-medium">{{ money(row.balance) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        } @else {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            Enter a positive loan amount, an interest rate above zero and a tenure of at least one
            year.
          </p>
        }
      </div>

      <div extraCopy>
        <h3>The EMI formula</h3>
        <p>
          <code>EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)</code> where <code>P</code> is the principal,
          <code>r</code> is the monthly interest rate (annual rate ÷ 12 ÷ 100) and <code>n</code> is
          the number of monthly instalments.
        </p>
      </div>
    </app-tool-layout>
  `,
})
export class EmiCalculatorComponent {
  protected readonly principal = signal(2500000);
  protected readonly rate = signal(8.5);
  protected readonly years = signal(20);

  protected readonly valid = computed(
    () => this.principal() > 0 && this.rate() > 0 && this.years() >= 1,
  );

  private readonly months = computed(() => Math.round(this.years() * 12));
  private readonly monthlyRate = computed(() => this.rate() / 12 / 100);

  protected readonly emi = computed(() => {
    if (!this.valid()) return 0;
    const r = this.monthlyRate();
    const n = this.months();
    const growth = Math.pow(1 + r, n);
    return (this.principal() * r * growth) / (growth - 1);
  });

  protected readonly totalPayment = computed(() => this.emi() * this.months());
  protected readonly totalInterest = computed(() => this.totalPayment() - this.principal());

  protected readonly principalShare = computed(() => {
    const total = this.totalPayment();
    return total > 0 ? Math.round((this.principal() / total) * 100) : 0;
  });

  protected readonly schedule = computed<YearRow[]>(() => {
    if (!this.valid()) return [];
    const r = this.monthlyRate();
    const emi = this.emi();
    let balance = this.principal();
    const rows: YearRow[] = [];

    for (let year = 1; year <= this.years(); year++) {
      let principalPaid = 0;
      let interestPaid = 0;

      for (let month = 0; month < 12 && balance > 0; month++) {
        const interest = balance * r;
        const principalPart = Math.min(emi - interest, balance);
        principalPaid += principalPart;
        interestPaid += interest;
        balance -= principalPart;
      }

      rows.push({
        year,
        principal: principalPaid,
        interest: interestPaid,
        balance: Math.max(0, balance),
      });
      if (balance <= 0) break;
    }

    return rows;
  });

  protected money(value: number): string {
    return formatNumber(Math.round(value), 0);
  }
}

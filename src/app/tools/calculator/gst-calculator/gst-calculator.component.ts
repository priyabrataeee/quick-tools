import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-gst-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="gst-calculator">
      <div class="flex flex-col gap-5">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'add'" (click)="mode.set('add')">
            Add GST (price excludes tax)
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'remove'" (click)="mode.set('remove')">
            Remove GST (price includes tax)
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="gst-amount">
              {{ mode() === 'add' ? 'Net amount' : 'Gross amount' }}
            </label>
            <input
              id="gst-amount"
              type="number"
              class="input"
              min="0"
              [value]="amount()"
              (input)="amount.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="gst-rate">GST rate (%)</label>
            <input
              id="gst-rate"
              type="number"
              class="input"
              min="0"
              step="0.5"
              [value]="rate()"
              (input)="rate.set(+$any($event.target).value)"
            />
            <div class="mt-2 flex flex-wrap gap-1.5">
              @for (slab of slabs; track slab) {
                <button
                  type="button"
                  class="chip !px-2.5 !py-1 !text-xs"
                  [attr.aria-pressed]="rate() === slab"
                  (click)="rate.set(slab)"
                >
                  {{ slab }}%
                </button>
              }
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold">{{ money(net()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Net (before tax)</p>
          </div>
          <div class="rounded-2xl border border-brand/30 bg-brand-soft p-5 text-center">
            <p class="text-2xl font-bold text-brand">{{ money(tax()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">GST amount</p>
          </div>
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold">{{ money(gross()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Gross (after tax)</p>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Tax breakdown
          </h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              <tr>
                <td class="px-3 py-2 text-muted">CGST ({{ rate() / 2 }}%) — intra-state</td>
                <td class="px-3 py-2 text-right font-medium">{{ money(tax() / 2) }}</td>
              </tr>
              <tr>
                <td class="px-3 py-2 text-muted">SGST ({{ rate() / 2 }}%) — intra-state</td>
                <td class="px-3 py-2 text-right font-medium">{{ money(tax() / 2) }}</td>
              </tr>
              <tr>
                <td class="px-3 py-2 text-muted">IGST ({{ rate() }}%) — inter-state</td>
                <td class="px-3 py-2 text-right font-medium">{{ money(tax()) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="rounded-xl border border-line bg-bg-subtle p-3 text-xs text-muted">
          <strong class="text-fg">Formula used:</strong>
          {{
            mode() === 'add'
              ? 'GST = net × rate ÷ 100; gross = net + GST'
              : 'net = gross ÷ (1 + rate ÷ 100); GST = gross − net'
          }}
        </p>
      </div>
    </app-tool-layout>
  `,
})
export class GstCalculatorComponent {
  protected readonly slabs = [0, 3, 5, 12, 18, 28];

  protected readonly mode = signal<'add' | 'remove'>('add');
  protected readonly amount = signal(1000);
  protected readonly rate = signal(18);

  protected readonly net = computed(() => {
    const amount = Math.max(0, this.amount());
    if (this.mode() === 'add') return amount;
    return amount / (1 + this.rate() / 100);
  });

  protected readonly tax = computed(() => {
    const amount = Math.max(0, this.amount());
    if (this.mode() === 'add') return (amount * this.rate()) / 100;
    return amount - this.net();
  });

  protected readonly gross = computed(() => this.net() + this.tax());

  protected money(value: number): string {
    return formatNumber(value, 2);
  }
}

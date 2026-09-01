import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-discount-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="discount-calculator">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap gap-2">
          @for (option of modes; track option.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="mode() === option.id"
              (click)="mode.set(option.id)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        @if (mode() === 'apply') {
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label" for="dc-price">Original price</label>
              <input
                id="dc-price"
                type="number"
                class="input"
                min="0"
                [value]="price()"
                (input)="price.set(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="dc-discount">Discount (%)</label>
              <input
                id="dc-discount"
                type="number"
                class="input"
                min="0"
                max="100"
                [value]="discount()"
                (input)="discount.set(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="dc-second">Extra discount (%)</label>
              <input
                id="dc-second"
                type="number"
                class="input"
                min="0"
                max="100"
                [value]="secondDiscount()"
                (input)="secondDiscount.set(+$any($event.target).value)"
              />
              <p class="mt-1 text-xs text-faint">Applied to the already-reduced price.</p>
            </div>
          </div>
        } @else {
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="dc-orig">Original price</label>
              <input
                id="dc-orig"
                type="number"
                class="input"
                min="0"
                [value]="price()"
                (input)="price.set(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="dc-final">Price you paid</label>
              <input
                id="dc-final"
                type="number"
                class="input"
                min="0"
                [value]="paidPrice()"
                (input)="paidPrice.set(+$any($event.target).value)"
              />
            </div>
          </div>
        }

        <div>
          <label class="label" for="dc-tax">Tax added at checkout (%)</label>
          <input
            id="dc-tax"
            type="number"
            class="input max-w-40"
            min="0"
            step="0.5"
            [value]="tax()"
            (input)="tax.set(+$any($event.target).value)"
          />
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-brand/30 bg-brand-soft p-5 text-center">
            <p class="text-2xl font-bold text-brand">{{ money(finalPrice()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">You pay</p>
          </div>
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold text-success">{{ money(saved()) }}</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">You save</p>
          </div>
          <div class="rounded-2xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-2xl font-bold">{{ effectiveDiscount() }}%</p>
            <p class="mt-1 text-xs tracking-wide text-faint uppercase">Effective discount</p>
          </div>
        </div>

        @if (mode() === 'apply' && secondDiscount() > 0) {
          <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
            Stacked discounts multiply rather than add: {{ discount() }}% then
            {{ secondDiscount() }}% is
            <strong class="text-fg">{{ effectiveDiscount() }}%</strong> off, not
            {{ discount() + secondDiscount() }}%.
          </p>
        }

        @if (tax() > 0) {
          <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
            Includes <strong class="text-fg">{{ money(taxAmount()) }}</strong> of tax charged on the
            discounted price of {{ money(discountedPrice()) }}.
          </p>
        }
      </div>
    </app-tool-layout>
  `,
})
export class DiscountCalculatorComponent {
  protected readonly modes = [
    { id: 'apply' as const, label: 'Apply a discount' },
    { id: 'derive' as const, label: 'Find the discount' },
  ];

  protected readonly mode = signal<'apply' | 'derive'>('apply');
  protected readonly price = signal(2499);
  protected readonly discount = signal(25);
  protected readonly secondDiscount = signal(0);
  protected readonly paidPrice = signal(1799);
  protected readonly tax = signal(0);

  protected readonly discountedPrice = computed(() => {
    const price = Math.max(0, this.price());
    if (this.mode() === 'derive') return Math.max(0, this.paidPrice());
    const first = price * (1 - Math.min(100, Math.max(0, this.discount())) / 100);
    return first * (1 - Math.min(100, Math.max(0, this.secondDiscount())) / 100);
  });

  protected readonly taxAmount = computed(() => (this.discountedPrice() * this.tax()) / 100);
  protected readonly finalPrice = computed(() => this.discountedPrice() + this.taxAmount());
  protected readonly saved = computed(() =>
    Math.max(0, Math.max(0, this.price()) - this.discountedPrice()),
  );

  protected readonly effectiveDiscount = computed(() => {
    const price = Math.max(0, this.price());
    if (price === 0) return '0';
    return formatNumber((this.saved() / price) * 100, 2);
  });

  protected money(value: number): string {
    return formatNumber(value, 2);
  }
}

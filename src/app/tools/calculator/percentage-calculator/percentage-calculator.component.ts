import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-percentage-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="percentage-calculator">
      <div class="grid gap-5 md:grid-cols-3">
        <!-- What is X% of Y -->
        <section class="rounded-2xl border border-line p-5">
          <h3 class="mb-4 font-semibold">What is X% of Y?</h3>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>What is</span>
            <input
              type="number"
              class="input w-24"
              aria-label="Percentage"
              [value]="a1()"
              (input)="a1.set(parse($any($event.target).value))"
            />
            <span>% of</span>
            <input
              type="number"
              class="input w-28"
              aria-label="Value"
              [value]="b1()"
              (input)="b1.set(parse($any($event.target).value))"
            />
          </div>
          <div class="mt-4 border-t border-line pt-4">
            <p class="text-xs tracking-wide text-faint uppercase">Result</p>
            <p class="text-2xl font-bold text-brand">{{ result1() }}</p>
            <p class="mt-1 text-xs text-faint">({{ a1() ?? 0 }} ÷ 100) × {{ b1() ?? 0 }}</p>
          </div>
        </section>

        <!-- X is what percent of Y -->
        <section class="rounded-2xl border border-line p-5">
          <h3 class="mb-4 font-semibold">X is what % of Y?</h3>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <input
              type="number"
              class="input w-28"
              aria-label="Part"
              [value]="a2()"
              (input)="a2.set(parse($any($event.target).value))"
            />
            <span>is what % of</span>
            <input
              type="number"
              class="input w-28"
              aria-label="Whole"
              [value]="b2()"
              (input)="b2.set(parse($any($event.target).value))"
            />
          </div>
          <div class="mt-4 border-t border-line pt-4">
            <p class="text-xs tracking-wide text-faint uppercase">Result</p>
            <p class="text-2xl font-bold text-brand">{{ result2() }}</p>
            <p class="mt-1 text-xs text-faint">({{ a2() ?? 0 }} ÷ {{ b2() ?? 0 }}) × 100</p>
          </div>
        </section>

        <!-- Percentage change -->
        <section class="rounded-2xl border border-line p-5">
          <h3 class="mb-4 font-semibold">Percentage change</h3>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>From</span>
            <input
              type="number"
              class="input w-24"
              aria-label="Starting value"
              [value]="a3()"
              (input)="a3.set(parse($any($event.target).value))"
            />
            <span>to</span>
            <input
              type="number"
              class="input w-24"
              aria-label="Ending value"
              [value]="b3()"
              (input)="b3.set(parse($any($event.target).value))"
            />
          </div>
          <div class="mt-4 border-t border-line pt-4">
            <p class="text-xs tracking-wide text-faint uppercase">Result</p>
            <p
              class="text-2xl font-bold"
              [class]="changeValue() > 0 ? 'text-success' : changeValue() < 0 ? 'text-danger' : 'text-fg'"
            >
              {{ result3() }}
            </p>
            <p class="mt-1 text-xs text-faint">
              @if (changeValue() > 0) {
                An increase of {{ formatDifference() }}
              } @else if (changeValue() < 0) {
                A decrease of {{ formatDifference() }}
              } @else {
                No change
              }
            </p>
          </div>
        </section>
      </div>

      <div extraCopy>
        <h3>The three formulas</h3>
        <ul>
          <li><code>P% of Y = (P ÷ 100) × Y</code></li>
          <li><code>X is what % of Y = (X ÷ Y) × 100</code></li>
          <li><code>Change = ((New − Old) ÷ |Old|) × 100</code></li>
        </ul>
      </div>
    </app-tool-layout>
  `,
})
export class PercentageCalculatorComponent {
  protected readonly a1 = signal<number | null>(15);
  protected readonly b1 = signal<number | null>(250);
  protected readonly a2 = signal<number | null>(45);
  protected readonly b2 = signal<number | null>(180);
  protected readonly a3 = signal<number | null>(120);
  protected readonly b3 = signal<number | null>(150);

  protected readonly result1 = computed(() => {
    const a = this.a1();
    const b = this.b1();
    if (a === null || b === null) return '—';
    return formatNumber((a / 100) * b, 4);
  });

  protected readonly result2 = computed(() => {
    const a = this.a2();
    const b = this.b2();
    if (a === null || b === null || b === 0) return '—';
    return `${formatNumber((a / b) * 100, 4)}%`;
  });

  protected readonly changeValue = computed(() => {
    const a = this.a3();
    const b = this.b3();
    if (a === null || b === null || a === 0) return 0;
    return ((b - a) / Math.abs(a)) * 100;
  });

  protected readonly result3 = computed(() => {
    const a = this.a3();
    const b = this.b3();
    if (a === null || b === null) return '—';
    if (a === 0) return 'undefined (start is zero)';
    const change = this.changeValue();
    return `${change > 0 ? '+' : ''}${formatNumber(change, 2)}%`;
  });

  protected formatDifference(): string {
    const a = this.a3() ?? 0;
    const b = this.b3() ?? 0;
    return formatNumber(Math.abs(b - a), 4);
  }

  protected parse(value: string): number | null {
    if (value.trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

import { ChangeDetectionStrategy, Component, afterNextRender, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import {
  WEEKDAY_NAMES,
  addDays,
  addMonths,
  calendarDiff,
  daysBetween,
  fromDateInput,
  toDateInput,
} from '../lib/date.util';

type Unit = 'days' | 'weeks' | 'months' | 'years';

@Component({
  selector: 'app-date-difference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="date-difference">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'between'" (click)="mode.set('between')">
            Difference between dates
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'add'" (click)="mode.set('add')">
            Add or subtract time
          </button>
        </div>

        @if (mode() === 'between') {
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="dd-start">Start date</label>
              <input
                id="dd-start"
                type="date"
                class="input"
                [value]="start()"
                (input)="start.set($any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="dd-end">End date</label>
              <input
                id="dd-end"
                type="date"
                class="input"
                [value]="end()"
                (input)="end.set($any($event.target).value)"
              />
            </div>
          </div>

          <label class="chip w-fit cursor-pointer" [class.is-active]="inclusive()">
            <input type="checkbox" class="sr-only" [checked]="inclusive()" (change)="inclusive.set(!inclusive())" />
            Count both the first and last day
          </label>

          @if (difference(); as diff) {
            <div class="rounded-2xl border border-brand/30 bg-brand-soft p-6 text-center">
              <p class="text-3xl font-bold text-brand">
                {{ diff.years }} years, {{ diff.months }} months, {{ diff.days }} days
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              @for (total of totals(); track total.label) {
                <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
                  <p class="text-xl font-bold">{{ total.value }}</p>
                  <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">{{ total.label }}</p>
                </div>
              }
            </div>

            <div class="overflow-hidden rounded-xl border border-line">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-line">
                  @for (row of dayFacts(); track row.label) {
                    <tr>
                      <td class="px-3 py-2 text-muted">{{ row.label }}</td>
                      <td class="px-3 py-2 text-right font-medium">{{ row.value }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
              Choose two valid dates to see the difference.
            </p>
          }
        } @else {
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label" for="dd-from">Starting date</label>
              <input
                id="dd-from"
                type="date"
                class="input"
                [value]="start()"
                (input)="start.set($any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="dd-amount">Amount</label>
              <input
                id="dd-amount"
                type="number"
                class="input"
                [value]="amount()"
                (input)="amount.set(+$any($event.target).value)"
              />
              <p class="mt-1 text-xs text-faint">Use a negative number to subtract.</p>
            </div>
            <div>
              <span class="label">Unit</span>
              <div class="flex flex-wrap gap-1.5">
                @for (option of units; track option) {
                  <button
                    type="button"
                    class="chip !px-2.5 !py-1 !text-xs"
                    [attr.aria-pressed]="unit() === option"
                    (click)="unit.set(option)"
                  >
                    {{ option }}
                  </button>
                }
              </div>
            </div>
          </div>

          @if (resultDate(); as result) {
            <div class="rounded-2xl border border-brand/30 bg-brand-soft p-6 text-center">
              <p class="text-3xl font-bold text-brand">{{ result.toLocaleDateString() }}</p>
              <p class="mt-2 text-muted">{{ weekdayNames[result.getDay()] }}</p>
            </div>
          }
        }
      </div>
    </app-tool-layout>
  `,
})
export class DateDifferenceComponent {
  protected readonly units: Unit[] = ['days', 'weeks', 'months', 'years'];
  protected readonly weekdayNames = WEEKDAY_NAMES;

  protected readonly mode = signal<'between' | 'add'>('between');
  protected readonly start = signal('');
  protected readonly end = signal('');
  protected readonly inclusive = signal(false);
  protected readonly amount = signal(30);
  protected readonly unit = signal<Unit>('days');

  constructor() {
    afterNextRender(() => {
      const today = new Date();
      this.start.set(toDateInput(today));
      this.end.set(toDateInput(addDays(today, 90)));
    });
  }

  private readonly startDate = computed(() => fromDateInput(this.start()));
  private readonly endDate = computed(() => fromDateInput(this.end()));

  protected readonly difference = computed(() => {
    const from = this.startDate();
    const to = this.endDate();
    if (!from || !to) return null;
    return calendarDiff(from, to);
  });

  private readonly totalDays = computed(() => {
    const from = this.startDate();
    const to = this.endDate();
    if (!from || !to) return 0;
    return Math.abs(daysBetween(from, to)) + (this.inclusive() ? 1 : 0);
  });

  protected readonly totals = computed(() => {
    const days = this.totalDays();
    return [
      { label: 'Total days', value: formatNumber(days, 0) },
      { label: 'Total weeks', value: formatNumber(days / 7, 1) },
      { label: 'Total hours', value: formatNumber(days * 24, 0) },
      { label: 'Total minutes', value: formatNumber(days * 24 * 60, 0) },
    ];
  });

  protected readonly dayFacts = computed(() => {
    const from = this.startDate();
    const to = this.endDate();
    if (!from || !to) return [];

    let weekendDays = 0;
    const cursor = new Date(Math.min(from.getTime(), to.getTime()));
    const last = new Date(Math.max(from.getTime(), to.getTime()));
    while (cursor <= last) {
      const day = cursor.getDay();
      if (day === 0 || day === 6) weekendDays++;
      cursor.setDate(cursor.getDate() + 1);
    }

    const days = this.totalDays();
    return [
      { label: 'Start day', value: WEEKDAY_NAMES[from.getDay()] },
      { label: 'End day', value: WEEKDAY_NAMES[to.getDay()] },
      { label: 'Weekend days in range', value: formatNumber(weekendDays, 0) },
      { label: 'Weekdays in range', value: formatNumber(Math.max(0, days - weekendDays), 0) },
    ];
  });

  protected readonly resultDate = computed(() => {
    const from = this.startDate();
    if (!from) return null;
    const amount = Math.round(this.amount());
    switch (this.unit()) {
      case 'weeks':
        return addDays(from, amount * 7);
      case 'months':
        return addMonths(from, amount);
      case 'years':
        return addMonths(from, amount * 12);
      default:
        return addDays(from, amount);
    }
  });
}

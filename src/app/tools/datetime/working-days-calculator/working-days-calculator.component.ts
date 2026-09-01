import { ChangeDetectionStrategy, Component, afterNextRender, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import {
  WEEKDAY_NAMES,
  addDays,
  addWorkingDays,
  countWorkingDays,
  fromDateInput,
  toDateInput,
} from '../lib/date.util';

@Component({
  selector: 'app-working-days-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="working-days-calculator">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'count'" (click)="mode.set('count')">
            Count working days
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'add'" (click)="mode.set('add')">
            Add working days
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="wd-start">Start date</label>
            <input
              id="wd-start"
              type="date"
              class="input"
              [value]="start()"
              (input)="start.set($any($event.target).value)"
            />
          </div>
          @if (mode() === 'count') {
            <div>
              <label class="label" for="wd-end">End date</label>
              <input
                id="wd-end"
                type="date"
                class="input"
                [value]="end()"
                (input)="end.set($any($event.target).value)"
              />
            </div>
          } @else {
            <div>
              <label class="label" for="wd-count">Working days to add</label>
              <input
                id="wd-count"
                type="number"
                class="input"
                [value]="daysToAdd()"
                (input)="daysToAdd.set(+$any($event.target).value)"
              />
            </div>
          }
        </div>

        <fieldset>
          <legend class="label">Non-working days of the week</legend>
          <div class="flex flex-wrap gap-2">
            @for (name of weekdayNames; track name; let i = $index) {
              <label class="chip cursor-pointer" [class.is-active]="weekend().includes(i)">
                <input
                  type="checkbox"
                  class="sr-only"
                  [checked]="weekend().includes(i)"
                  (change)="toggleWeekend(i)"
                />
                {{ name.slice(0, 3) }}
              </label>
            }
          </div>
        </fieldset>

        <div>
          <label class="label" for="wd-holidays">Public holidays (one date per line, YYYY-MM-DD)</label>
          <textarea
            id="wd-holidays"
            class="textarea h-28"
            placeholder="2026-12-25&#10;2026-12-26"
            [value]="holidayText()"
            (input)="holidayText.set($any($event.target).value)"
          ></textarea>
          <p class="mt-1 text-xs text-faint">
            {{ holidays().size }} valid {{ holidays().size === 1 ? 'holiday' : 'holidays' }} recognised.
          </p>
        </div>

        @if (mode() === 'count') {
          @if (counts(); as result) {
            <div class="rounded-2xl border border-brand/30 bg-brand-soft p-6 text-center">
              <p class="text-4xl font-bold text-brand">{{ formatNumber(result.working) }}</p>
              <p class="mt-1 text-muted">working days</p>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
                <p class="text-xl font-bold">{{ formatNumber(result.total) }}</p>
                <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Calendar days</p>
              </div>
              <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
                <p class="text-xl font-bold">{{ formatNumber(result.weekendDays) }}</p>
                <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Weekend days</p>
              </div>
              <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
                <p class="text-xl font-bold">{{ formatNumber(result.holidayDays) }}</p>
                <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Holidays</p>
              </div>
            </div>
          } @else {
            <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
              Choose two valid dates.
            </p>
          }
        } @else if (targetDate(); as target) {
          <div class="rounded-2xl border border-brand/30 bg-brand-soft p-6 text-center">
            <p class="text-3xl font-bold text-brand">{{ target.toLocaleDateString() }}</p>
            <p class="mt-2 text-muted">
              {{ weekdayNames[target.getDay()] }} — {{ daysToAdd() }} working days from the start
              date
            </p>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class WorkingDaysCalculatorComponent {
  protected readonly weekdayNames = WEEKDAY_NAMES;

  protected readonly mode = signal<'count' | 'add'>('count');
  protected readonly start = signal('');
  protected readonly end = signal('');
  protected readonly daysToAdd = signal(10);
  protected readonly weekend = signal<number[]>([0, 6]);
  protected readonly holidayText = signal('');

  constructor() {
    afterNextRender(() => {
      const today = new Date();
      this.start.set(toDateInput(today));
      this.end.set(toDateInput(addDays(today, 30)));
    });
  }

  protected readonly holidays = computed(() => {
    const set = new Set<string>();
    for (const line of this.holidayText().split('\n')) {
      const trimmed = line.trim();
      if (fromDateInput(trimmed)) set.add(trimmed);
    }
    return set;
  });

  protected readonly counts = computed(() => {
    const from = fromDateInput(this.start());
    const to = fromDateInput(this.end());
    if (!from || !to) return null;
    return countWorkingDays(from, to, this.weekend(), this.holidays());
  });

  protected readonly targetDate = computed(() => {
    const from = fromDateInput(this.start());
    if (!from) return null;
    if (this.weekend().length >= 7) return null;
    return addWorkingDays(from, Math.round(this.daysToAdd()), this.weekend(), this.holidays());
  });

  protected toggleWeekend(day: number): void {
    this.weekend.update((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  protected formatNumber(value: number): string {
    return formatNumber(value, 0);
  }
}

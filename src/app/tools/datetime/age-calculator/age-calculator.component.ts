import { ChangeDetectionStrategy, Component, afterNextRender, computed, signal } from '@angular/core';
import { formatNumber } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { WEEKDAY_NAMES, calendarDiff, daysBetween, fromDateInput, toDateInput } from '../lib/date.util';

@Component({
  selector: 'app-age-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="age-calculator">
      <div class="flex flex-col gap-6">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="age-dob">Date of birth</label>
            <input
              id="age-dob"
              type="date"
              class="input"
              [value]="birthDate()"
              (input)="birthDate.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="age-as-of">Age as of</label>
            <input
              id="age-as-of"
              type="date"
              class="input"
              [value]="asOf()"
              (input)="asOf.set($any($event.target).value)"
            />
          </div>
        </div>

        @if (error()) {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            {{ error() }}
          </p>
        } @else if (age(); as parts) {
          <div class="rounded-2xl border border-brand/30 bg-brand-soft p-6 text-center">
            <p class="text-4xl font-bold text-brand">
              {{ parts.years }} <span class="text-lg font-medium">years</span>
              {{ parts.months }} <span class="text-lg font-medium">months</span>
              {{ parts.days }} <span class="text-lg font-medium">days</span>
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
                @for (row of facts(); track row.label) {
                  <tr>
                    <td class="px-3 py-2 text-muted">{{ row.label }}</td>
                    <td class="px-3 py-2 text-right font-medium">{{ row.value }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class AgeCalculatorComponent {
  protected readonly birthDate = signal('1995-06-15');
  protected readonly asOf = signal('');

  constructor() {
    // "Today" is resolved on the client so the prerendered page never bakes in
    // the date it happened to be built on.
    afterNextRender(() => this.asOf.set(toDateInput(new Date())));
  }

  private readonly dates = computed(() => {
    const birth = fromDateInput(this.birthDate());
    const target = fromDateInput(this.asOf());
    return { birth, target };
  });

  protected readonly error = computed(() => {
    const { birth, target } = this.dates();
    if (!birth || !target) return '';
    if (birth > target) return 'The date of birth is after the reference date.';
    return '';
  });

  protected readonly age = computed(() => {
    const { birth, target } = this.dates();
    if (!birth || !target || birth > target) return null;
    return calendarDiff(birth, target);
  });

  protected readonly totals = computed(() => {
    const { birth, target } = this.dates();
    if (!birth || !target || birth > target) return [];
    const days = daysBetween(birth, target);
    const parts = calendarDiff(birth, target);
    return [
      { label: 'Total months', value: formatNumber(parts.years * 12 + parts.months, 0) },
      { label: 'Total weeks', value: formatNumber(Math.floor(days / 7), 0) },
      { label: 'Total days', value: formatNumber(days, 0) },
      { label: 'Total hours', value: formatNumber(days * 24, 0) },
    ];
  });

  protected readonly facts = computed(() => {
    const { birth, target } = this.dates();
    if (!birth || !target || birth > target) return [];

    // Next birthday relative to the reference date.
    let next = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
    if (next < target) next = new Date(target.getFullYear() + 1, birth.getMonth(), birth.getDate());
    const daysToBirthday = daysBetween(target, next);

    return [
      { label: 'Born on a', value: WEEKDAY_NAMES[birth.getDay()] },
      { label: 'Next birthday', value: next.toLocaleDateString() },
      {
        label: 'Days until next birthday',
        value: daysToBirthday === 0 ? 'Today' : formatNumber(daysToBirthday, 0),
      },
      { label: 'Next birthday falls on a', value: WEEKDAY_NAMES[next.getDay()] },
    ];
  });
}

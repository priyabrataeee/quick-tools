import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UnitGroup, formatUnitValue } from '../lib/units';

/**
 * Shared UI for every multiplicative unit family.
 *
 * Enter a value in any unit and every other unit updates at once, which is
 * faster in practice than picking a "from" and a "to" unit each time.
 */
@Component({
  selector: 'app-unit-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout [toolId]="toolId()">
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label class="label" for="uc-value">Value</label>
            <input
              id="uc-value"
              type="number"
              class="input text-lg"
              [value]="value()"
              (input)="value.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="uc-unit">Unit</label>
            <select
              id="uc-unit"
              class="select"
              [value]="selectedId()"
              (change)="unitId.set($any($event.target).value)"
            >
              @for (unit of group().units; track unit.id) {
                <option [value]="unit.id">{{ unit.name }} ({{ unit.symbol }})</option>
              }
            </select>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted">Decimals</span>
          @for (option of precisions; track option) {
            <button
              type="button"
              class="chip !px-2.5 !py-1 !text-xs"
              [attr.aria-pressed]="precision() === option"
              (click)="precision.set(option)"
            >
              {{ option }}
            </button>
          }
        </div>

        @if (invalid()) {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            Enter a number to convert.
          </p>
        } @else {
          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <tbody class="divide-y divide-line">
                @for (row of results(); track row.id) {
                  <tr [class.bg-brand-soft]="row.id === selectedId()">
                    <td class="px-3 py-2.5">
                      <span class="font-medium">{{ row.name }}</span>
                      <span class="ml-1 text-faint">{{ row.symbol }}</span>
                    </td>
                    <td class="px-3 py-2.5 text-right font-mono break-all">{{ row.display }}</td>
                    <td class="w-12 px-2 py-1.5 text-right">
                      <app-copy-button
                        [value]="row.raw"
                        label=""
                        variant="ghost"
                        [toastMessage]="row.name + ' value copied'"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <p class="text-xs text-faint">
            All conversions go through the {{ group().base }} using exact internationally agreed
            factors; only the display is rounded.
          </p>
        }

        <ng-content />
      </div>
    </app-tool-layout>
  `,
})
export class UnitConverterComponent {
  readonly toolId = input.required<string>();
  readonly group = input.required<UnitGroup>();
  readonly defaultUnit = input<string>('');

  protected readonly precisions = [2, 4, 6, 10];

  protected readonly value = signal('1');
  protected readonly precision = signal(4);
  protected readonly unitId = signal('');

  protected readonly invalid = computed(() => {
    const raw = this.value().trim();
    return raw === '' || !Number.isFinite(Number(raw));
  });

  /** Falls back to the wrapper's default until the user picks a unit. */
  protected readonly selectedId = computed(
    () => this.unitId() || this.defaultUnit() || this.group().units[0].id,
  );

  private readonly activeUnit = computed(() => {
    const units = this.group().units;
    return units.find((u) => u.id === this.selectedId()) ?? units[0];
  });

  protected readonly results = computed(() => {
    if (this.invalid()) return [];
    const source = this.activeUnit();
    const baseValue = Number(this.value()) * source.factor;

    return this.group().units.map((unit) => {
      const converted = baseValue / unit.factor;
      return {
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        display: formatUnitValue(converted, this.precision()),
        raw: String(converted),
      };
    });
  });

}

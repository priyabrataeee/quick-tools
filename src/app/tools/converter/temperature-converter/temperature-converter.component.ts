import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { TEMPERATURE_UNITS, TemperatureUnit, formatUnitValue, fromKelvin, toKelvin } from '../lib/units';

const FORMULAS: Record<string, string> = {
  'c-f': '°F = °C × 9/5 + 32',
  'c-k': 'K = °C + 273.15',
  'c-r': '°R = (°C + 273.15) × 9/5',
  'f-c': '°C = (°F − 32) × 5/9',
  'f-k': 'K = (°F − 32) × 5/9 + 273.15',
  'f-r': '°R = °F + 459.67',
  'k-c': '°C = K − 273.15',
  'k-f': '°F = (K − 273.15) × 9/5 + 32',
  'k-r': '°R = K × 9/5',
  'r-c': '°C = (°R − 491.67) × 5/9',
  'r-f': '°F = °R − 459.67',
  'r-k': 'K = °R × 5/9',
};

const REFERENCES = [
  { label: 'Absolute zero', celsius: -273.15 },
  { label: 'Water freezes', celsius: 0 },
  { label: 'Room temperature', celsius: 21 },
  { label: 'Body temperature', celsius: 37 },
  { label: 'Water boils', celsius: 100 },
];

@Component({
  selector: 'app-temperature-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="temperature-converter">
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label class="label" for="temp-value">Temperature</label>
            <input
              id="temp-value"
              type="number"
              class="input text-lg"
              step="any"
              [value]="value()"
              (input)="value.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="temp-unit">Scale</label>
            <select
              id="temp-unit"
              class="select"
              [value]="unit()"
              (change)="unit.set($any($event.target).value)"
            >
              @for (option of units; track option.id) {
                <option [value]="option.id">{{ option.name }} ({{ option.symbol }})</option>
              }
            </select>
          </div>
        </div>

        @if (invalid()) {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            Enter a number to convert.
          </p>
        } @else {
          @if (belowAbsoluteZero()) {
            <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
              That is below absolute zero (−273.15 °C), which is physically impossible. The
              conversion is still shown for reference.
            </p>
          }

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            @for (row of results(); track row.id) {
              <div
                class="rounded-2xl border p-4 text-center"
                [class]="row.id === unit() ? 'border-brand/40 bg-brand-soft' : 'border-line bg-bg-subtle'"
              >
                <p class="text-2xl font-bold" [class.text-brand]="row.id === unit()">
                  {{ row.display }}
                </p>
                <p class="mt-1 text-xs tracking-wide text-faint uppercase">{{ row.name }}</p>
                <app-copy-button [value]="row.raw" label="" variant="ghost" [toastMessage]="row.name + ' copied'" />
              </div>
            }
          </div>

          <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
            <strong class="text-fg">Formulas from {{ activeName() }}:</strong>
            {{ formulas().join(' · ') }}
          </p>
        }

        <section class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Reference points
          </h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of references(); track row.label) {
                <tr>
                  <td class="px-3 py-2 text-muted">{{ row.label }}</td>
                  <td class="px-3 py-2 text-right">{{ row.c }} °C</td>
                  <td class="px-3 py-2 text-right">{{ row.f }} °F</td>
                  <td class="px-3 py-2 text-right">{{ row.k }} K</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    </app-tool-layout>
  `,
})
export class TemperatureConverterComponent {
  protected readonly units = TEMPERATURE_UNITS;

  protected readonly value = signal('25');
  protected readonly unit = signal<TemperatureUnit>('c');

  protected readonly invalid = computed(() => {
    const raw = this.value().trim();
    return raw === '' || !Number.isFinite(Number(raw));
  });

  private readonly kelvin = computed(() => toKelvin(Number(this.value()), this.unit()));

  protected readonly belowAbsoluteZero = computed(() => !this.invalid() && this.kelvin() < 0);

  protected readonly results = computed(() => {
    if (this.invalid()) return [];
    return TEMPERATURE_UNITS.map((option) => {
      const converted = fromKelvin(this.kelvin(), option.id);
      return {
        id: option.id,
        name: option.name,
        display: `${formatUnitValue(converted, 2)} ${option.symbol}`,
        raw: String(converted),
      };
    });
  });

  protected readonly activeName = computed(
    () => TEMPERATURE_UNITS.find((u) => u.id === this.unit())?.name ?? '',
  );

  protected readonly formulas = computed(() =>
    TEMPERATURE_UNITS.filter((u) => u.id !== this.unit()).map(
      (u) => FORMULAS[`${this.unit()}-${u.id}`] ?? '',
    ),
  );

  protected readonly references = computed(() =>
    REFERENCES.map((point) => {
      const k = toKelvin(point.celsius, 'c');
      return {
        label: point.label,
        c: formatUnitValue(point.celsius, 2),
        f: formatUnitValue(fromKelvin(k, 'f'), 2),
        k: formatUnitValue(k, 2),
      };
    }),
  );
}

import { ChangeDetectionStrategy, Component, OnDestroy, afterNextRender, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface Row {
  label: string;
  value: string;
}

@Component({
  selector: 'app-timestamp-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="timestamp-converter">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg-subtle p-4">
          <div>
            <p class="text-xs tracking-wide text-faint uppercase">Current Unix time</p>
            <p class="font-mono text-2xl font-bold text-brand">{{ now() || '—' }}</p>
          </div>
          <div class="flex gap-2">
            <app-copy-button [value]="now()" label="Copy" variant="secondary" />
            <button type="button" class="btn btn-primary" (click)="useNow()">
              <app-icon name="clock" class="h-4 w-4" />
              Use now
            </button>
          </div>
        </div>

        <!-- Timestamp to date -->
        <section>
          <h3 class="mb-3 text-base font-semibold">Timestamp → date</h3>
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-[220px] flex-1">
              <label class="label" for="ts-input">Unix timestamp</label>
              <input
                id="ts-input"
                type="text"
                inputmode="numeric"
                class="input font-mono"
                placeholder="1767225600"
                [value]="timestamp()"
                (input)="timestamp.set($any($event.target).value)"
              />
            </div>
            <div class="flex gap-2">
              @for (option of unitOptions; track option.id) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="unit() === option.id"
                  (click)="unit.set(option.id)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          @if (timestamp().trim()) {
            @if (fromTimestamp().length) {
              <div class="mt-4 overflow-hidden rounded-xl border border-line">
                <table class="w-full text-sm">
                  <tbody class="divide-y divide-line">
                    @for (row of fromTimestamp(); track row.label) {
                      <tr>
                        <td class="w-40 px-3 py-2 text-faint">{{ row.label }}</td>
                        <td class="px-3 py-2 font-mono break-all text-fg">{{ row.value }}</td>
                        <td class="w-12 px-2 py-1 text-right">
                          <app-copy-button [value]="row.value" label="" variant="ghost" />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="mt-2 text-xs text-faint">
                Interpreted as {{ resolvedUnit() }}.
              </p>
            } @else {
              <p class="mt-3 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
                That is not a timestamp this converter can read. Enter a whole number of seconds or
                milliseconds.
              </p>
            }
          }
        </section>

        <!-- Date to timestamp -->
        <section>
          <h3 class="mb-3 text-base font-semibold">Date → timestamp</h3>
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-[240px] flex-1">
              <label class="label" for="date-input">Date and time (your local zone)</label>
              <input
                id="date-input"
                type="datetime-local"
                step="1"
                class="input"
                [value]="dateInput()"
                (input)="dateInput.set($any($event.target).value)"
              />
            </div>
          </div>

          @if (fromDate().length) {
            <div class="mt-4 overflow-hidden rounded-xl border border-line">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-line">
                  @for (row of fromDate(); track row.label) {
                    <tr>
                      <td class="w-40 px-3 py-2 text-faint">{{ row.label }}</td>
                      <td class="px-3 py-2 font-mono break-all text-fg">{{ row.value }}</td>
                      <td class="w-12 px-2 py-1 text-right">
                        <app-copy-button [value]="row.value" label="" variant="ghost" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </div>
    </app-tool-layout>
  `,
})
export class TimestampConverterComponent implements OnDestroy {
  protected readonly unitOptions = [
    { id: 'auto' as const, label: 'Auto' },
    { id: 's' as const, label: 'Seconds' },
    { id: 'ms' as const, label: 'Milliseconds' },
  ];

  protected readonly now = signal('');
  protected readonly timestamp = signal('');
  protected readonly unit = signal<'auto' | 's' | 'ms'>('auto');
  protected readonly dateInput = signal('');

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // The live clock and the "now" default are client-only so that prerendered
    // HTML does not ship a stale timestamp.
    afterNextRender(() => {
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
      this.dateInput.set(this.toLocalInput(new Date()));
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  protected readonly resolvedUnit = computed(() => {
    const raw = this.timestamp().trim();
    if (this.unit() !== 'auto') return this.unit() === 's' ? 'seconds' : 'milliseconds';
    // Anything with more than 11 digits is far beyond a plausible second-based
    // date, so it is almost certainly milliseconds.
    return raw.replace(/\D/g, '').length > 11 ? 'milliseconds' : 'seconds';
  });

  protected readonly fromTimestamp = computed<Row[]>(() => {
    const raw = this.timestamp().trim();
    if (!raw) return [];
    if (!/^-?\d+$/.test(raw)) return [];

    const value = Number(raw);
    if (!Number.isFinite(value)) return [];

    const ms = this.resolvedUnit() === 'seconds' ? value * 1000 : value;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return [];

    return [
      { label: 'ISO 8601 (UTC)', value: date.toISOString() },
      { label: 'UTC', value: date.toUTCString() },
      { label: 'Local time', value: date.toLocaleString() },
      { label: 'Relative', value: this.relative(ms) },
      { label: 'Seconds', value: String(Math.floor(ms / 1000)) },
      { label: 'Milliseconds', value: String(ms) },
    ];
  });

  protected readonly fromDate = computed<Row[]>(() => {
    const raw = this.dateInput();
    if (!raw) return [];
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return [];
    const ms = date.getTime();
    return [
      { label: 'Unix (seconds)', value: String(Math.floor(ms / 1000)) },
      { label: 'Unix (milliseconds)', value: String(ms) },
      { label: 'ISO 8601 (UTC)', value: date.toISOString() },
      { label: 'UTC', value: date.toUTCString() },
    ];
  });

  protected useNow(): void {
    this.timestamp.set(String(Math.floor(Date.now() / 1000)));
    this.unit.set('s');
  }

  private tick(): void {
    this.now.set(String(Math.floor(Date.now() / 1000)));
  }

  private relative(ms: number): string {
    const diff = ms - Date.now();
    const abs = Math.abs(diff);
    const units: [number, Intl.RelativeTimeFormatUnit][] = [
      [1000 * 60 * 60 * 24 * 365, 'year'],
      [1000 * 60 * 60 * 24 * 30, 'month'],
      [1000 * 60 * 60 * 24, 'day'],
      [1000 * 60 * 60, 'hour'],
      [1000 * 60, 'minute'],
      [1000, 'second'],
    ];
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    for (const [size, unit] of units) {
      if (abs >= size || unit === 'second') {
        return formatter.format(Math.round(diff / size), unit);
      }
    }
    return 'now';
  }

  /** `datetime-local` needs a local-time string, not an ISO UTC string. */
  private toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

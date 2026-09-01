import { ChangeDetectionStrategy, Component, afterNextRender, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

const COMMON_ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

interface ZoneRow {
  zone: string;
  time: string;
  date: string;
  offset: string;
}

/** All IANA zones the browser knows, falling back to a curated list. */
function availableZones(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  if (typeof supported === 'function') {
    try {
      return supported('timeZone');
    } catch {
      // Fall through to the static list.
    }
  }
  return COMMON_ZONES;
}

@Component({
  selector: 'app-timezone-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent],
  template: `
    <app-tool-layout toolId="timezone-converter">
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="tz-datetime">Date and time</label>
            <input
              id="tz-datetime"
              type="datetime-local"
              class="input"
              [value]="dateTime()"
              (input)="dateTime.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="tz-source">In this time zone</label>
            <select
              id="tz-source"
              class="select"
              [value]="sourceZone()"
              (change)="sourceZone.set($any($event.target).value)"
            >
              @for (zone of allZones; track zone) {
                <option [value]="zone">{{ zone }}</option>
              }
            </select>
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[240px] flex-1">
            <label class="label" for="tz-add">Add a time zone</label>
            <select
              id="tz-add"
              class="select"
              [value]="''"
              (change)="addZone($any($event.target).value)"
            >
              <option value="">Choose a zone…</option>
              @for (zone of allZones; track zone) {
                <option [value]="zone">{{ zone }}</option>
              }
            </select>
          </div>
          <button type="button" class="btn btn-secondary" (click)="useNow()">
            <app-icon name="clock" class="h-4 w-4" />
            Use current time
          </button>
        </div>

        @if (invalid()) {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            Enter a valid date and time.
          </p>
        } @else {
          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <thead class="bg-bg-subtle text-xs tracking-wide text-faint uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">Zone</th>
                  <th class="px-3 py-2 text-left">Time</th>
                  <th class="px-3 py-2 text-left">Date</th>
                  <th class="px-3 py-2 text-left">Offset</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (row of rows(); track row.zone) {
                  <tr>
                    <td class="px-3 py-2.5 font-medium">{{ row.zone }}</td>
                    <td class="px-3 py-2.5 font-mono text-brand">{{ row.time }}</td>
                    <td class="px-3 py-2.5 text-muted">{{ row.date }}</td>
                    <td class="px-3 py-2.5 text-faint">{{ row.offset }}</td>
                    <td class="px-1 py-1.5 text-right">
                      @if (selectedZones().length > 1) {
                        <button
                          type="button"
                          class="btn btn-ghost h-7 w-7 !p-0"
                          (click)="removeZone(row.zone)"
                          [attr.aria-label]="'Remove ' + row.zone"
                        >
                          <app-icon name="x" class="h-3.5 w-3.5" />
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <p class="rounded-xl border border-line bg-bg-subtle p-3 text-xs text-muted">
          Conversions use the IANA time zone database built into your browser, so the offset shown
          is the one actually in force on that date — daylight saving included.
        </p>
      </div>
    </app-tool-layout>
  `,
})
export class TimezoneConverterComponent {
  protected readonly allZones = availableZones();

  protected readonly dateTime = signal('');
  protected readonly sourceZone = signal('UTC');
  protected readonly selectedZones = signal<string[]>([
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Kolkata',
    'Asia/Tokyo',
  ]);

  constructor() {
    afterNextRender(() => {
      this.useNow();
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (local && this.allZones.includes(local)) {
        this.sourceZone.set(local);
        this.selectedZones.update((zones) => (zones.includes(local) ? zones : [local, ...zones]));
      }
    });
  }

  /** The wall-clock input interpreted in the chosen source zone. */
  private readonly instant = computed<Date | null>(() => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(this.dateTime());
    if (!match) return null;

    const [, y, mo, d, h, mi] = match.map(Number);
    // Treat the entered wall clock as if it were UTC, then subtract the source
    // zone's offset at that moment to get the real instant. A second pass
    // corrects the rare case where the first guess lands on the other side of
    // a daylight-saving transition.
    const asIfUtc = Date.UTC(y, mo - 1, d, h, mi);
    if (Number.isNaN(asIfUtc)) return null;

    let instant = new Date(asIfUtc - zoneOffsetMinutes(new Date(asIfUtc), this.sourceZone()) * 60_000);
    instant = new Date(asIfUtc - zoneOffsetMinutes(instant, this.sourceZone()) * 60_000);
    return instant;
  });

  protected readonly invalid = computed(() => this.dateTime() !== '' && this.instant() === null);

  protected readonly rows = computed<ZoneRow[]>(() => {
    const instant = this.instant();
    if (!instant) return [];

    return this.selectedZones().map((zone) => ({
      zone,
      time: new Intl.DateTimeFormat(undefined, {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(instant),
      date: new Intl.DateTimeFormat(undefined, {
        timeZone: zone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(instant),
      offset: formatOffset(zoneOffsetMinutes(instant, zone)),
    }));
  });

  protected useNow(): void {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.sourceZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    this.dateTime.set(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`,
    );
  }

  protected addZone(zone: string): void {
    if (!zone) return;
    this.selectedZones.update((zones) => (zones.includes(zone) ? zones : [...zones, zone]));
  }

  protected removeZone(zone: string): void {
    this.selectedZones.update((zones) => (zones.length > 1 ? zones.filter((z) => z !== zone) : zones));
  }
}

/** Minutes that `zone` is ahead of UTC at the given instant. */
function zoneOffsetMinutes(instant: Date, zone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(instant);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    );
    return Math.round((asUtc - instant.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
}

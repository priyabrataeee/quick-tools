import { ChangeDetectionStrategy, Component, afterNextRender, computed, signal } from '@angular/core';
import { clamp } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

type UuidFormat = 'lower' | 'upper' | 'braced' | 'compact';

/**
 * RFC 4122 v4 UUID using the Web Crypto API.
 * `crypto.randomUUID` is used where available; the manual path exists because
 * it is unavailable on insecure origins.
 */
function generateUuid(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  webCrypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

@Component({
  selector: 'app-uuid-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="uuid-generator">
      <div class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div>
            <label class="label" for="uuid-count">How many</label>
            <input
              id="uuid-count"
              type="number"
              class="input"
              min="1"
              max="500"
              [value]="count()"
              (input)="onCount($event)"
            />
          </div>
          <div>
            <span class="label">Format</span>
            <div class="flex flex-wrap gap-2">
              @for (option of formats; track option.id) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="format() === option.id"
                  (click)="format.set(option.id)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-primary" (click)="generate()">
            <app-icon name="refresh" class="h-4 w-4" />
            Generate {{ count() }} {{ count() === 1 ? 'UUID' : 'UUIDs' }}
          </button>
        </div>

        <app-result-panel
          label="Generated UUIDs"
          [value]="output()"
          [meta]="uuids().length ? uuids().length + ' generated' : ''"
          downloadName="uuids.txt"
          placeholder="Press Generate to create v4 UUIDs."
        />

        <p class="rounded-xl border border-line bg-bg-subtle p-3 text-xs text-muted">
          <strong class="text-fg">Example:</strong>
          <span class="font-mono">{{ sample() }}</span>
          — 122 random bits from your browser's cryptographic random number generator.
        </p>
      </div>
    </app-tool-layout>
  `,
})
export class UuidGeneratorComponent {
  protected readonly formats: { id: UuidFormat; label: string }[] = [
    { id: 'lower', label: 'Lowercase' },
    { id: 'upper', label: 'Uppercase' },
    { id: 'braced', label: 'Braced GUID' },
    { id: 'compact', label: 'No hyphens' },
  ];

  protected readonly count = signal(5);
  protected readonly format = signal<UuidFormat>('lower');
  protected readonly uuids = signal<string[]>([]);

  protected readonly output = computed(() =>
    this.uuids()
      .map((id) => this.applyFormat(id))
      .join('\n'),
  );

  protected readonly sample = computed(() => this.applyFormat('3f2504e0-4f89-41d3-9a0c-0305e82c3301'));

  constructor() {
    // Generate on the client only: prerendered random values would differ from
    // the hydrated ones and there is no value in shipping them in the HTML.
    afterNextRender(() => this.generate());
  }

  protected generate(): void {
    const total = this.count();
    this.uuids.set(Array.from({ length: total }, () => generateUuid()));
  }

  protected onCount(event: Event): void {
    const value = clamp(Number((event.target as HTMLInputElement).value), 1, 500);
    this.count.set(Math.round(value));
  }

  private applyFormat(uuid: string): string {
    switch (this.format()) {
      case 'upper':
        return uuid.toUpperCase();
      case 'braced':
        return `{${uuid.toUpperCase()}}`;
      case 'compact':
        return uuid.replace(/-/g, '');
      default:
        return uuid;
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-clamp-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="clamp-generator">
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="clamp-min-size">Minimum size (px)</label>
            <input
              id="clamp-min-size"
              type="number"
              class="input"
              [value]="minSize()"
              (input)="minSize.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="clamp-max-size">Maximum size (px)</label>
            <input
              id="clamp-max-size"
              type="number"
              class="input"
              [value]="maxSize()"
              (input)="maxSize.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="clamp-min-vw">At viewport width (px)</label>
            <input
              id="clamp-min-vw"
              type="number"
              class="input"
              [value]="minViewport()"
              (input)="minViewport.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="clamp-max-vw">Up to viewport width (px)</label>
            <input
              id="clamp-max-vw"
              type="number"
              class="input"
              [value]="maxViewport()"
              (input)="maxViewport.set(+$any($event.target).value)"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          @for (preset of presets; track preset.label) {
            <button type="button" class="chip" (click)="apply(preset)">{{ preset.label }}</button>
          }
        </div>

        @if (invalid()) {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            The maximum size must be larger than the minimum, and the two viewport widths must
            differ.
          </p>
        } @else {
          <div class="overflow-hidden rounded-xl border border-line">
            <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
              <span class="text-xs font-semibold tracking-wide text-faint uppercase">CSS</span>
              <app-copy-button [value]="declaration()" label="Copy" variant="ghost" toastMessage="CSS copied" />
            </div>
            <pre class="overflow-x-auto p-4 font-mono text-xs break-words whitespace-pre-wrap text-fg">{{ declaration() }}</pre>
          </div>

          <div class="rounded-2xl border border-line bg-bg-subtle p-6">
            <p class="mb-2 text-xs tracking-wide text-faint uppercase">Live preview</p>
            <p class="leading-tight font-semibold" [style.font-size]="clampValue()">
              The quick brown fox jumps over the lazy dog
            </p>
            <p class="mt-2 text-xs text-faint">
              Resize this window to watch the size scale between {{ minSize() }}px and
              {{ maxSize() }}px.
            </p>
          </div>

          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <thead class="bg-bg-subtle text-xs tracking-wide text-faint uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">Viewport width</th>
                  <th class="px-3 py-2 text-right">Computed size</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (row of table(); track row.width) {
                  <tr>
                    <td class="px-3 py-2 text-muted">{{ row.width }}px</td>
                    <td class="px-3 py-2 text-right font-medium">{{ row.size }}px</td>
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
export class ClampGeneratorComponent {
  protected readonly presets = [
    { label: 'Body text', minSize: 16, maxSize: 18, minViewport: 320, maxViewport: 1280 },
    { label: 'Heading', minSize: 28, maxSize: 56, minViewport: 320, maxViewport: 1440 },
    { label: 'Hero', minSize: 36, maxSize: 84, minViewport: 375, maxViewport: 1600 },
    { label: 'Section spacing', minSize: 32, maxSize: 96, minViewport: 320, maxViewport: 1440 },
  ];

  protected readonly minSize = signal(16);
  protected readonly maxSize = signal(24);
  protected readonly minViewport = signal(320);
  protected readonly maxViewport = signal(1280);
  /** The root font size the rem conversion assumes. */
  private readonly rootFontSize = 16;

  protected readonly invalid = computed(
    () =>
      this.maxSize() <= this.minSize() ||
      this.maxViewport() === this.minViewport() ||
      !Number.isFinite(this.slope()),
  );

  private readonly slope = computed(
    () => (this.maxSize() - this.minSize()) / (this.maxViewport() - this.minViewport()),
  );

  protected readonly clampValue = computed(() => {
    const slope = this.slope();
    const intercept = this.minSize() - slope * this.minViewport();
    const vw = (slope * 100).toFixed(4).replace(/\.?0+$/, '');
    const rem = (intercept / this.rootFontSize).toFixed(4).replace(/\.?0+$/, '');
    const minRem = (this.minSize() / this.rootFontSize).toFixed(4).replace(/\.?0+$/, '');
    const maxRem = (this.maxSize() / this.rootFontSize).toFixed(4).replace(/\.?0+$/, '');
    return `clamp(${minRem}rem, ${rem}rem + ${vw}vw, ${maxRem}rem)`;
  });

  protected readonly declaration = computed(() => `font-size: ${this.clampValue()};`);

  protected readonly table = computed(() => {
    const widths = [320, 480, 768, 1024, 1280, 1536, 1920];
    const slope = this.slope();
    const intercept = this.minSize() - slope * this.minViewport();
    return widths.map((width) => {
      const raw = slope * width + intercept;
      const size = Math.min(this.maxSize(), Math.max(this.minSize(), raw));
      return { width, size: size.toFixed(1) };
    });
  });

  protected apply(preset: (typeof this.presets)[number]): void {
    this.minSize.set(preset.minSize);
    this.maxSize.set(preset.maxSize);
    this.minViewport.set(preset.minViewport);
    this.maxViewport.set(preset.maxViewport);
  }
}

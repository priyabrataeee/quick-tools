import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface ShadowLayer {
  id: number;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const PRESETS: { label: string; layers: Omit<ShadowLayer, 'id'>[] }[] = [
  {
    label: 'Subtle',
    layers: [{ x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.08, inset: false }],
  },
  {
    label: 'Card',
    layers: [
      { x: 0, y: 1, blur: 3, spread: 0, color: '#000000', opacity: 0.1, inset: false },
      { x: 0, y: 8, blur: 24, spread: -6, color: '#000000', opacity: 0.14, inset: false },
    ],
  },
  {
    label: 'Floating',
    layers: [
      { x: 0, y: 4, blur: 6, spread: -2, color: '#000000', opacity: 0.1, inset: false },
      { x: 0, y: 20, blur: 40, spread: -8, color: '#000000', opacity: 0.22, inset: false },
    ],
  },
  {
    label: 'Inner',
    layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000', opacity: 0.2, inset: true }],
  },
  {
    label: 'Glow',
    layers: [{ x: 0, y: 0, blur: 28, spread: 2, color: '#6366f1', opacity: 0.55, inset: false }],
  },
];

@Component({
  selector: 'app-box-shadow-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent, IconComponent],
  template: `
    <app-tool-layout toolId="box-shadow-generator">
      <div class="flex flex-col gap-5">
        <div class="flex flex-wrap gap-2">
          @for (preset of presets; track preset.label) {
            <button type="button" class="chip" (click)="applyPreset(preset.label)">
              {{ preset.label }}
            </button>
          }
        </div>

        <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <!-- Controls -->
          <!-- min-w-0 keeps the wide CSS output from stretching the grid track. -->
          <div class="flex min-w-0 flex-col gap-4">
            @for (layer of layers(); track layer.id; let i = $index) {
              <fieldset class="rounded-xl border border-line p-4">
                <legend class="flex items-center gap-2 px-2 text-sm font-semibold">
                  Layer {{ i + 1 }}
                  @if (layers().length > 1) {
                    <button
                      type="button"
                      class="btn btn-ghost h-6 w-6 !p-0"
                      (click)="removeLayer(layer.id)"
                      [attr.aria-label]="'Remove layer ' + (i + 1)"
                    >
                      <app-icon name="x" class="h-3.5 w-3.5" />
                    </button>
                  }
                </legend>

                <div class="grid gap-3">
                  @for (control of sliders; track control.key) {
                    <div>
                      <div class="mb-1 flex justify-between text-xs">
                        <label [attr.for]="'shadow-' + layer.id + '-' + control.key" class="text-muted">
                          {{ control.label }}
                        </label>
                        <span class="text-faint">{{ valueOf(layer, control.key) }}px</span>
                      </div>
                      <input
                        [id]="'shadow-' + layer.id + '-' + control.key"
                        type="range"
                        class="w-full"
                        [min]="control.min"
                        [max]="control.max"
                        [value]="valueOf(layer, control.key)"
                        (input)="update(layer.id, control.key, +$any($event.target).value)"
                      />
                    </div>
                  }

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="label" [attr.for]="'shadow-color-' + layer.id">Colour</label>
                      <input
                        [id]="'shadow-color-' + layer.id"
                        type="color"
                        class="h-10 w-full cursor-pointer rounded-lg border border-line bg-transparent"
                        [value]="layer.color"
                        (input)="updateColor(layer.id, $any($event.target).value)"
                      />
                    </div>
                    <div>
                      <div class="mb-1 flex justify-between text-xs">
                        <label [attr.for]="'shadow-opacity-' + layer.id" class="text-muted">Opacity</label>
                        <span class="text-faint">{{ layer.opacity.toFixed(2) }}</span>
                      </div>
                      <input
                        [id]="'shadow-opacity-' + layer.id"
                        type="range"
                        class="mt-2 w-full"
                        min="0"
                        max="1"
                        step="0.01"
                        [value]="layer.opacity"
                        (input)="update(layer.id, 'opacity', +$any($event.target).value)"
                      />
                    </div>
                  </div>

                  <label class="chip w-fit cursor-pointer" [class.is-active]="layer.inset">
                    <input
                      type="checkbox"
                      class="sr-only"
                      [checked]="layer.inset"
                      (change)="toggleInset(layer.id)"
                    />
                    Inset (inner shadow)
                  </label>
                </div>
              </fieldset>
            }

            <button type="button" class="btn btn-secondary" (click)="addLayer()" [disabled]="layers().length >= 4">
              <app-icon name="layers" class="h-4 w-4" />
              Add another layer
            </button>
          </div>

          <!-- Preview + output -->
          <div class="flex min-w-0 flex-col gap-4">
            <div
              class="flex h-72 items-center justify-center rounded-2xl border border-line bg-bg-subtle"
            >
              <div
                class="h-32 w-40 rounded-2xl border border-line bg-elevated"
                [style.box-shadow]="css()"
              ></div>
            </div>

            <div class="overflow-hidden rounded-xl border border-line">
              <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
                <span class="text-xs font-semibold tracking-wide text-faint uppercase">CSS</span>
                <app-copy-button [value]="declaration()" label="Copy" variant="ghost" toastMessage="CSS copied" />
              </div>
              <pre class="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-fg">{{ declaration() }}</pre>
            </div>
          </div>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class BoxShadowGeneratorComponent {
  protected readonly presets = PRESETS;
  protected readonly sliders = [
    { key: 'x' as const, label: 'Horizontal offset', min: -100, max: 100 },
    { key: 'y' as const, label: 'Vertical offset', min: -100, max: 100 },
    { key: 'blur' as const, label: 'Blur radius', min: 0, max: 150 },
    { key: 'spread' as const, label: 'Spread radius', min: -50, max: 100 },
  ];

  private nextId = 1;
  protected readonly layers = signal<ShadowLayer[]>([
    { id: 0, x: 0, y: 8, blur: 24, spread: -6, color: '#000000', opacity: 0.18, inset: false },
  ]);

  protected readonly css = computed(() =>
    this.layers()
      .map((layer) => {
        const [r, g, b] = hexToRgb(layer.color);
        const colour = `rgba(${r}, ${g}, ${b}, ${layer.opacity})`;
        return `${layer.inset ? 'inset ' : ''}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${colour}`;
      })
      .join(', '),
  );

  protected readonly declaration = computed(() => {
    if (this.layers().length === 1) return `box-shadow: ${this.css()};`;
    // Put each layer on its own line — a multi-layer shadow on one line is
    // unreadable once it is pasted into a stylesheet.
    return `box-shadow:\n  ${this.css().split('), ').join('),\n  ')};`;
  });

  protected valueOf(layer: ShadowLayer, key: 'x' | 'y' | 'blur' | 'spread'): number {
    return layer[key];
  }

  protected update(id: number, key: 'x' | 'y' | 'blur' | 'spread' | 'opacity', value: number): void {
    this.layers.update((layers) =>
      layers.map((layer) => (layer.id === id ? { ...layer, [key]: value } : layer)),
    );
  }

  protected updateColor(id: number, color: string): void {
    this.layers.update((layers) =>
      layers.map((layer) => (layer.id === id ? { ...layer, color } : layer)),
    );
  }

  protected toggleInset(id: number): void {
    this.layers.update((layers) =>
      layers.map((layer) => (layer.id === id ? { ...layer, inset: !layer.inset } : layer)),
    );
  }

  protected addLayer(): void {
    this.layers.update((layers) => [
      ...layers,
      { id: this.nextId++, x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 0.12, inset: false },
    ]);
  }

  protected removeLayer(id: number): void {
    this.layers.update((layers) => (layers.length > 1 ? layers.filter((l) => l.id !== id) : layers));
  }

  protected applyPreset(label: string): void {
    const preset = PRESETS.find((p) => p.label === label);
    if (!preset) return;
    this.layers.set(preset.layers.map((layer) => ({ ...layer, id: this.nextId++ })));
  }
}

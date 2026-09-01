import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { loadImage, readAsDataUrl } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { extractPalette, parseColor, rgbToHsl } from '../../color/lib/color.util';

interface Swatch {
  hex: string;
  share: number;
  rgb: string;
  hsl: string;
  isLight: boolean;
}

@Component({
  selector: 'app-color-palette-extractor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="color-palette-extractor">
      <div class="flex flex-col gap-5">
        @if (!imageUrl()) {
          <app-upload-zone
            accept="image/*"
            title="Drop an image to extract its palette"
            hint="Pixels are sampled on a canvas in your browser"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <div class="grid gap-4 sm:grid-cols-[240px_1fr]">
            <img
              [src]="imageUrl()"
              alt="Source"
              class="h-48 w-full rounded-xl border border-line bg-bg-subtle object-contain"
            />

            <div class="flex flex-col gap-3">
              <div>
                <label class="label" for="palette-size">Palette size: {{ size() }} colours</label>
                <input
                  id="palette-size"
                  type="range"
                  min="3"
                  max="16"
                  class="w-full"
                  [value]="size()"
                  (input)="setSize(+$any($event.target).value)"
                />
              </div>

              <div class="flex h-16 overflow-hidden rounded-xl border border-line">
                @for (swatch of swatches(); track swatch.hex) {
                  <div class="flex-1" [style.background-color]="swatch.hex" [title]="swatch.hex"></div>
                }
              </div>

              <button type="button" class="btn btn-ghost w-fit" (click)="reset()">
                Choose another image
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (swatch of swatches(); track swatch.hex) {
              <div class="overflow-hidden rounded-xl border border-line">
                <div
                  class="flex h-20 items-end justify-between p-3"
                  [style.background-color]="swatch.hex"
                >
                  <span
                    class="rounded-md px-2 py-0.5 font-mono text-xs"
                    [class]="swatch.isLight ? 'bg-black/10 text-black' : 'bg-white/15 text-white'"
                  >
                    {{ swatch.share }}%
                  </span>
                </div>
                <div class="flex items-center justify-between gap-2 bg-bg-subtle px-3 py-2">
                  <div class="min-w-0">
                    <p class="font-mono text-sm">{{ swatch.hex }}</p>
                    <p class="truncate text-xs text-faint">{{ swatch.rgb }} · {{ swatch.hsl }}</p>
                  </div>
                  <app-copy-button
                    [value]="swatch.hex"
                    label=""
                    variant="ghost"
                    [toastMessage]="swatch.hex + ' copied'"
                  />
                </div>
              </div>
            }
          </div>

          @if (swatches().length) {
            <div class="overflow-hidden rounded-xl border border-line">
              <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
                <span class="text-xs font-semibold tracking-wide text-faint uppercase">
                  CSS custom properties
                </span>
                <app-copy-button [value]="cssVariables()" label="Copy" variant="ghost" toastMessage="Palette copied" />
              </div>
              <pre class="overflow-x-auto p-3 font-mono text-xs text-fg">{{ cssVariables() }}</pre>
            </div>
          }
        }
      </div>
    </app-tool-layout>
  `,
})
export class ColorPaletteExtractorComponent {
  protected readonly imageUrl = signal('');
  protected readonly size = signal(8);
  protected readonly swatches = signal<Swatch[]>([]);

  private pixels: Uint8ClampedArray | null = null;
  private readonly toast = inject(ToastService);

  protected readonly cssVariables = computed(() =>
    [
      ':root {',
      ...this.swatches().map((s, i) => `  --palette-${i + 1}: ${s.hex};`),
      '}',
    ].join('\n'),
  );

  protected async onFile(files: File[]): Promise<void> {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      this.toast.error('Please choose an image file.');
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      const image = await loadImage(dataUrl);
      this.imageUrl.set(dataUrl);

      // Downscale before sampling: a 400px-wide copy carries the same colour
      // distribution and keeps the read fast even for a 12MP photo.
      const maxSide = 400;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      this.pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      this.compute();
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected setSize(value: number): void {
    this.size.set(value);
    this.compute();
  }

  private compute(): void {
    if (!this.pixels) return;
    const palette = extractPalette(this.pixels, this.size());

    this.swatches.set(
      palette.map(({ hex, share }) => {
        const rgb = parseColor(hex);
        const hsl = rgb ? rgbToHsl(rgb) : { h: 0, s: 0, l: 0 };
        return {
          hex,
          share,
          rgb: rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '',
          hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          isLight: hsl.l > 60,
        };
      }),
    );
  }

  protected reset(): void {
    this.imageUrl.set('');
    this.swatches.set([]);
    this.pixels = null;
  }
}

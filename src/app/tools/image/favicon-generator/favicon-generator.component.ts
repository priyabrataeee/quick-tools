import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { canvasToBlob, downloadBlob, loadImage, readAsDataUrl } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

const SIZES = [16, 32, 48, 96, 144, 180, 192, 256, 512];

const HTML_SNIPPET = `<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png">
<link rel="manifest" href="/manifest.webmanifest">`;

const MANIFEST_SNIPPET = `"icons": [
  { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
]`;

interface GeneratedIcon {
  size: number;
  url: string;
  blob: Blob;
}

@Component({
  selector: 'app-favicon-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, CopyButtonComponent, IconComponent],
  template: `
    <app-tool-layout toolId="favicon-generator">
      <div class="flex flex-col gap-5">
        @if (!icons().length) {
          <app-upload-zone
            accept="image/*"
            title="Drop a square image (512px or larger)"
            hint="Every size is rendered on your device — nothing is uploaded"
            (filesSelected)="onFile($event)"
          />
        } @else {
          @if (warning()) {
            <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
              {{ warning() }}
            </p>
          }

          <div class="flex flex-wrap items-center gap-3">
            <label class="chip cursor-pointer" [class.is-active]="padded()">
              <input type="checkbox" class="sr-only" [checked]="padded()" (change)="togglePadding()" />
              Add safe-area padding
            </label>
            <div class="flex items-center gap-2">
              <label class="label !mb-0" for="fav-bg">Background</label>
              <input
                id="fav-bg"
                type="color"
                class="h-9 w-14 cursor-pointer rounded-lg border border-line bg-transparent"
                [value]="background()"
                (input)="setBackground($any($event.target).value)"
              />
            </div>
            <label class="chip cursor-pointer" [class.is-active]="transparent()">
              <input type="checkbox" class="sr-only" [checked]="transparent()" (change)="toggleTransparent()" />
              Keep transparency
            </label>
          </div>

          <div class="grid grid-cols-3 gap-4 sm:grid-cols-5">
            @for (icon of icons(); track icon.size) {
              <figure class="flex flex-col items-center gap-2 rounded-xl border border-line p-3">
                <img
                  [src]="icon.url"
                  [alt]="icon.size + ' pixel icon'"
                  class="h-16 w-16 object-contain"
                  [style.image-rendering]="icon.size <= 48 ? 'pixelated' : 'auto'"
                />
                <figcaption class="text-xs text-faint">{{ icon.size }}×{{ icon.size }}</figcaption>
              </figure>
            }
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" (click)="downloadAll()">
              <app-icon name="download" class="h-4 w-4" />
              Download all {{ icons().length }} sizes
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">
              Choose another image
            </button>
          </div>
          <p class="text-xs text-faint">
            Each size downloads as a separate PNG. Your browser may ask permission for multiple
            downloads the first time.
          </p>

          <section class="flex flex-col gap-3">
            <div class="overflow-hidden rounded-xl border border-line">
              <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
                <span class="text-xs font-semibold tracking-wide text-faint uppercase">HTML head</span>
                <app-copy-button [value]="htmlSnippet" label="Copy" variant="ghost" toastMessage="HTML copied" />
              </div>
              <pre class="overflow-x-auto p-3 font-mono text-xs text-fg">{{ htmlSnippet }}</pre>
            </div>

            <div class="overflow-hidden rounded-xl border border-line">
              <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
                <span class="text-xs font-semibold tracking-wide text-faint uppercase">
                  Web app manifest
                </span>
                <app-copy-button [value]="manifestSnippet" label="Copy" variant="ghost" toastMessage="Manifest copied" />
              </div>
              <pre class="overflow-x-auto p-3 font-mono text-xs text-fg">{{ manifestSnippet }}</pre>
            </div>
          </section>
        }
      </div>
    </app-tool-layout>
  `,
})
export class FaviconGeneratorComponent {
  protected readonly htmlSnippet = HTML_SNIPPET;
  protected readonly manifestSnippet = MANIFEST_SNIPPET;

  protected readonly icons = signal<GeneratedIcon[]>([]);
  protected readonly warning = signal('');
  protected readonly padded = signal(false);
  protected readonly transparent = signal(true);
  protected readonly background = signal('#ffffff');

  private image: HTMLImageElement | null = null;
  private readonly toast = inject(ToastService);

  protected async onFile(files: File[]): Promise<void> {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      this.toast.error('Please choose an image file.');
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      this.image = await loadImage(dataUrl);

      const { naturalWidth: w, naturalHeight: h } = this.image;
      const notes: string[] = [];
      if (Math.abs(w - h) > 2) {
        notes.push('Your image is not square, so it has been letterboxed to fit.');
      }
      if (Math.min(w, h) < 512) {
        notes.push(`The source is ${w}×${h}; 512×512 or larger gives sharper large icons.`);
      }
      this.warning.set(notes.join(' '));

      await this.generate();
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected togglePadding(): void {
    this.padded.update((v) => !v);
    void this.generate();
  }

  protected toggleTransparent(): void {
    this.transparent.update((v) => !v);
    void this.generate();
  }

  protected setBackground(value: string): void {
    this.background.set(value);
    if (!this.transparent()) void this.generate();
  }

  private async generate(): Promise<void> {
    const image = this.image;
    if (!image) return;

    this.revokeAll();
    const generated: GeneratedIcon[] = [];

    for (const size of SIZES) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) continue;

      if (!this.transparent()) {
        context.fillStyle = this.background();
        context.fillRect(0, 0, size, size);
      }

      // Contain the source inside the square, optionally with a safe margin so
      // maskable icons are not clipped by a circular mask.
      const margin = this.padded() ? size * 0.1 : 0;
      const available = size - margin * 2;
      const scale = Math.min(available / image.naturalWidth, available / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        (size - drawWidth) / 2,
        (size - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );

      const blob = await canvasToBlob(canvas, 'image/png');
      generated.push({ size, blob, url: URL.createObjectURL(blob) });
    }

    this.icons.set(generated);
  }

  protected downloadAll(): void {
    // Stagger the downloads: browsers throttle or block a burst of them.
    this.icons().forEach((icon, index) => {
      setTimeout(() => downloadBlob(icon.blob, `icon-${icon.size}.png`), index * 220);
    });
    this.toast.success(`Downloading ${this.icons().length} icons`);
  }

  protected reset(): void {
    this.revokeAll();
    this.icons.set([]);
    this.image = null;
    this.warning.set('');
  }

  private revokeAll(): void {
    for (const icon of this.icons()) URL.revokeObjectURL(icon.url);
  }
}

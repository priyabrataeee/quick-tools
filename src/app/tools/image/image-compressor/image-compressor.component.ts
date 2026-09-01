import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { canvasToBlob, downloadBlob, formatBytes, loadImage, readAsDataUrl } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

@Component({
  selector: 'app-image-compressor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="image-compressor">
      <div class="flex flex-col gap-5">
        @if (!originalUrl()) {
          <app-upload-zone
            accept="image/*"
            title="Drop an image to compress"
            hint="JPG, PNG, WebP or AVIF — compression happens on your device"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <div class="grid gap-4 sm:grid-cols-2">
            <figure class="overflow-hidden rounded-xl border border-line">
              <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                Original — {{ formatBytes(originalSize()) }}
              </figcaption>
              <img [src]="originalUrl()" alt="Original" class="max-h-72 w-full bg-bg-subtle object-contain" />
            </figure>

            <figure class="overflow-hidden rounded-xl border border-line">
              <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                Compressed — {{ compressedSize() ? formatBytes(compressedSize()) : 'processing…' }}
              </figcaption>
              @if (compressedUrl()) {
                <img [src]="compressedUrl()" alt="Compressed preview" class="max-h-72 w-full bg-bg-subtle object-contain" />
              } @else {
                <div class="flex h-72 items-center justify-center bg-bg-subtle text-sm text-faint">
                  Working…
                </div>
              }
            </figure>
          </div>

          @if (compressedSize() > 0) {
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
                <p class="text-lg font-bold">{{ formatBytes(originalSize()) }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">Before</p>
              </div>
              <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
                <p class="text-lg font-bold">{{ formatBytes(compressedSize()) }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">After</p>
              </div>
              <div
                class="rounded-xl border p-4 text-center"
                [class]="savedPercent() > 0 ? 'border-success/40 bg-success-soft' : 'border-warning/40 bg-warning-soft'"
              >
                <p class="text-lg font-bold" [class]="savedPercent() > 0 ? 'text-success' : 'text-warning'">
                  {{ savedPercent() > 0 ? '−' : '+' }}{{ absSaved() }}%
                </p>
                <p class="text-[11px] tracking-wide text-faint uppercase">
                  {{ savedPercent() > 0 ? 'Smaller' : 'Larger' }}
                </p>
              </div>
            </div>

            @if (savedPercent() <= 0) {
              <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
                Re-encoding made this file larger — it was already well optimised. Try WebP output,
                or keep the original.
              </p>
            }
          }

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="ic-quality">Quality: {{ quality() }}%</label>
              <input
                id="ic-quality"
                type="range"
                min="10"
                max="100"
                class="w-full"
                [value]="quality()"
                (input)="setQuality(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="ic-maxwidth">
                Maximum width: {{ maxWidth() === 0 ? 'original' : maxWidth() + 'px' }}
              </label>
              <input
                id="ic-maxwidth"
                type="range"
                min="0"
                max="4000"
                step="100"
                class="w-full"
                [value]="maxWidth()"
                (input)="setMaxWidth(+$any($event.target).value)"
              />
            </div>
          </div>

          <div>
            <span class="label">Output format</span>
            <div class="flex flex-wrap gap-2">
              @for (option of formats; track option.mime) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="format() === option.mime"
                  (click)="setFormat(option.mime)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" (click)="download()" [disabled]="!compressedBlob()">
              <app-icon name="download" class="h-4 w-4" />
              Download compressed image
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">Choose another image</button>
          </div>

          <p class="text-xs text-faint">
            {{ dimensions() }} · processed entirely in your browser.
          </p>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ImageCompressorComponent implements OnDestroy {
  protected readonly formats = [
    { mime: 'image/jpeg', label: 'JPEG', extension: 'jpg' },
    { mime: 'image/webp', label: 'WebP', extension: 'webp' },
    { mime: 'image/png', label: 'PNG', extension: 'png' },
  ];

  protected readonly originalUrl = signal('');
  protected readonly originalSize = signal(0);
  protected readonly compressedUrl = signal('');
  protected readonly compressedSize = signal(0);
  protected readonly compressedBlob = signal<Blob | null>(null);
  protected readonly quality = signal(75);
  protected readonly maxWidth = signal(0);
  protected readonly format = signal('image/jpeg');
  protected readonly dimensions = signal('');

  private image: HTMLImageElement | null = null;
  private fileName = 'image';
  private readonly toast = inject(ToastService);
  /** Guards against a slow run overwriting a newer one. */
  private runId = 0;

  protected readonly savedPercent = computed(() => {
    const before = this.originalSize();
    const after = this.compressedSize();
    if (!before || !after) return 0;
    return Math.round(((before - after) / before) * 100);
  });

  protected readonly absSaved = computed(() => Math.abs(this.savedPercent()));

  ngOnDestroy(): void {
    this.revoke();
  }

  protected async onFile(files: File[]): Promise<void> {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      this.toast.error('Please choose an image file.');
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      this.image = await loadImage(dataUrl);
      this.fileName = file.name.replace(/\.[^.]+$/, '');
      this.originalUrl.set(dataUrl);
      this.originalSize.set(file.size);
      this.dimensions.set(`${this.image.naturalWidth} × ${this.image.naturalHeight} px`);
      // Preserve alpha automatically rather than flattening it onto white.
      if (file.type === 'image/png') this.format.set('image/webp');
      await this.compress();
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected setQuality(value: number): void {
    this.quality.set(value);
    void this.compress();
  }

  protected setMaxWidth(value: number): void {
    this.maxWidth.set(value);
    void this.compress();
  }

  protected setFormat(mime: string): void {
    this.format.set(mime);
    void this.compress();
  }

  private async compress(): Promise<void> {
    const image = this.image;
    if (!image) return;
    const id = ++this.runId;

    const scale =
      this.maxWidth() > 0 && image.naturalWidth > this.maxWidth()
        ? this.maxWidth() / image.naturalWidth
        : 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) return;

    // JPEG has no alpha channel, so fill first to avoid black transparency.
    if (this.format() === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    try {
      const blob = await canvasToBlob(canvas, this.format(), this.quality() / 100);
      if (id !== this.runId) return;
      this.revoke();
      this.compressedBlob.set(blob);
      this.compressedSize.set(blob.size);
      this.compressedUrl.set(URL.createObjectURL(blob));
      this.dimensions.set(`${canvas.width} × ${canvas.height} px`);
    } catch {
      if (id === this.runId) this.toast.error('This browser cannot encode that format.');
    }
  }

  protected download(): void {
    const blob = this.compressedBlob();
    if (!blob) return;
    const extension = this.formats.find((f) => f.mime === this.format())?.extension ?? 'jpg';
    downloadBlob(blob, `${this.fileName}-compressed.${extension}`);
  }

  protected reset(): void {
    this.revoke();
    this.image = null;
    this.originalUrl.set('');
    this.originalSize.set(0);
    this.compressedUrl.set('');
    this.compressedSize.set(0);
    this.compressedBlob.set(null);
    this.dimensions.set('');
  }

  private revoke(): void {
    const url = this.compressedUrl();
    if (url) URL.revokeObjectURL(url);
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

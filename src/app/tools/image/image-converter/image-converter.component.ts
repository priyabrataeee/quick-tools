import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { canvasToBlob, downloadBlob, formatBytes, loadImage, readAsDataUrl } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

const FORMATS = [
  { mime: 'image/png', label: 'PNG', extension: 'png', lossy: false, alpha: true },
  { mime: 'image/jpeg', label: 'JPEG', extension: 'jpg', lossy: true, alpha: false },
  { mime: 'image/webp', label: 'WebP', extension: 'webp', lossy: true, alpha: true },
  { mime: 'image/avif', label: 'AVIF', extension: 'avif', lossy: true, alpha: true },
];

@Component({
  selector: 'app-image-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="image-converter">
      <div class="flex flex-col gap-5">
        @if (!sourceUrl()) {
          <app-upload-zone
            accept="image/*"
            title="Drop an image to convert"
            hint="JPG, PNG, WebP, AVIF, GIF or BMP in — PNG, JPEG or WebP out"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <div class="grid gap-4 sm:grid-cols-2">
            <figure class="overflow-hidden rounded-xl border border-line">
              <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                {{ sourceType() }} — {{ formatBytes(sourceSize()) }}
              </figcaption>
              <img [src]="sourceUrl()" alt="Original" class="max-h-72 w-full bg-bg-subtle object-contain" />
            </figure>

            <figure class="overflow-hidden rounded-xl border border-line">
              <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                {{ activeFormat().label }}
                @if (outputSize() > 0) {
                  — {{ formatBytes(outputSize()) }}
                }
              </figcaption>
              @if (outputUrl()) {
                <img [src]="outputUrl()" alt="Converted" class="max-h-72 w-full bg-bg-subtle object-contain" />
              } @else {
                <div class="flex h-72 items-center justify-center bg-bg-subtle text-sm text-faint">
                  Converting…
                </div>
              }
            </figure>
          </div>

          <div>
            <span class="label">Convert to</span>
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

          @if (activeFormat().lossy) {
            <div>
              <label class="label" for="conv-quality">Quality: {{ quality() }}%</label>
              <input
                id="conv-quality"
                type="range"
                min="10"
                max="100"
                class="w-full max-w-md"
                [value]="quality()"
                (input)="setQuality(+$any($event.target).value)"
              />
            </div>
          }

          @if (!activeFormat().alpha) {
            <div class="flex items-center gap-3">
              <label class="label !mb-0" for="conv-bg">Background for transparent areas</label>
              <input
                id="conv-bg"
                type="color"
                class="h-9 w-16 cursor-pointer rounded-lg border border-line bg-transparent"
                [value]="background()"
                (input)="setBackground($any($event.target).value)"
              />
            </div>
          }

          @if (error()) {
            <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              {{ error() }}
            </p>
          }

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" (click)="download()" [disabled]="!outputBlob()">
              <app-icon name="download" class="h-4 w-4" />
              Download {{ activeFormat().label }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">Choose another image</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ImageConverterComponent implements OnDestroy {
  protected readonly formats = FORMATS;

  protected readonly sourceUrl = signal('');
  protected readonly sourceSize = signal(0);
  protected readonly sourceType = signal('');
  protected readonly outputUrl = signal('');
  protected readonly outputSize = signal(0);
  protected readonly outputBlob = signal<Blob | null>(null);
  protected readonly format = signal('image/webp');
  protected readonly quality = signal(85);
  protected readonly background = signal('#ffffff');
  protected readonly error = signal('');

  private image: HTMLImageElement | null = null;
  private fileName = 'image';
  private runId = 0;
  private readonly toast = inject(ToastService);

  protected readonly activeFormat = computed(
    () => FORMATS.find((f) => f.mime === this.format()) ?? FORMATS[0],
  );

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
      this.sourceUrl.set(dataUrl);
      this.sourceSize.set(file.size);
      this.sourceType.set((file.type.split('/')[1] ?? 'image').toUpperCase());
      await this.convert();
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected setFormat(mime: string): void {
    this.format.set(mime);
    void this.convert();
  }

  protected setQuality(value: number): void {
    this.quality.set(value);
    void this.convert();
  }

  protected setBackground(value: string): void {
    this.background.set(value);
    void this.convert();
  }

  private async convert(): Promise<void> {
    const image = this.image;
    if (!image) return;
    const id = ++this.runId;
    this.error.set('');

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    if (!this.activeFormat().alpha) {
      context.fillStyle = this.background();
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0);

    try {
      const blob = await canvasToBlob(canvas, this.format(), this.quality() / 100);
      if (id !== this.runId) return;

      // Browsers that cannot encode a format silently fall back to PNG, so
      // check the type we actually got rather than the one we asked for.
      if (blob.type !== this.format()) {
        this.error.set(
          `This browser cannot encode ${this.activeFormat().label}. The download will be ${blob.type.split('/')[1].toUpperCase()} instead.`,
        );
      }

      this.revoke();
      this.outputBlob.set(blob);
      this.outputSize.set(blob.size);
      this.outputUrl.set(URL.createObjectURL(blob));
    } catch {
      if (id === this.runId) {
        this.error.set(`This browser cannot encode ${this.activeFormat().label}.`);
      }
    }
  }

  protected download(): void {
    const blob = this.outputBlob();
    if (!blob) return;
    const extension = blob.type.split('/')[1] ?? this.activeFormat().extension;
    downloadBlob(blob, `${this.fileName}.${extension === 'jpeg' ? 'jpg' : extension}`);
  }

  protected reset(): void {
    this.revoke();
    this.image = null;
    this.sourceUrl.set('');
    this.outputUrl.set('');
    this.outputBlob.set(null);
    this.outputSize.set(0);
    this.error.set('');
  }

  private revoke(): void {
    const url = this.outputUrl();
    if (url) URL.revokeObjectURL(url);
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { canvasToBlob, clamp, downloadBlob, formatBytes, loadImage, readAsDataUrl } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

@Component({
  selector: 'app-image-resizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="image-resizer">
      <div class="flex flex-col gap-5">
        @if (!sourceUrl()) {
          <app-upload-zone
            accept="image/*"
            title="Drop an image to resize"
            hint="Nothing is uploaded — resizing happens on a canvas in your browser"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <figure class="overflow-hidden rounded-xl border border-line">
            <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
              Preview — {{ width() }} × {{ height() }} px
              @if (outputSize() > 0) {
                · {{ formatBytes(outputSize()) }}
              }
            </figcaption>
            <img
              [src]="previewUrl() || sourceUrl()"
              alt="Resized preview"
              class="max-h-80 w-full bg-bg-subtle object-contain"
            />
          </figure>

          <p class="text-sm text-muted">
            Original: {{ naturalWidth() }} × {{ naturalHeight() }} px
          </p>

          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label" for="ir-width">Width (px)</label>
              <input
                id="ir-width"
                type="number"
                class="input"
                min="1"
                [value]="width()"
                (input)="setWidth(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="ir-height">Height (px)</label>
              <input
                id="ir-height"
                type="number"
                class="input"
                min="1"
                [value]="height()"
                (input)="setHeight(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="ir-percent">Scale: {{ percent() }}%</label>
              <input
                id="ir-percent"
                type="range"
                min="5"
                max="200"
                class="w-full"
                [value]="percent()"
                (input)="setPercent(+$any($event.target).value)"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="chip cursor-pointer" [class.is-active]="lockRatio()">
              <input type="checkbox" class="sr-only" [checked]="lockRatio()" (change)="lockRatio.set(!lockRatio())" />
              <app-icon name="lock" class="h-3.5 w-3.5" />
              Lock aspect ratio
            </label>

            <span class="mx-1 h-5 w-px bg-line"></span>

            @for (option of presets; track option.label) {
              <button type="button" class="chip" (click)="applyPreset(option.width)">
                {{ option.label }}
              </button>
            }
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

          @if (upscaling()) {
            <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
              You are enlarging beyond the original resolution. Pixels that were never captured
              cannot be recovered, so the result will look softer.
            </p>
          }

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" (click)="download()" [disabled]="!outputBlob()">
              <app-icon name="download" class="h-4 w-4" />
              Download resized image
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">Choose another image</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ImageResizerComponent implements OnDestroy {
  protected readonly formats = [
    { mime: 'image/png', label: 'PNG', extension: 'png' },
    { mime: 'image/jpeg', label: 'JPEG', extension: 'jpg' },
    { mime: 'image/webp', label: 'WebP', extension: 'webp' },
  ];

  protected readonly presets = [
    { label: 'Thumbnail 150', width: 150 },
    { label: 'Small 480', width: 480 },
    { label: 'Medium 800', width: 800 },
    { label: 'Large 1600', width: 1600 },
  ];

  protected readonly sourceUrl = signal('');
  protected readonly previewUrl = signal('');
  protected readonly naturalWidth = signal(0);
  protected readonly naturalHeight = signal(0);
  protected readonly width = signal(0);
  protected readonly height = signal(0);
  protected readonly lockRatio = signal(true);
  protected readonly format = signal('image/png');
  protected readonly outputBlob = signal<Blob | null>(null);
  protected readonly outputSize = signal(0);

  private image: HTMLImageElement | null = null;
  private fileName = 'image';
  private runId = 0;
  private readonly toast = inject(ToastService);

  protected readonly percent = computed(() => {
    const natural = this.naturalWidth();
    return natural ? Math.round((this.width() / natural) * 100) : 100;
  });

  protected readonly upscaling = computed(
    () => this.width() > this.naturalWidth() || this.height() > this.naturalHeight(),
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
      this.naturalWidth.set(this.image.naturalWidth);
      this.naturalHeight.set(this.image.naturalHeight);
      this.width.set(this.image.naturalWidth);
      this.height.set(this.image.naturalHeight);
      await this.render();
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected setWidth(value: number): void {
    const width = clamp(Math.round(value), 1, 20000);
    this.width.set(width);
    if (this.lockRatio() && this.naturalWidth()) {
      this.height.set(Math.max(1, Math.round((width / this.naturalWidth()) * this.naturalHeight())));
    }
    void this.render();
  }

  protected setHeight(value: number): void {
    const height = clamp(Math.round(value), 1, 20000);
    this.height.set(height);
    if (this.lockRatio() && this.naturalHeight()) {
      this.width.set(Math.max(1, Math.round((height / this.naturalHeight()) * this.naturalWidth())));
    }
    void this.render();
  }

  protected setPercent(value: number): void {
    const width = Math.max(1, Math.round((this.naturalWidth() * value) / 100));
    this.width.set(width);
    this.height.set(Math.max(1, Math.round((this.naturalHeight() * value) / 100)));
    void this.render();
  }

  protected applyPreset(width: number): void {
    this.setWidth(width);
  }

  protected setFormat(mime: string): void {
    this.format.set(mime);
    void this.render();
  }

  private async render(): Promise<void> {
    const image = this.image;
    if (!image) return;
    const id = ++this.runId;

    const canvas = document.createElement('canvas');
    canvas.width = this.width();
    canvas.height = this.height();
    const context = canvas.getContext('2d');
    if (!context) return;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    if (this.format() === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    try {
      const blob = await canvasToBlob(canvas, this.format(), 0.92);
      if (id !== this.runId) return;
      this.revoke();
      this.outputBlob.set(blob);
      this.outputSize.set(blob.size);
      this.previewUrl.set(URL.createObjectURL(blob));
    } catch {
      if (id === this.runId) this.toast.error('This browser cannot encode that format.');
    }
  }

  protected download(): void {
    const blob = this.outputBlob();
    if (!blob) return;
    const extension = this.formats.find((f) => f.mime === this.format())?.extension ?? 'png';
    downloadBlob(blob, `${this.fileName}-${this.width()}x${this.height()}.${extension}`);
  }

  protected reset(): void {
    this.revoke();
    this.image = null;
    this.sourceUrl.set('');
    this.previewUrl.set('');
    this.outputBlob.set(null);
    this.outputSize.set(0);
  }

  private revoke(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

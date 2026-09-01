import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { canvasToBlob, clamp, downloadBlob, loadImage, readAsDataUrl } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

const RATIOS = [
  { label: 'Free', value: 0 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

@Component({
  selector: 'app-crop-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="crop-image">
      <div class="flex flex-col gap-5">
        @if (!sourceUrl()) {
          <app-upload-zone
            accept="image/*"
            title="Drop an image to crop"
            hint="Set the crop area numerically or with the ratio presets"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <!-- The wrapper shrinks to the rendered image so the percentage-based
               overlay lines up with the picture rather than the page. -->
          <div class="relative mx-auto inline-block overflow-hidden rounded-xl border border-line bg-bg-subtle">
            <img [src]="sourceUrl()" alt="Source" class="block max-h-96 max-w-full opacity-40" />
            <!-- The selection is drawn as a percentage of the image box so it
                 tracks the rendered size at any viewport width. -->
            <div
              class="pointer-events-none absolute border-2 border-brand bg-brand/10"
              [style.left.%]="(cropX() / naturalWidth()) * 100"
              [style.top.%]="(cropY() / naturalHeight()) * 100"
              [style.width.%]="(cropWidth() / naturalWidth()) * 100"
              [style.height.%]="(cropHeight() / naturalHeight()) * 100"
            ></div>
          </div>

          <div>
            <span class="label">Aspect ratio</span>
            <div class="flex flex-wrap gap-2">
              @for (option of ratios; track option.label) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="ratio() === option.value"
                  (click)="setRatio(option.value)"
                >
                  {{ option.label }}
                </button>
              }
              <button type="button" class="btn btn-ghost" (click)="centerCrop()">Centre selection</button>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-4">
            <div>
              <label class="label" for="crop-x">X offset</label>
              <input id="crop-x" type="number" class="input" min="0" [value]="cropX()" (input)="setX(+$any($event.target).value)" />
            </div>
            <div>
              <label class="label" for="crop-y">Y offset</label>
              <input id="crop-y" type="number" class="input" min="0" [value]="cropY()" (input)="setY(+$any($event.target).value)" />
            </div>
            <div>
              <label class="label" for="crop-w">Width</label>
              <input id="crop-w" type="number" class="input" min="1" [value]="cropWidth()" (input)="setWidth(+$any($event.target).value)" />
            </div>
            <div>
              <label class="label" for="crop-h">Height</label>
              <input id="crop-h" type="number" class="input" min="1" [value]="cropHeight()" (input)="setHeight(+$any($event.target).value)" />
            </div>
          </div>

          <p class="text-sm text-muted">
            Source is {{ naturalWidth() }} × {{ naturalHeight() }} px · crop is
            {{ cropWidth() }} × {{ cropHeight() }} px
          </p>

          <div>
            <span class="label">Output format</span>
            <div class="flex flex-wrap gap-2">
              @for (option of formats; track option.mime) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="format() === option.mime"
                  (click)="format.set(option.mime)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          @if (croppedUrl()) {
            <figure class="overflow-hidden rounded-xl border border-line">
              <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                Cropped result
              </figcaption>
              <img [src]="croppedUrl()" alt="Cropped result" class="max-h-80 w-full bg-bg-subtle object-contain" />
            </figure>
          }

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" (click)="crop()">
              <app-icon name="crop" class="h-4 w-4" />
              Crop image
            </button>
            <button type="button" class="btn btn-secondary" (click)="download()" [disabled]="!croppedBlob()">
              <app-icon name="download" class="h-4 w-4" />
              Download
            </button>
            <button type="button" class="btn btn-ghost" (click)="reset()">Choose another image</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class CropImageComponent implements OnDestroy {
  protected readonly ratios = RATIOS;
  protected readonly formats = [
    { mime: 'image/png', label: 'PNG', extension: 'png' },
    { mime: 'image/jpeg', label: 'JPEG', extension: 'jpg' },
    { mime: 'image/webp', label: 'WebP', extension: 'webp' },
  ];

  protected readonly sourceUrl = signal('');
  protected readonly croppedUrl = signal('');
  protected readonly croppedBlob = signal<Blob | null>(null);
  protected readonly naturalWidth = signal(1);
  protected readonly naturalHeight = signal(1);
  protected readonly cropX = signal(0);
  protected readonly cropY = signal(0);
  protected readonly cropWidth = signal(1);
  protected readonly cropHeight = signal(1);
  protected readonly ratio = signal(0);
  protected readonly format = signal('image/png');

  private image: HTMLImageElement | null = null;
  private fileName = 'image';
  private readonly toast = inject(ToastService);

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
      this.centerCrop();
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected setRatio(value: number): void {
    this.ratio.set(value);
    if (value > 0) this.applyRatio();
  }

  private applyRatio(): void {
    const ratio = this.ratio();
    if (ratio <= 0) return;
    const width = this.cropWidth();
    const height = Math.round(width / ratio);
    this.cropHeight.set(clamp(height, 1, this.naturalHeight()));
    if (this.cropY() + this.cropHeight() > this.naturalHeight()) {
      this.cropY.set(Math.max(0, this.naturalHeight() - this.cropHeight()));
    }
  }

  protected centerCrop(): void {
    const ratio = this.ratio();
    const naturalWidth = this.naturalWidth();
    const naturalHeight = this.naturalHeight();

    let width = Math.round(naturalWidth * 0.8);
    let height = ratio > 0 ? Math.round(width / ratio) : Math.round(naturalHeight * 0.8);

    if (height > naturalHeight) {
      height = naturalHeight;
      width = ratio > 0 ? Math.round(height * ratio) : width;
    }
    width = clamp(width, 1, naturalWidth);
    height = clamp(height, 1, naturalHeight);

    this.cropWidth.set(width);
    this.cropHeight.set(height);
    this.cropX.set(Math.round((naturalWidth - width) / 2));
    this.cropY.set(Math.round((naturalHeight - height) / 2));
  }

  protected setX(value: number): void {
    this.cropX.set(clamp(Math.round(value), 0, this.naturalWidth() - this.cropWidth()));
  }

  protected setY(value: number): void {
    this.cropY.set(clamp(Math.round(value), 0, this.naturalHeight() - this.cropHeight()));
  }

  protected setWidth(value: number): void {
    this.cropWidth.set(clamp(Math.round(value), 1, this.naturalWidth() - this.cropX()));
    if (this.ratio() > 0) this.applyRatio();
  }

  protected setHeight(value: number): void {
    this.cropHeight.set(clamp(Math.round(value), 1, this.naturalHeight() - this.cropY()));
    if (this.ratio() > 0) {
      this.cropWidth.set(clamp(Math.round(this.cropHeight() * this.ratio()), 1, this.naturalWidth()));
    }
  }

  protected async crop(): Promise<void> {
    const image = this.image;
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.cropWidth();
    canvas.height = this.cropHeight();
    const context = canvas.getContext('2d');
    if (!context) return;

    if (this.format() === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(
      image,
      this.cropX(),
      this.cropY(),
      this.cropWidth(),
      this.cropHeight(),
      0,
      0,
      canvas.width,
      canvas.height,
    );

    try {
      const blob = await canvasToBlob(canvas, this.format(), 0.92);
      this.revoke();
      this.croppedBlob.set(blob);
      this.croppedUrl.set(URL.createObjectURL(blob));
    } catch {
      this.toast.error('Could not encode the cropped image.');
    }
  }

  protected download(): void {
    const blob = this.croppedBlob();
    if (!blob) return;
    const extension = this.formats.find((f) => f.mime === this.format())?.extension ?? 'png';
    downloadBlob(blob, `${this.fileName}-cropped.${extension}`);
  }

  protected reset(): void {
    this.revoke();
    this.image = null;
    this.sourceUrl.set('');
    this.croppedUrl.set('');
    this.croppedBlob.set(null);
  }

  private revoke(): void {
    const url = this.croppedUrl();
    if (url) URL.revokeObjectURL(url);
  }
}

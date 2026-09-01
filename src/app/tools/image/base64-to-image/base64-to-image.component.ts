import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { downloadBlob, formatBytes } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

/** Detects an image type from its magic bytes. */
function sniffType(bytes: Uint8Array): string {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (startsWith(0x47, 0x49, 0x46)) return 'image/gif';
  if (startsWith(0x42, 0x4d)) return 'image/bmp';
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  if (startsWith(0x3c, 0x3f, 0x78, 0x6d) || startsWith(0x3c, 0x73, 0x76, 0x67)) return 'image/svg+xml';
  return 'application/octet-stream';
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

@Component({
  selector: 'app-base64-to-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent],
  template: `
    <app-tool-layout toolId="base64-to-image">
      <div class="flex flex-col gap-5">
        <div>
          <label class="label" for="b64img-input">Base64 string or data URL</label>
          <textarea
            id="b64img-input"
            class="textarea h-40"
            spellcheck="false"
            placeholder="data:image/png;base64,iVBORw0KGgo… — or just the raw Base64"
            [value]="input()"
            (input)="onInput($any($event.target).value)"
          ></textarea>
        </div>

        @if (error()) {
          <div class="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <app-icon name="alert" class="h-4 w-4 shrink-0" />
            {{ error() }}
          </div>
        }

        @if (objectUrl()) {
          <figure class="overflow-hidden rounded-xl border border-line">
            <figcaption class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
              Decoded image
            </figcaption>
            <img
              [src]="objectUrl()"
              alt="Decoded result"
              class="max-h-96 w-full bg-bg-subtle object-contain"
              (load)="onImageLoad($event)"
            />
          </figure>

          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
              <p class="text-lg font-bold">{{ typeLabel() }}</p>
              <p class="text-[11px] tracking-wide text-faint uppercase">Format</p>
            </div>
            <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
              <p class="text-lg font-bold">{{ dimensions() || '—' }}</p>
              <p class="text-[11px] tracking-wide text-faint uppercase">Dimensions</p>
            </div>
            <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
              <p class="text-lg font-bold">{{ formatBytes(byteSize()) }}</p>
              <p class="text-[11px] tracking-wide text-faint uppercase">File size</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" (click)="download()">
              <app-icon name="download" class="h-4 w-4" />
              Download image
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">Clear</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class Base64ToImageComponent implements OnDestroy {
  protected readonly input = signal('');
  protected readonly error = signal('');
  protected readonly objectUrl = signal('');
  protected readonly mimeType = signal('');
  protected readonly byteSize = signal(0);
  protected readonly dimensions = signal('');

  private blob: Blob | null = null;
  private readonly toast = inject(ToastService);

  protected readonly typeLabel = computed(() => {
    const type = this.mimeType();
    if (!type || type === 'application/octet-stream') return 'Unknown';
    return (type.split('/')[1] ?? type).toUpperCase();
  });

  ngOnDestroy(): void {
    this.revoke();
  }

  protected onInput(value: string): void {
    this.input.set(value);
    this.decode(value);
  }

  private decode(raw: string): void {
    this.revoke();
    this.error.set('');
    this.objectUrl.set('');
    this.dimensions.set('');
    this.blob = null;

    const trimmed = raw.trim();
    if (!trimmed) return;

    // Accept a full data URL, a quoted string from source code, or raw Base64.
    const withoutQuotes = trimmed.replace(/^["']|["']$/g, '');
    const dataUrlMatch = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(withoutQuotes);
    const declaredType = dataUrlMatch?.[1] ?? '';
    const payload = (dataUrlMatch ? dataUrlMatch[3] : withoutQuotes).replace(/\s+/g, '');

    if (!payload) {
      this.error.set('There is no data to decode.');
      return;
    }

    try {
      const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

      const sniffed = sniffType(bytes);
      const type = sniffed !== 'application/octet-stream' ? sniffed : declaredType || 'image/png';

      if (!type.startsWith('image/')) {
        this.error.set('This decodes successfully but is not a recognised image format.');
        return;
      }

      this.blob = new Blob([bytes as unknown as BlobPart], { type });
      this.mimeType.set(type);
      this.byteSize.set(bytes.length);
      this.objectUrl.set(URL.createObjectURL(this.blob));
    } catch {
      this.error.set(
        'That is not valid Base64. Check for a truncated string or stray characters copied from the surrounding code.',
      );
    }
  }

  protected onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.dimensions.set(`${img.naturalWidth} × ${img.naturalHeight}`);
  }

  protected download(): void {
    if (!this.blob) return;
    const extension = EXTENSIONS[this.mimeType()] ?? 'png';
    downloadBlob(this.blob, `decoded-image.${extension}`);
    this.toast.success('Image downloaded');
  }

  protected reset(): void {
    this.input.set('');
    this.decode('');
  }

  private revoke(): void {
    const url = this.objectUrl();
    if (url) URL.revokeObjectURL(url);
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

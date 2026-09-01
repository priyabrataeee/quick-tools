import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { canvasToBlob, downloadBlob, formatBytes, loadImage, readAsDataUrl } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

interface ImageEntry {
  id: number;
  file: File;
  url: string;
}

/** Page sizes in PDF points (1/72 inch). */
const PAGE_SIZES = {
  fit: { label: 'Fit each image', width: 0, height: 0 },
  a4: { label: 'A4 portrait', width: 595.28, height: 841.89 },
  letter: { label: 'US Letter', width: 612, height: 792 },
};

type PageSizeId = keyof typeof PAGE_SIZES;

@Component({
  selector: 'app-images-to-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="images-to-pdf">
      <div class="flex flex-col gap-5">
        <app-upload-zone
          accept="image/*"
          [multiple]="true"
          title="Drop the images you want in the PDF"
          hint="JPG and PNG are embedded directly; other formats are converted first"
          (filesSelected)="onFiles($event)"
        />

        @if (entries().length) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            @for (entry of entries(); track entry.id; let i = $index; let first = $first; let last = $last) {
              <figure class="overflow-hidden rounded-xl border border-line">
                <img [src]="entry.url" [alt]="entry.file.name" class="h-32 w-full bg-bg-subtle object-contain" />
                <figcaption class="flex items-center gap-1 border-t border-line bg-bg-subtle px-2 py-1.5">
                  <span class="min-w-0 flex-1 truncate text-xs">{{ i + 1 }}. {{ entry.file.name }}</span>
                  <button
                    type="button"
                    class="btn btn-ghost h-6 w-6 !p-0"
                    [disabled]="first"
                    (click)="move(i, -1)"
                    aria-label="Move earlier"
                  >
                    <app-icon name="chevron-up" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost h-6 w-6 !p-0"
                    [disabled]="last"
                    (click)="move(i, 1)"
                    aria-label="Move later"
                  >
                    <app-icon name="chevron-down" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost h-6 w-6 !p-0"
                    (click)="remove(entry.id)"
                    aria-label="Remove image"
                  >
                    <app-icon name="x" class="h-3.5 w-3.5" />
                  </button>
                </figcaption>
              </figure>
            }
          </div>

          <div>
            <span class="label">Page size</span>
            <div class="flex flex-wrap gap-2">
              @for (option of sizeOptions; track option.id) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="pageSize() === option.id"
                  (click)="pageSize.set(option.id)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          <p class="text-sm text-muted">
            {{ entries().length }} {{ entries().length === 1 ? 'image' : 'images' }} ·
            {{ formatBytes(totalSize()) }}
          </p>

          @if (error()) {
            <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              {{ error() }}
            </p>
          }

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="build()">
              <app-icon name="file-image" class="h-4 w-4" />
              {{ busy() ? 'Building…' : 'Create PDF' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">Clear all</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ImagesToPdfComponent implements OnDestroy {
  protected readonly sizeOptions = (Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => ({
    id,
    label: PAGE_SIZES[id].label,
  }));

  protected readonly entries = signal<ImageEntry[]>([]);
  protected readonly pageSize = signal<PageSizeId>('fit');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  private nextId = 0;
  private readonly toast = inject(ToastService);

  ngOnDestroy(): void {
    this.revokeAll();
  }

  protected onFiles(files: File[]): void {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      this.toast.error('Please choose image files.');
      return;
    }
    this.entries.update((current) => [
      ...current,
      ...images.map((file) => ({ id: this.nextId++, file, url: URL.createObjectURL(file) })),
    ]);
    this.error.set('');
  }

  protected totalSize(): number {
    return this.entries().reduce((sum, e) => sum + e.file.size, 0);
  }

  protected move(index: number, delta: number): void {
    this.entries.update((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  protected remove(id: number): void {
    const entry = this.entries().find((e) => e.id === id);
    if (entry) URL.revokeObjectURL(entry.url);
    this.entries.update((list) => list.filter((e) => e.id !== id));
  }

  protected async build(): Promise<void> {
    const entries = this.entries();
    if (!entries.length) return;

    this.busy.set(true);
    this.error.set('');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();

      for (const entry of entries) {
        const { bytes, type } = await this.toEmbeddable(entry.file);
        const embedded =
          type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

        const size = PAGE_SIZES[this.pageSize()];
        if (size.width === 0) {
          const page = doc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        } else {
          const page = doc.addPage([size.width, size.height]);
          // Contain the image within the page with a small margin.
          const margin = 24;
          const scale = Math.min(
            (size.width - margin * 2) / embedded.width,
            (size.height - margin * 2) / embedded.height,
          );
          const width = embedded.width * scale;
          const height = embedded.height * scale;
          page.drawImage(embedded, {
            x: (size.width - width) / 2,
            y: (size.height - height) / 2,
            width,
            height,
          });
        }
      }

      const output = await doc.save();
      downloadBlob(new Blob([output as BlobPart], { type: 'application/pdf' }), 'images.pdf');
      this.toast.success(`Created a PDF with ${entries.length} pages`);
    } catch {
      this.error.set('One of these images could not be embedded. Try converting it to PNG first.');
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * pdf-lib can embed only PNG and JPEG, so anything else (WebP, AVIF, GIF,
   * BMP) is re-encoded to PNG through a canvas first.
   */
  private async toEmbeddable(file: File): Promise<{ bytes: ArrayBuffer; type: 'image/png' | 'image/jpeg' }> {
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      return { bytes: await file.arrayBuffer(), type: file.type };
    }

    const image = await loadImage(await readAsDataUrl(file));
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0);

    const blob = await canvasToBlob(canvas, 'image/png');
    return { bytes: await blob.arrayBuffer(), type: 'image/png' };
  }

  protected reset(): void {
    this.revokeAll();
    this.entries.set([]);
    this.error.set('');
  }

  private revokeAll(): void {
    for (const entry of this.entries()) URL.revokeObjectURL(entry.url);
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

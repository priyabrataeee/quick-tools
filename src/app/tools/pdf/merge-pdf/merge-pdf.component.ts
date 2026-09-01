import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { downloadBlob, formatBytes } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

interface PdfEntry {
  id: number;
  file: File;
  pages: number | null;
}

@Component({
  selector: 'app-merge-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="merge-pdf">
      <div class="flex flex-col gap-5">
        <app-upload-zone
          accept="application/pdf,.pdf"
          [multiple]="true"
          title="Drop the PDFs you want to combine"
          hint="Add two or more files — they are merged in your browser, never uploaded"
          (filesSelected)="onFiles($event)"
        />

        @if (entries().length) {
          <ol class="flex flex-col gap-2">
            @for (entry of entries(); track entry.id; let i = $index; let first = $first; let last = $last) {
              <li class="flex items-center gap-3 rounded-xl border border-line p-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">
                  {{ i + 1 }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{{ entry.file.name }}</p>
                  <p class="text-xs text-faint">
                    {{ formatBytes(entry.file.size) }}
                    @if (entry.pages !== null) {
                      · {{ entry.pages }} {{ entry.pages === 1 ? 'page' : 'pages' }}
                    }
                  </p>
                </div>
                <button
                  type="button"
                  class="btn btn-ghost h-8 w-8 !p-0"
                  [disabled]="first"
                  (click)="move(i, -1)"
                  aria-label="Move up"
                >
                  <app-icon name="chevron-up" class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="btn btn-ghost h-8 w-8 !p-0"
                  [disabled]="last"
                  (click)="move(i, 1)"
                  aria-label="Move down"
                >
                  <app-icon name="chevron-down" class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="btn btn-ghost h-8 w-8 !p-0"
                  (click)="remove(entry.id)"
                  aria-label="Remove file"
                >
                  <app-icon name="x" class="h-4 w-4" />
                </button>
              </li>
            }
          </ol>

          <p class="text-sm text-muted">
            {{ entries().length }} files · {{ totalPages() }} pages in total
          </p>

          @if (error()) {
            <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              {{ error() }}
            </p>
          }

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="entries().length < 2 || busy()"
              (click)="merge()"
            >
              <app-icon name="file-plus" class="h-4 w-4" />
              {{ busy() ? 'Merging…' : 'Merge ' + entries().length + ' PDFs' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="reset()">Clear all</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class MergePdfComponent {
  protected readonly entries = signal<PdfEntry[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  private nextId = 0;
  private readonly toast = inject(ToastService);

  protected async onFiles(files: File[]): Promise<void> {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) {
      this.toast.error('Please choose PDF files.');
      return;
    }

    this.entries.update((current) => [
      ...current,
      ...pdfs.map((file) => ({ id: this.nextId++, file, pages: null })),
    ]);
    this.error.set('');
    void this.countPages();
  }

  /** Reads each document once up front so the page totals are shown before merging. */
  private async countPages(): Promise<void> {
    const { PDFDocument } = await import('pdf-lib');
    for (const entry of this.entries()) {
      if (entry.pages !== null) continue;
      try {
        const doc = await PDFDocument.load(await entry.file.arrayBuffer(), { ignoreEncryption: true });
        const count = doc.getPageCount();
        this.entries.update((list) =>
          list.map((e) => (e.id === entry.id ? { ...e, pages: count } : e)),
        );
      } catch {
        this.entries.update((list) => list.map((e) => (e.id === entry.id ? { ...e, pages: 0 } : e)));
      }
    }
  }

  protected totalPages(): number {
    return this.entries().reduce((sum, e) => sum + (e.pages ?? 0), 0);
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
    this.entries.update((list) => list.filter((e) => e.id !== id));
  }

  protected async merge(): Promise<void> {
    const entries = this.entries();
    if (entries.length < 2) return;

    this.busy.set(true);
    this.error.set('');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const merged = await PDFDocument.create();

      for (const entry of entries) {
        const source = await PDFDocument.load(await entry.file.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const pages = await merged.copyPages(source, source.getPageIndices());
        for (const page of pages) merged.addPage(page);
      }

      const bytes = await merged.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'merged.pdf');
      this.toast.success(`Merged ${entries.length} files into one PDF`);
    } catch {
      this.error.set(
        'One of these files could not be read. Password-protected or corrupted PDFs cannot be merged.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected reset(): void {
    this.entries.set([]);
    this.error.set('');
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

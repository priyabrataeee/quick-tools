import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { downloadBlob, formatBytes, parsePageRanges } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

@Component({
  selector: 'app-split-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="split-pdf">
      <div class="flex flex-col gap-5">
        @if (!file()) {
          <app-upload-zone
            accept="application/pdf,.pdf"
            title="Drop a PDF to split"
            hint="Extract a page range, remove pages, or burst it into single pages"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <div class="flex items-center gap-3 rounded-xl border border-line p-3">
            <app-icon name="file" class="h-5 w-5 shrink-0 text-brand" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ file()!.name }}</p>
              <p class="text-xs text-faint">
                {{ formatBytes(file()!.size) }} · {{ pageCount() }}
                {{ pageCount() === 1 ? 'page' : 'pages' }}
              </p>
            </div>
            <button type="button" class="btn btn-ghost" (click)="reset()">Change file</button>
          </div>

          <div class="flex flex-wrap gap-2">
            @for (option of modes; track option.id) {
              <button
                type="button"
                class="chip"
                [attr.aria-pressed]="mode() === option.id"
                (click)="mode.set(option.id)"
              >
                {{ option.label }}
              </button>
            }
          </div>

          @if (mode() !== 'burst') {
            <div>
              <label class="label" for="split-range">Pages</label>
              <input
                id="split-range"
                type="text"
                class="input font-mono"
                placeholder="1-3, 7, 10-12"
                [value]="range()"
                (input)="range.set($any($event.target).value)"
              />
              <p class="mt-1 text-xs text-faint">
                @if (selectedPages().length) {
                  {{ selectedPages().length }} of {{ pageCount() }} pages selected
                  @if (mode() === 'remove') {
                    for removal — {{ pageCount() - selectedPages().length }} will remain
                  }
                } @else {
                  Enter a range such as 1-3, 7, 10-12. Pages are numbered from one.
                }
              </p>
            </div>
          } @else {
            <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
              Each of the {{ pageCount() }} pages is saved as its own PDF. Your browser may ask
              permission for multiple downloads.
            </p>
          }

          @if (error()) {
            <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              {{ error() }}
            </p>
          }

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" [disabled]="!canRun() || busy()" (click)="run()">
              <app-icon name="scissors" class="h-4 w-4" />
              {{ busy() ? 'Working…' : actionLabel() }}
            </button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class SplitPdfComponent {
  protected readonly modes = [
    { id: 'extract' as const, label: 'Extract pages' },
    { id: 'remove' as const, label: 'Remove pages' },
    { id: 'burst' as const, label: 'One file per page' },
  ];

  protected readonly file = signal<File | null>(null);
  protected readonly pageCount = signal(0);
  protected readonly mode = signal<'extract' | 'remove' | 'burst'>('extract');
  protected readonly range = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  private readonly toast = inject(ToastService);

  protected readonly selectedPages = computed(() =>
    parsePageRanges(this.range(), this.pageCount()),
  );

  protected readonly canRun = computed(() => {
    if (this.mode() === 'burst') return this.pageCount() > 0;
    const selected = this.selectedPages().length;
    if (selected === 0) return false;
    // Removing every page would produce an empty document.
    return this.mode() !== 'remove' || selected < this.pageCount();
  });

  protected readonly actionLabel = computed(() => {
    switch (this.mode()) {
      case 'remove':
        return `Remove ${this.selectedPages().length} pages`;
      case 'burst':
        return `Split into ${this.pageCount()} files`;
      default:
        return `Extract ${this.selectedPages().length} pages`;
    }
  });

  protected async onFile(files: File[]): Promise<void> {
    const file = files[0];
    if (!file || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
      this.toast.error('Please choose a PDF file.');
      return;
    }

    this.error.set('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      this.file.set(file);
      this.pageCount.set(doc.getPageCount());
      this.range.set(`1-${Math.min(doc.getPageCount(), 1)}`);
    } catch {
      this.toast.error('Could not read that PDF. It may be password-protected or corrupted.');
    }
  }

  protected async run(): Promise<void> {
    const file = this.file();
    if (!file) return;

    this.busy.set(true);
    this.error.set('');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const baseName = file.name.replace(/\.pdf$/i, '');

      if (this.mode() === 'burst') {
        for (let index = 0; index < source.getPageCount(); index++) {
          const single = await PDFDocument.create();
          const [page] = await single.copyPages(source, [index]);
          single.addPage(page);
          const bytes = await single.save();
          // Stagger so the browser does not block the burst of downloads.
          setTimeout(
            () =>
              downloadBlob(
                new Blob([bytes as BlobPart], { type: 'application/pdf' }),
                `${baseName}-page-${index + 1}.pdf`,
              ),
            index * 220,
          );
        }
        this.toast.success(`Splitting into ${source.getPageCount()} files`);
        return;
      }

      const selected = new Set(this.selectedPages());
      const indices = source
        .getPageIndices()
        .filter((index) =>
          this.mode() === 'extract' ? selected.has(index + 1) : !selected.has(index + 1),
        );

      if (!indices.length) {
        this.error.set('That selection would produce an empty document.');
        return;
      }

      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, indices);
      for (const page of pages) output.addPage(page);

      const bytes = await output.save();
      const suffix = this.mode() === 'extract' ? 'extracted' : 'trimmed';
      downloadBlob(
        new Blob([bytes as BlobPart], { type: 'application/pdf' }),
        `${baseName}-${suffix}.pdf`,
      );
      this.toast.success(`Saved ${indices.length} pages`);
    } catch {
      this.error.set('Something went wrong reading this PDF.');
    } finally {
      this.busy.set(false);
    }
  }

  protected reset(): void {
    this.file.set(null);
    this.pageCount.set(0);
    this.range.set('');
    this.error.set('');
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

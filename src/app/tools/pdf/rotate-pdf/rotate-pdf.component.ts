import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { downloadBlob, formatBytes, parsePageRanges } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

@Component({
  selector: 'app-rotate-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, IconComponent],
  template: `
    <app-tool-layout toolId="rotate-pdf">
      <div class="flex flex-col gap-5">
        @if (!file()) {
          <app-upload-zone
            accept="application/pdf,.pdf"
            title="Drop a PDF to rotate"
            hint="The rotation is written into the file, so every viewer honours it"
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

          <div>
            <span class="label">Rotation</span>
            <div class="flex flex-wrap gap-2">
              @for (option of angles; track option) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="angle() === option"
                  (click)="angle.set(option)"
                >
                  {{ option }}° {{ option === 90 ? 'clockwise' : option === 270 ? 'anticlockwise' : '' }}
                </button>
              }
            </div>
          </div>

          <div class="flex h-40 items-center justify-center rounded-xl border border-line bg-bg-subtle">
            <div
              class="flex h-24 w-16 items-center justify-center rounded border border-line bg-elevated text-xs text-faint transition-transform"
              [style.transform]="'rotate(' + angle() + 'deg)'"
            >
              Page
            </div>
          </div>

          <div>
            <label class="label" for="rotate-range">Pages to rotate</label>
            <input
              id="rotate-range"
              type="text"
              class="input font-mono"
              placeholder="Leave empty for all pages"
              [value]="range()"
              (input)="range.set($any($event.target).value)"
            />
            <p class="mt-1 text-xs text-faint">
              @if (range().trim()) {
                {{ selectedPages().length }} of {{ pageCount() }} pages will be rotated.
              } @else {
                All {{ pageCount() }} pages will be rotated.
              }
            </p>
          </div>

          @if (error()) {
            <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              {{ error() }}
            </p>
          }

          <button type="button" class="btn btn-primary w-fit" [disabled]="busy()" (click)="rotate()">
            <app-icon name="rotate" class="h-4 w-4" />
            {{ busy() ? 'Rotating…' : 'Rotate and download' }}
          </button>
        }
      </div>
    </app-tool-layout>
  `,
})
export class RotatePdfComponent {
  protected readonly angles = [90, 180, 270];

  protected readonly file = signal<File | null>(null);
  protected readonly pageCount = signal(0);
  protected readonly angle = signal(90);
  protected readonly range = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  private readonly toast = inject(ToastService);

  protected readonly selectedPages = computed(() =>
    parsePageRanges(this.range(), this.pageCount()),
  );

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
    } catch {
      this.toast.error('Could not read that PDF.');
    }
  }

  protected async rotate(): Promise<void> {
    const file = this.file();
    if (!file) return;

    this.busy.set(true);
    this.error.set('');

    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });

      const selected = this.range().trim() ? new Set(this.selectedPages()) : null;

      doc.getPages().forEach((page, index) => {
        if (selected && !selected.has(index + 1)) return;
        // Add to the existing rotation rather than replacing it, so a page that
        // was already sideways ends up where the user expects.
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + this.angle()) % 360));
      });

      const bytes = await doc.save();
      downloadBlob(
        new Blob([bytes as BlobPart], { type: 'application/pdf' }),
        `${file.name.replace(/\.pdf$/i, '')}-rotated.pdf`,
      );
      this.toast.success('Rotated PDF downloaded');
    } catch {
      this.error.set('Something went wrong rotating this PDF.');
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

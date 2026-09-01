import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { formatBytes, readAsDataUrl } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

const MAX_INLINE_BYTES = 10 * 1024;

@Component({
  selector: 'app-image-to-base64',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, ResultPanelComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="image-to-base64">
      <div class="flex flex-col gap-5">
        @if (!dataUrl()) {
          <app-upload-zone
            accept="image/*"
            title="Drop an image to encode"
            hint="The file is read locally and never uploaded"
            (filesSelected)="onFile($event)"
          />
        } @else {
          <div class="flex flex-col gap-4 sm:flex-row">
            <img
              [src]="dataUrl()"
              alt="Selected image"
              class="h-32 w-32 rounded-xl border border-line bg-bg-subtle object-contain"
            />
            <div class="flex-1">
              <p class="font-medium">{{ fileName() }}</p>
              <p class="mt-1 text-sm text-muted">
                {{ formatBytes(fileSize()) }} original ·
                {{ formatBytes(encodedSize()) }} encoded
                (+{{ overhead() }}%)
              </p>
              @if (fileSize() > maxInlineBytes) {
                <p class="mt-2 rounded-lg border border-warning/40 bg-warning-soft p-2 text-xs text-warning">
                  This file is above 10 KB. Inlining assets this large usually slows a page down
                  rather than speeding it up — link to it normally instead.
                </p>
              }
              <button type="button" class="btn btn-ghost mt-3" (click)="reset()">
                Choose another image
              </button>
            </div>
          </div>

          <app-result-panel
            label="Data URL"
            [value]="dataUrl()"
            [meta]="formatBytes(encodedSize())"
            downloadName="image-base64.txt"
            placeholder="Encoded output appears here."
          />

          <section class="flex flex-col gap-3">
            <h3 class="text-sm font-semibold">Ready-made snippets</h3>
            @for (snippet of snippets(); track snippet.label) {
              <div class="overflow-hidden rounded-xl border border-line">
                <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
                  <span class="text-xs font-semibold tracking-wide text-faint uppercase">
                    {{ snippet.label }}
                  </span>
                  <app-copy-button
                    [value]="snippet.code"
                    label="Copy"
                    variant="ghost"
                    [toastMessage]="snippet.label + ' copied'"
                  />
                </div>
                <pre class="overflow-x-auto p-3 font-mono text-xs text-fg">{{ snippet.preview }}</pre>
              </div>
            }
          </section>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ImageToBase64Component {
  protected readonly maxInlineBytes = MAX_INLINE_BYTES;

  protected readonly dataUrl = signal('');
  protected readonly fileName = signal('');
  protected readonly fileSize = signal(0);

  private readonly toast = inject(ToastService);

  protected readonly encodedSize = computed(() => this.dataUrl().length);

  protected readonly overhead = computed(() => {
    const original = this.fileSize();
    if (!original) return 0;
    return Math.round(((this.encodedSize() - original) / original) * 100);
  });

  protected readonly snippets = computed(() => {
    const url = this.dataUrl();
    if (!url) return [];
    // Previews are truncated so a megabyte-long data URL does not make the page
    // unusable; the copy button always copies the complete value.
    const short = url.length > 96 ? `${url.slice(0, 96)}…` : url;
    return [
      {
        label: 'HTML',
        code: `<img src="${url}" alt="${this.fileName()}" />`,
        preview: `<img src="${short}" alt="${this.fileName()}" />`,
      },
      {
        label: 'CSS',
        code: `background-image: url('${url}');`,
        preview: `background-image: url('${short}');`,
      },
      {
        label: 'Markdown',
        code: `![${this.fileName()}](${url})`,
        preview: `![${this.fileName()}](${short})`,
      },
    ];
  });

  protected async onFile(files: File[]): Promise<void> {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      this.toast.error('Please choose an image file.');
      return;
    }
    try {
      this.dataUrl.set(await readAsDataUrl(file));
      this.fileName.set(file.name);
      this.fileSize.set(file.size);
    } catch {
      this.toast.error('Could not read that image.');
    }
  }

  protected reset(): void {
    this.dataUrl.set('');
    this.fileName.set('');
    this.fileSize.set(0);
  }

  protected formatBytes(value: number): string {
    return formatBytes(value);
  }
}

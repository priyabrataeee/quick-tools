import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { formatBytes } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
type Algorithm = (typeof ALGORITHMS)[number];

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

@Component({
  selector: 'app-hash-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, UploadZoneComponent, CopyButtonComponent, IconComponent],
  template: `
    <app-tool-layout toolId="hash-generator">
      <div class="flex flex-col gap-4">
        <div class="flex gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="source() === 'text'" (click)="source.set('text')">
            Text
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="source() === 'file'" (click)="source.set('file')">
            File
          </button>
        </div>

        @if (source() === 'text') {
          <div>
            <label class="label" for="hash-input">Text to hash</label>
            <textarea
              id="hash-input"
              class="textarea h-40"
              spellcheck="false"
              placeholder="Type or paste anything…"
              [value]="text()"
              (input)="onText($any($event.target).value)"
            ></textarea>
          </div>
        } @else {
          <app-upload-zone
            title="Drop a file to hash it"
            hint="Useful for verifying a download checksum. The file is read locally."
            (filesSelected)="onFile($event)"
          />
          @if (fileName()) {
            <p class="flex items-center gap-2 text-sm text-muted">
              <app-icon name="file" class="h-4 w-4 text-brand" />
              {{ fileName() }} · {{ fileSize() }}
            </p>
          }
        }

        @if (busy()) {
          <p class="text-sm text-muted">Hashing…</p>
        }

        @if (error()) {
          <div class="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <app-icon name="alert" class="h-4 w-4 shrink-0" />
            {{ error() }}
          </div>
        }

        @if (results().length) {
          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <tbody class="divide-y divide-line">
                @for (row of results(); track row.algorithm) {
                  <tr>
                    <td class="w-24 px-3 py-3 align-top font-semibold text-brand">{{ row.algorithm }}</td>
                    <td class="px-3 py-3 font-mono text-xs break-all text-fg">{{ row.hash }}</td>
                    <td class="w-12 px-2 py-2 text-right align-top">
                      <app-copy-button [value]="row.hash" label="" variant="ghost" [toastMessage]="row.algorithm + ' hash copied'" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <p class="rounded-xl border border-line bg-bg-subtle p-3 text-xs text-muted">
          <strong class="text-fg">Note:</strong> MD5 is not offered because the Web Crypto API
          deliberately excludes it — it has been considered broken for collision resistance since
          2004. Use SHA-256 or stronger.
        </p>
      </div>
    </app-tool-layout>
  `,
})
export class HashGeneratorComponent {
  protected readonly source = signal<'text' | 'file'>('text');
  protected readonly text = signal('');
  protected readonly fileName = signal('');
  protected readonly fileSize = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly results = signal<{ algorithm: Algorithm; hash: string }[]>([]);

  /** Guards against an earlier, slower hash overwriting a newer one. */
  private runId = 0;

  protected onText(value: string): void {
    this.text.set(value);
    this.fileName.set('');
    const bytes = new TextEncoder().encode(value);
    void this.hash(bytes.buffer as ArrayBuffer, value.length > 0);
  }

  protected async onFile(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;
    this.fileName.set(file.name);
    this.fileSize.set(formatBytes(file.size));
    this.busy.set(true);
    try {
      const buffer = await file.arrayBuffer();
      await this.hash(buffer, true);
    } catch {
      this.error.set('Could not read that file.');
      this.busy.set(false);
    }
  }

  private async hash(buffer: ArrayBuffer, hasContent: boolean): Promise<void> {
    const id = ++this.runId;
    this.error.set('');

    if (!hasContent) {
      this.results.set([]);
      this.busy.set(false);
      return;
    }

    try {
      const digests = await Promise.all(
        ALGORITHMS.map(async (algorithm) => ({
          algorithm,
          hash: toHex(await crypto.subtle.digest(algorithm, buffer)),
        })),
      );
      if (id !== this.runId) return;
      this.results.set(digests);
    } catch {
      if (id !== this.runId) return;
      this.error.set('Hashing failed. The Web Crypto API requires a secure (https) context.');
      this.results.set([]);
    } finally {
      if (id === this.runId) this.busy.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

/** UTF-8 safe Base64 encode. `btoa` alone throws on any character above U+00FF. */
function encodeBase64(text: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return urlSafe ? base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : base64;
}

function decodeBase64(input: string): string {
  const normalised = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

@Component({
  selector: 'app-base64-encoder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="base64-encoder">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="mode() === 'encode'"
            (click)="mode.set('encode')"
          >
            Encode
          </button>
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="mode() === 'decode'"
            (click)="mode.set('decode')"
          >
            Decode
          </button>

          <button type="button" class="btn btn-ghost" (click)="swap()" title="Move the result into the input">
            <app-icon name="swap" class="h-4 w-4" />
            Swap
          </button>

          @if (mode() === 'encode') {
            <label class="chip ml-auto cursor-pointer" [class.is-active]="urlSafe()">
              <input type="checkbox" class="sr-only" [checked]="urlSafe()" (change)="urlSafe.set(!urlSafe())" />
              URL-safe alphabet
            </label>
          }
        </div>

        <div>
          <label class="label" for="b64-input">
            {{ mode() === 'encode' ? 'Plain text' : 'Base64 input' }}
          </label>
          <textarea
            id="b64-input"
            class="textarea h-52"
            spellcheck="false"
            [placeholder]="mode() === 'encode' ? 'Type or paste text to encode…' : 'Paste Base64 to decode…'"
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        @if (error()) {
          <div class="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <app-icon name="alert" class="h-4 w-4 shrink-0" />
            {{ error() }}
          </div>
        }

        <app-result-panel
          [label]="mode() === 'encode' ? 'Base64 output' : 'Decoded text'"
          [value]="output()"
          [meta]="output() ? output().length + ' chars' : ''"
          [downloadName]="mode() === 'encode' ? 'encoded.txt' : 'decoded.txt'"
          placeholder="The converted value appears here."
        />
      </div>
    </app-tool-layout>
  `,
})
export class Base64EncoderComponent {
  protected readonly mode = signal<'encode' | 'decode'>('encode');
  protected readonly input = signal('');
  protected readonly urlSafe = signal(false);

  private readonly result = computed<{ value: string; error: string }>(() => {
    const text = this.input();
    if (!text.trim()) return { value: '', error: '' };

    try {
      return {
        value: this.mode() === 'encode' ? encodeBase64(text, this.urlSafe()) : decodeBase64(text),
        error: '',
      };
    } catch {
      return {
        value: '',
        error:
          this.mode() === 'decode'
            ? 'This is not valid Base64, or it does not decode to UTF-8 text.'
            : 'Could not encode this input.',
      };
    }
  });

  protected readonly output = computed(() => this.result().value);
  protected readonly error = computed(() => this.result().error);

  protected swap(): void {
    const current = this.output();
    if (!current) return;
    this.mode.update((m) => (m === 'encode' ? 'decode' : 'encode'));
    this.input.set(current);
  }
}

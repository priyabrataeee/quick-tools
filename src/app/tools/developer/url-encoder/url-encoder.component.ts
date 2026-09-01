import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

type Mode = 'encode' | 'decode';
type Scope = 'component' | 'uri';

@Component({
  selector: 'app-url-encoder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="url-encoder">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'encode'" (click)="mode.set('encode')">
            Encode
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'decode'" (click)="mode.set('decode')">
            Decode
          </button>

          <span class="mx-2 h-5 w-px bg-line"></span>

          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="scope() === 'component'"
            (click)="scope.set('component')"
            title="Escapes reserved characters — use for a single query value"
          >
            Component
          </button>
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="scope() === 'uri'"
            (click)="scope.set('uri')"
            title="Keeps the URL structure intact"
          >
            Whole URL
          </button>

          <button type="button" class="btn btn-ghost ml-auto" (click)="swap()">
            <app-icon name="swap" class="h-4 w-4" />
            Swap
          </button>
        </div>

        <div>
          <label class="label" for="url-input">
            {{ mode() === 'encode' ? 'Text or URL' : 'Encoded value' }}
          </label>
          <textarea
            id="url-input"
            class="textarea h-40"
            spellcheck="false"
            placeholder="https://example.com/search?q=hello world&lang=en"
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
          [label]="mode() === 'encode' ? 'Encoded' : 'Decoded'"
          [value]="output()"
          downloadName="url.txt"
          placeholder="The converted value appears here."
        />

        @if (queryParams().length) {
          <section class="overflow-hidden rounded-xl border border-line">
            <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
              Query parameters
            </h3>
            <table class="w-full text-sm">
              <tbody class="divide-y divide-line">
                @for (param of queryParams(); track $index) {
                  <tr>
                    <td class="w-1/3 px-3 py-2 font-mono break-all text-brand">{{ param.key }}</td>
                    <td class="px-3 py-2 break-all text-fg">{{ param.value }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      </div>
    </app-tool-layout>
  `,
})
export class UrlEncoderComponent {
  protected readonly mode = signal<Mode>('encode');
  protected readonly scope = signal<Scope>('component');
  protected readonly input = signal('');

  private readonly result = computed<{ value: string; error: string }>(() => {
    const text = this.input();
    if (!text.trim()) return { value: '', error: '' };

    try {
      if (this.mode() === 'encode') {
        return {
          value: this.scope() === 'component' ? encodeURIComponent(text) : encodeURI(text),
          error: '',
        };
      }
      // `+` means a space in form-encoded values; decode it before unescaping.
      const prepared = text.replace(/\+/g, ' ');
      return {
        value: this.scope() === 'component' ? decodeURIComponent(prepared) : decodeURI(prepared),
        error: '',
      };
    } catch {
      return {
        value: '',
        error: 'This value contains a malformed percent-escape sequence and cannot be decoded.',
      };
    }
  });

  protected readonly output = computed(() => this.result().value);
  protected readonly error = computed(() => this.result().error);

  /** Breaks a decoded URL into its query parameters, when it looks like a URL. */
  protected readonly queryParams = computed(() => {
    const candidate = this.mode() === 'decode' ? this.output() : this.input();
    const queryStart = candidate.indexOf('?');
    if (queryStart === -1) return [];
    try {
      const params = new URLSearchParams(candidate.slice(queryStart + 1));
      return Array.from(params.entries()).map(([key, value]) => ({ key, value }));
    } catch {
      return [];
    }
  });

  protected swap(): void {
    const current = this.output();
    if (!current) return;
    this.mode.update((m) => (m === 'encode' ? 'decode' : 'encode'));
    this.input.set(current);
  }
}

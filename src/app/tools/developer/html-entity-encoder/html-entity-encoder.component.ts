import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

const BASIC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

@Component({
  selector: 'app-html-entity-encoder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="html-entity-encoder">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'encode'" (click)="mode.set('encode')">
            Encode
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'decode'" (click)="mode.set('decode')">
            Decode
          </button>

          @if (mode() === 'encode') {
            <label class="chip cursor-pointer" [class.is-active]="full()">
              <input type="checkbox" class="sr-only" [checked]="full()" (change)="full.set(!full())" />
              Escape all non-ASCII
            </label>
          }

          <button type="button" class="btn btn-ghost ml-auto" (click)="swap()">
            <app-icon name="swap" class="h-4 w-4" />
            Swap
          </button>
        </div>

        <div>
          <label class="label" for="ent-input">
            {{ mode() === 'encode' ? 'Text or markup' : 'Text containing entities' }}
          </label>
          <textarea
            id="ent-input"
            class="textarea h-48"
            spellcheck="false"
            placeholder="&lt;p class=&quot;lead&quot;&gt;Tom &amp; Jerry&lt;/p&gt;"
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        <app-result-panel
          [label]="mode() === 'encode' ? 'Escaped output' : 'Decoded text'"
          [value]="output()"
          downloadName="entities.txt"
          placeholder="The converted value appears here."
        />

        <div class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Common entities
          </h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of reference; track row.entity) {
                <tr>
                  <td class="w-16 px-3 py-2 text-center text-lg">{{ row.char }}</td>
                  <td class="px-3 py-2 font-mono text-brand">{{ row.entity }}</td>
                  <td class="px-3 py-2 text-muted">{{ row.name }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class HtmlEntityEncoderComponent {
  private readonly document = inject(DOCUMENT);

  protected readonly mode = signal<'encode' | 'decode'>('encode');
  protected readonly input = signal('');
  protected readonly full = signal(false);

  protected readonly reference = [
    { char: '&', entity: '&amp;', name: 'Ampersand' },
    { char: '<', entity: '&lt;', name: 'Less than' },
    { char: '>', entity: '&gt;', name: 'Greater than' },
    { char: '"', entity: '&quot;', name: 'Double quote' },
    { char: ' ', entity: '&nbsp;', name: 'Non-breaking space' },
    { char: '©', entity: '&copy;', name: 'Copyright' },
    { char: '—', entity: '&mdash;', name: 'Em dash' },
    { char: '€', entity: '&euro;', name: 'Euro sign' },
  ];

  protected readonly output = computed(() => {
    const text = this.input();
    if (!text) return '';
    return this.mode() === 'encode' ? this.encode(text) : this.decode(text);
  });

  private encode(text: string): string {
    const escaped = text.replace(/[&<>"']/g, (c) => BASIC[c]);
    if (!this.full()) return escaped;
    // Iterate by code point so astral characters produce one entity, not two.
    return Array.from(escaped)
      .map((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        return code > 127 ? `&#${code};` : ch;
      })
      .join('');
  }

  /**
   * Decoding uses the browser's own HTML parser via a detached textarea, which
   * is the only practical way to resolve the full named-entity table. Reading
   * `value` (never `innerHTML`) means no markup is ever executed.
   */
  private decode(text: string): string {
    const area = this.document.createElement('textarea');
    area.innerHTML = text;
    return area.value;
  }

  protected swap(): void {
    const current = this.output();
    if (!current) return;
    this.mode.update((m) => (m === 'encode' ? 'decode' : 'encode'));
    this.input.set(current);
  }
}

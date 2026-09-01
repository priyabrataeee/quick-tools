import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { formatXml, minifyXml } from '../lib/xml-format';

const SAMPLE =
  '<?xml version="1.0" encoding="UTF-8"?><catalog><book id="1"><title>Refactoring</title><author>Fowler</author><price currency="GBP">32.99</price></book><book id="2"><title>The Pragmatic Programmer</title><author>Hunt</author></book></catalog>';

@Component({
  selector: 'app-xml-formatter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="xml-formatter">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'format'" (click)="mode.set('format')">
            Format
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'minify'" (click)="mode.set('minify')">
            Minify
          </button>

          @if (mode() === 'format') {
            <span class="mx-2 h-5 w-px bg-line"></span>
            @for (size of [2, 4]; track size) {
              <button type="button" class="chip" [attr.aria-pressed]="indent() === size" (click)="indent.set(size)">
                {{ size }} spaces
              </button>
            }
          }

          <div class="ml-auto flex gap-2">
            <button type="button" class="btn btn-ghost" (click)="input.set(sample)">Load sample</button>
            <button type="button" class="btn btn-danger" (click)="input.set('')" [disabled]="!input()">
              Clear
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm">
            <p class="flex items-center gap-2 font-medium text-danger">
              <app-icon name="alert" class="h-4 w-4" />
              Not well-formed XML
            </p>
            <p class="mt-1 break-words text-muted">{{ error() }}</p>
          </div>
        }

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="xml-input">XML document</label>
            <textarea
              id="xml-input"
              class="textarea h-[420px]"
              spellcheck="false"
              placeholder="Paste XML, SVG, RSS or a SOAP envelope…"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
          </div>

          <app-result-panel
            [label]="mode() === 'format' ? 'Formatted XML' : 'Minified XML'"
            [value]="output()"
            downloadName="document.xml"
            mimeType="application/xml"
            placeholder="Paste a document on the left."
          />
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class XmlFormatterComponent {
  protected readonly sample = SAMPLE;
  protected readonly input = signal('');
  protected readonly mode = signal<'format' | 'minify'>('format');
  protected readonly indent = signal(2);

  private readonly result = computed(() => {
    const xml = this.input().trim();
    if (!xml) return { output: '' };
    return this.mode() === 'format' ? formatXml(xml, this.indent()) : minifyXml(xml);
  });

  protected readonly output = computed(() => this.result().output);
  protected readonly error = computed(() => this.result().error ?? '');
}

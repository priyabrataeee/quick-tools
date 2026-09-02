import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { byteLength } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { jsonStats, parseJson, sortKeysDeep } from '../lib/json.util';

const SAMPLE = `{"name":"OnDevice Tools","private":true,"tools":[{"id":"json-formatter","tags":["json","format"]}],"version":2}`;

@Component({
  selector: 'app-json-formatter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="json-formatter">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn btn-primary" (click)="indent.set(2)" [disabled]="indent() === 2">
            2 spaces
          </button>
          <button type="button" class="btn btn-secondary" (click)="indent.set(4)" [disabled]="indent() === 4">
            4 spaces
          </button>
          <button type="button" class="btn btn-secondary" (click)="indent.set(0)" [disabled]="indent() === 0">
            Minify
          </button>

          <label class="chip ml-1 cursor-pointer" [class.is-active]="sortKeys()">
            <input type="checkbox" class="sr-only" [checked]="sortKeys()" (change)="toggleSort()" />
            Sort keys
          </label>

          <div class="ml-auto flex gap-2">
            <button type="button" class="btn btn-ghost" (click)="loadSample()">Load sample</button>
            <button type="button" class="btn btn-danger" (click)="clear()" [disabled]="!input()">
              Clear
            </button>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="json-input">JSON input</label>
            <textarea
              id="json-input"
              class="textarea h-[420px]"
              placeholder="Paste your JSON here…"
              spellcheck="false"
              [value]="input()"
              (input)="onInput($event)"
            ></textarea>
            <p class="mt-1 text-xs text-faint">{{ inputSize() }} · {{ lineCount() }} lines</p>
          </div>

          <div class="flex flex-col gap-3">
            @if (error(); as err) {
              <div class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm">
                <p class="flex items-center gap-2 font-medium text-danger">
                  <app-icon name="alert" class="h-4 w-4" />
                  Invalid JSON
                  @if (err.line) {
                    <span class="font-normal">— line {{ err.line }}, column {{ err.column }}</span>
                  }
                </p>
                <p class="mt-1 text-muted">{{ err.message }}</p>
                @if (err.excerpt) {
                  <pre class="mt-2 overflow-x-auto rounded-lg bg-bg-subtle p-2 font-mono text-xs text-muted">{{ err.excerpt }}</pre>
                }
              </div>
            } @else if (output()) {
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                @for (stat of statCards(); track stat.label) {
                  <div class="rounded-xl border border-line bg-bg-subtle p-3 text-center">
                    <p class="text-lg font-bold text-brand">{{ stat.value }}</p>
                    <p class="text-[11px] tracking-wide text-faint uppercase">{{ stat.label }}</p>
                  </div>
                }
              </div>
            }

            <app-result-panel
              label="Formatted JSON"
              [value]="output()"
              [meta]="output() ? outputSize() : ''"
              downloadName="formatted.json"
              mimeType="application/json"
              placeholder="Paste valid JSON on the left to see it formatted here."
            />
          </div>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class JsonFormatterComponent {
  protected readonly input = signal('');
  protected readonly indent = signal(2);
  protected readonly sortKeys = signal(false);

  private readonly parsed = computed(() => {
    const text = this.input().trim();
    if (!text) return null;
    return parseJson(text);
  });

  protected readonly error = computed(() => {
    const result = this.parsed();
    return result && 'error' in result ? result.error : null;
  });

  protected readonly output = computed(() => {
    const result = this.parsed();
    if (!result || 'error' in result) return '';
    const value = this.sortKeys() ? sortKeysDeep(result.value) : result.value;
    return JSON.stringify(value, null, this.indent());
  });

  protected readonly statCards = computed(() => {
    const result = this.parsed();
    if (!result || 'error' in result) return [];
    const stats = jsonStats(result.value);
    return [
      { label: 'Keys', value: stats.keys },
      { label: 'Objects', value: stats.objects },
      { label: 'Arrays', value: stats.arrays },
      { label: 'Depth', value: stats.depth },
    ];
  });

  protected readonly inputSize = computed(() => byteLength(this.input()));
  protected readonly outputSize = computed(() => byteLength(this.output()));
  protected readonly lineCount = computed(() => (this.input() ? this.input().split('\n').length : 0));

  protected onInput(event: Event): void {
    this.input.set((event.target as HTMLTextAreaElement).value);
  }

  protected toggleSort(): void {
    this.sortKeys.update((v) => !v);
  }

  protected loadSample(): void {
    this.input.set(SAMPLE);
  }

  protected clear(): void {
    this.input.set('');
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { formatBytes } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { parseJson } from '../lib/json.util';

@Component({
  selector: 'app-json-minifier',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="json-minifier">
      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <label class="label" for="jm-input">Formatted JSON</label>
          <textarea
            id="jm-input"
            class="textarea h-[380px]"
            placeholder="Paste indented JSON here…"
            spellcheck="false"
            [value]="input()"
            (input)="onInput($event)"
          ></textarea>
        </div>

        <div class="flex flex-col gap-3">
          @if (error(); as err) {
            <div class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm">
              <p class="flex items-center gap-2 font-medium text-danger">
                <app-icon name="alert" class="h-4 w-4" /> Invalid JSON
              </p>
              <p class="mt-1 text-muted">{{ err.message }}</p>
            </div>
          } @else if (output()) {
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-xl border border-line bg-bg-subtle p-3 text-center">
                <p class="text-lg font-bold text-fg">{{ originalSize() }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">Before</p>
              </div>
              <div class="rounded-xl border border-line bg-bg-subtle p-3 text-center">
                <p class="text-lg font-bold text-fg">{{ minifiedSize() }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">After</p>
              </div>
              <div class="rounded-xl border border-success/40 bg-success-soft p-3 text-center">
                <p class="text-lg font-bold text-success">{{ savedPercent() }}%</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">Saved</p>
              </div>
            </div>
          }

          <app-result-panel
            label="Minified JSON"
            [value]="output()"
            downloadName="minified.json"
            mimeType="application/json"
            placeholder="The compact version appears here."
          />
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class JsonMinifierComponent {
  protected readonly input = signal('');

  private readonly parsed = computed(() => {
    const text = this.input().trim();
    return text ? parseJson(text) : null;
  });

  protected readonly error = computed(() => {
    const result = this.parsed();
    return result && 'error' in result ? result.error : null;
  });

  protected readonly output = computed(() => {
    const result = this.parsed();
    if (!result || 'error' in result) return '';
    return JSON.stringify(result.value);
  });

  private readonly originalBytes = computed(() => new TextEncoder().encode(this.input()).length);
  private readonly minifiedBytes = computed(() => new TextEncoder().encode(this.output()).length);

  protected readonly originalSize = computed(() => formatBytes(this.originalBytes()));
  protected readonly minifiedSize = computed(() => formatBytes(this.minifiedBytes()));

  protected readonly savedPercent = computed(() => {
    const before = this.originalBytes();
    if (!before) return '0';
    const saved = ((before - this.minifiedBytes()) / before) * 100;
    return saved.toFixed(1);
  });

  protected onInput(event: Event): void {
    this.input.set((event.target as HTMLTextAreaElement).value);
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { byteLength } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { jsonStats, parseJson } from '../lib/json.util';

@Component({
  selector: 'app-json-validator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent],
  template: `
    <app-tool-layout toolId="json-validator">
      <div class="flex flex-col gap-4">
        <div>
          <label class="label" for="jv-input">JSON to validate</label>
          <textarea
            id="jv-input"
            class="textarea h-[360px]"
            placeholder="Paste JSON here — validation runs as you type."
            spellcheck="false"
            [value]="input()"
            (input)="onInput($event)"
          ></textarea>
        </div>

        @if (!input().trim()) {
          <p class="rounded-xl border border-line bg-bg-subtle p-4 text-sm text-muted">
            Paste a document above. Nothing is sent anywhere — validation uses your browser's own
            JSON parser.
          </p>
        } @else if (error(); as err) {
          <div class="rounded-xl border border-danger/40 bg-danger-soft p-4">
            <p class="flex items-center gap-2 text-base font-semibold text-danger">
              <app-icon name="alert" class="h-5 w-5" />
              Invalid JSON
            </p>
            @if (err.line) {
              <p class="mt-1 text-sm text-muted">
                First problem at <strong class="text-fg">line {{ err.line }}, column {{ err.column }}</strong>
              </p>
            }
            <p class="mt-2 font-mono text-sm break-words text-muted">{{ err.message }}</p>
            @if (err.excerpt) {
              <pre class="mt-3 overflow-x-auto rounded-lg bg-bg-subtle p-3 font-mono text-xs text-fg">{{ err.excerpt }}</pre>
            }
            <ul class="mt-3 list-disc pl-5 text-sm text-muted">
              <li>Trailing commas are not allowed in JSON.</li>
              <li>Strings and keys must use double quotes.</li>
              <li>Comments are not part of the JSON specification.</li>
            </ul>
          </div>
        } @else {
          <div class="rounded-xl border border-success/40 bg-success-soft p-4">
            <p class="flex items-center gap-2 text-base font-semibold text-success">
              <app-icon name="check-circle" class="h-5 w-5" />
              Valid JSON
            </p>
            <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              @for (stat of stats(); track stat.label) {
                <div class="rounded-lg border border-line bg-bg p-3 text-center">
                  <p class="text-lg font-bold text-fg">{{ stat.value }}</p>
                  <p class="text-[11px] tracking-wide text-faint uppercase">{{ stat.label }}</p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class JsonValidatorComponent {
  protected readonly input = signal('');

  private readonly parsed = computed(() => {
    const text = this.input().trim();
    return text ? parseJson(text) : null;
  });

  protected readonly error = computed(() => {
    const result = this.parsed();
    return result && 'error' in result ? result.error : null;
  });

  protected readonly stats = computed(() => {
    const result = this.parsed();
    if (!result || 'error' in result) return [];
    const s = jsonStats(result.value);
    return [
      { label: 'Size', value: byteLength(this.input()) },
      { label: 'Keys', value: String(s.keys) },
      { label: 'Objects', value: String(s.objects) },
      { label: 'Arrays', value: String(s.arrays) },
      { label: 'Max depth', value: String(s.depth) },
    ];
  });

  protected onInput(event: Event): void {
    this.input.set((event.target as HTMLTextAreaElement).value);
  }
}

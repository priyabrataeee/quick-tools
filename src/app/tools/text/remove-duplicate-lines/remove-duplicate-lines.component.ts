import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-remove-duplicate-lines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent],
  template: `
    <app-tool-layout toolId="remove-duplicate-lines">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'unique'" (click)="mode.set('unique')">
            Keep unique lines
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'duplicates'" (click)="mode.set('duplicates')">
            Show only duplicates
          </button>

          <span class="mx-1 h-5 w-px bg-line"></span>

          <label class="chip cursor-pointer" [class.is-active]="ignoreCase()">
            <input type="checkbox" class="sr-only" [checked]="ignoreCase()" (change)="ignoreCase.set(!ignoreCase())" />
            Ignore case
          </label>
          <label class="chip cursor-pointer" [class.is-active]="trimLines()">
            <input type="checkbox" class="sr-only" [checked]="trimLines()" (change)="trimLines.set(!trimLines())" />
            Ignore surrounding spaces
          </label>
          <label class="chip cursor-pointer" [class.is-active]="dropEmpty()">
            <input type="checkbox" class="sr-only" [checked]="dropEmpty()" (change)="dropEmpty.set(!dropEmpty())" />
            Remove blank lines
          </label>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="dedupe-input">Input ({{ inputCount() }} lines)</label>
            <textarea
              id="dedupe-input"
              class="textarea h-[380px]"
              spellcheck="false"
              placeholder="One item per line…"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
          </div>

          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-xl border border-line bg-bg-subtle p-3 text-center">
                <p class="text-lg font-bold">{{ inputCount() }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">In</p>
              </div>
              <div class="rounded-xl border border-line bg-bg-subtle p-3 text-center">
                <p class="text-lg font-bold">{{ outputCount() }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">Out</p>
              </div>
              <div class="rounded-xl border border-brand/30 bg-brand-soft p-3 text-center">
                <p class="text-lg font-bold text-brand">{{ removedCount() }}</p>
                <p class="text-[11px] tracking-wide text-faint uppercase">Removed</p>
              </div>
            </div>

            <app-result-panel
              [label]="mode() === 'unique' ? 'Unique lines' : 'Duplicated lines'"
              [value]="output()"
              downloadName="lines.txt"
              placeholder="Paste some lines on the left."
            />
          </div>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class RemoveDuplicateLinesComponent {
  protected readonly input = signal('');
  protected readonly mode = signal<'unique' | 'duplicates'>('unique');
  protected readonly ignoreCase = signal(false);
  protected readonly trimLines = signal(true);
  protected readonly dropEmpty = signal(false);

  private readonly lines = computed(() => (this.input() ? this.input().split('\n') : []));

  protected readonly inputCount = computed(() => this.lines().length);

  protected readonly output = computed(() => {
    const source = this.lines();
    if (!source.length) return '';

    const key = (line: string) => {
      let k = this.trimLines() ? line.trim() : line;
      if (this.ignoreCase()) k = k.toLowerCase();
      return k;
    };

    const counts = new Map<string, number>();
    for (const line of source) {
      if (this.dropEmpty() && !line.trim()) continue;
      const k = key(line);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const line of source) {
      if (this.dropEmpty() && !line.trim()) continue;
      const k = key(line);

      if (this.mode() === 'unique') {
        if (seen.has(k)) continue;
        seen.add(k);
        result.push(line);
      } else {
        if ((counts.get(k) ?? 0) < 2 || seen.has(k)) continue;
        seen.add(k);
        result.push(`${line}  (${counts.get(k)}×)`);
      }
    }

    return result.join('\n');
  });

  protected readonly outputCount = computed(() => {
    const out = this.output();
    return out ? out.split('\n').length : 0;
  });

  protected readonly removedCount = computed(() =>
    Math.max(0, this.inputCount() - this.outputCount()),
  );
}

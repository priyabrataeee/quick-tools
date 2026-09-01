import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-remove-extra-spaces',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent],
  template: `
    <app-tool-layout toolId="remove-extra-spaces">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          @for (option of options; track option.key) {
            <label class="chip cursor-pointer" [class.is-active]="flags()[option.key]">
              <input
                type="checkbox"
                class="sr-only"
                [checked]="flags()[option.key]"
                (change)="toggle(option.key)"
              />
              {{ option.label }}
            </label>
          }
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="spaces-input">Messy text</label>
            <textarea
              id="spaces-input"
              class="textarea h-[340px]"
              spellcheck="false"
              placeholder="Paste text copied from a PDF or web page…"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
            <p class="mt-1 text-xs text-faint">{{ input().length }} characters</p>
          </div>

          <div class="flex flex-col gap-3">
            <app-result-panel
              label="Cleaned text"
              [value]="output()"
              [meta]="output() ? output().length + ' chars' : ''"
              downloadName="cleaned.txt"
              placeholder="The cleaned version appears here."
            />
            @if (input() && output()) {
              <p class="rounded-xl border border-success/40 bg-success-soft p-3 text-sm text-success">
                Removed {{ input().length - output().length }} characters of whitespace clutter.
              </p>
            }
          </div>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class RemoveExtraSpacesComponent {
  protected readonly options = [
    { key: 'collapseSpaces', label: 'Collapse repeated spaces' },
    { key: 'trimLines', label: 'Trim each line' },
    { key: 'tabsToSpaces', label: 'Convert tabs to spaces' },
    { key: 'collapseBlankLines', label: 'Collapse blank lines' },
    { key: 'normaliseInvisible', label: 'Normalise invisible characters' },
    { key: 'singleLine', label: 'Join into one line' },
  ] as const;

  protected readonly input = signal('');
  protected readonly flags = signal<Record<string, boolean>>({
    collapseSpaces: true,
    trimLines: true,
    tabsToSpaces: true,
    collapseBlankLines: true,
    normaliseInvisible: true,
    singleLine: false,
  });

  protected readonly output = computed(() => {
    let text = this.input();
    if (!text) return '';
    const flags = this.flags();

    if (flags['normaliseInvisible']) {
      // Non-breaking and other exotic spaces become ordinary spaces; zero-width
      // characters and the BOM are removed entirely.
      text = text
        .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
        .replace(/[\u200b-\u200d\u2060\ufeff]/g, '');
    }
    if (flags['tabsToSpaces']) text = text.replace(/\t/g, '  ');
    if (flags['collapseSpaces']) text = text.replace(/[^\S\n]{2,}/g, ' ');
    if (flags['trimLines']) {
      text = text
        .split('\n')
        .map((line) => line.trim())
        .join('\n');
    }
    if (flags['collapseBlankLines']) text = text.replace(/\n{3,}/g, '\n\n');
    if (flags['singleLine']) text = text.replace(/\s+/g, ' ').trim();

    return text;
  });

  protected toggle(key: string): void {
    this.flags.update((current) => ({ ...current, [key]: !current[key] }));
  }
}

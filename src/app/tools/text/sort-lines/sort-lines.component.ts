import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

type SortMode = 'alpha' | 'natural' | 'numeric' | 'length' | 'shuffle';

@Component({
  selector: 'app-sort-lines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent],
  template: `
    <app-tool-layout toolId="sort-lines">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          @for (option of modes; track option.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="mode() === option.id"
              (click)="setMode(option.id)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        <div class="flex flex-wrap gap-2">
          @if (mode() !== 'shuffle') {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="descending()"
              (click)="descending.set(!descending())"
            >
              {{ descending() ? 'Descending' : 'Ascending' }}
            </button>
          }
          <label class="chip cursor-pointer" [class.is-active]="caseSensitive()">
            <input type="checkbox" class="sr-only" [checked]="caseSensitive()" (change)="caseSensitive.set(!caseSensitive())" />
            Case sensitive
          </label>
          <label class="chip cursor-pointer" [class.is-active]="dropEmpty()">
            <input type="checkbox" class="sr-only" [checked]="dropEmpty()" (change)="dropEmpty.set(!dropEmpty())" />
            Remove blank lines
          </label>
          @if (mode() === 'shuffle') {
            <button type="button" class="btn btn-secondary" (click)="reshuffle()">Shuffle again</button>
          }
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="sort-input">Input ({{ count() }} lines)</label>
            <textarea
              id="sort-input"
              class="textarea h-[380px]"
              spellcheck="false"
              placeholder="One item per line…"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
          </div>

          <app-result-panel
            label="Sorted lines"
            [value]="output()"
            downloadName="sorted.txt"
            placeholder="Paste some lines on the left."
          />
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class SortLinesComponent {
  protected readonly modes: { id: SortMode; label: string }[] = [
    { id: 'alpha', label: 'Alphabetical' },
    { id: 'natural', label: 'Natural (item2 < item10)' },
    { id: 'numeric', label: 'Numeric' },
    { id: 'length', label: 'By length' },
    { id: 'shuffle', label: 'Random' },
  ];

  protected readonly input = signal('');
  protected readonly mode = signal<SortMode>('alpha');
  protected readonly descending = signal(false);
  protected readonly caseSensitive = signal(false);
  protected readonly dropEmpty = signal(true);
  /** Bumped to force a fresh shuffle without changing any other input. */
  private readonly shuffleSeed = signal(0);

  private readonly lines = computed(() => {
    const raw = this.input() ? this.input().split('\n') : [];
    return this.dropEmpty() ? raw.filter((l) => l.trim()) : raw;
  });

  protected readonly count = computed(() => this.lines().length);

  protected readonly output = computed(() => {
    const lines = [...this.lines()];
    if (!lines.length) return '';

    if (this.mode() === 'shuffle') {
      this.shuffleSeed();
      // Fisher–Yates, so every ordering is equally likely.
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      return lines.join('\n');
    }

    const collator = new Intl.Collator(undefined, {
      numeric: this.mode() === 'natural',
      sensitivity: this.caseSensitive() ? 'variant' : 'base',
    });

    lines.sort((a, b) => {
      switch (this.mode()) {
        case 'numeric': {
          const na = parseFloat(a);
          const nb = parseFloat(b);
          const aValid = Number.isFinite(na);
          const bValid = Number.isFinite(nb);
          // Lines without a leading number sort to the end, in text order.
          if (!aValid && !bValid) return collator.compare(a, b);
          if (!aValid) return 1;
          if (!bValid) return -1;
          return na - nb;
        }
        case 'length':
          return a.length - b.length || collator.compare(a, b);
        default:
          return collator.compare(a, b);
      }
    });

    if (this.descending()) lines.reverse();
    return lines.join('\n');
  });

  protected setMode(mode: SortMode): void {
    this.mode.set(mode);
    if (mode === 'shuffle') this.reshuffle();
  }

  protected reshuffle(): void {
    this.shuffleSeed.update((v) => v + 1);
  }
}

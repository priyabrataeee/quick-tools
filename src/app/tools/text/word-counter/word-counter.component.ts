import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { analyseText, formatDuration } from '../lib/text.util';

@Component({
  selector: 'app-word-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="word-counter">
      <div class="flex flex-col gap-5">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          @for (card of headline(); track card.label) {
            <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
              <p class="text-3xl font-bold text-brand">{{ card.value }}</p>
              <p class="mt-1 text-[11px] font-medium tracking-wider text-faint uppercase">
                {{ card.label }}
              </p>
            </div>
          }
        </div>

        <div>
          <label class="label" for="wc-input">Your text</label>
          <textarea
            id="wc-input"
            class="textarea h-80 !font-sans !text-base"
            placeholder="Type or paste your text here — counting happens as you type."
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-danger" (click)="input.set('')" [disabled]="!input()">
            Clear text
          </button>
        </div>

        <div class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Detailed breakdown
          </h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of details(); track row.label) {
                <tr>
                  <td class="px-3 py-2 text-muted">{{ row.label }}</td>
                  <td class="px-3 py-2 text-right font-medium text-fg">{{ row.value }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class WordCounterComponent {
  protected readonly input = signal('');

  private readonly stats = computed(() => analyseText(this.input()));

  protected readonly headline = computed(() => {
    const s = this.stats();
    return [
      { label: 'Words', value: s.words.toLocaleString() },
      { label: 'Characters', value: s.characters.toLocaleString() },
      { label: 'Sentences', value: s.sentences.toLocaleString() },
      { label: 'Read time', value: formatDuration(s.readingMinutes) },
    ];
  });

  protected readonly details = computed(() => {
    const s = this.stats();
    return [
      { label: 'Characters (no spaces)', value: s.charactersNoSpaces.toLocaleString() },
      { label: 'Paragraphs', value: s.paragraphs.toLocaleString() },
      { label: 'Lines', value: s.lines.toLocaleString() },
      { label: 'Unique words', value: s.uniqueWords.toLocaleString() },
      { label: 'Longest word', value: s.longestWord || '—' },
      {
        label: 'Average word length',
        value: s.words ? `${(s.charactersNoSpaces / s.words).toFixed(1)} characters` : '—',
      },
      {
        label: 'Average sentence length',
        value: s.sentences ? `${(s.words / s.sentences).toFixed(1)} words` : '—',
      },
      { label: 'Speaking time (150 wpm)', value: formatDuration(s.speakingMinutes) },
    ];
  });
}

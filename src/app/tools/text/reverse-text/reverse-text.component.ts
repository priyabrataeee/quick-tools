import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { reverseGraphemes } from '../lib/text.util';

type Mode = 'characters' | 'words' | 'lines';

@Component({
  selector: 'app-reverse-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent],
  template: `
    <app-tool-layout toolId="reverse-text">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          @for (option of modes; track option.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="mode() === option.id"
              (click)="mode.set(option.id)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
          {{ hint() }}
        </p>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="rev-input">Input</label>
            <textarea
              id="rev-input"
              class="textarea h-64 !font-sans !text-base"
              placeholder="Type or paste text to reverse…"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
          </div>

          <app-result-panel
            label="Reversed"
            [value]="output()"
            downloadName="reversed.txt"
            placeholder="The reversed text appears here."
          />
        </div>

        @if (isPalindrome()) {
          <p class="rounded-xl border border-success/40 bg-success-soft p-3 text-sm text-success">
            This text is a palindrome — it reads the same in both directions, ignoring case,
            spacing and punctuation.
          </p>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ReverseTextComponent {
  protected readonly modes: { id: Mode; label: string }[] = [
    { id: 'characters', label: 'Reverse characters' },
    { id: 'words', label: 'Reverse word order' },
    { id: 'lines', label: 'Reverse line order' },
  ];

  protected readonly input = signal('');
  protected readonly mode = signal<Mode>('characters');

  protected readonly hint = computed(() => {
    switch (this.mode()) {
      case 'words':
        return 'Each word stays intact; only their order is reversed.';
      case 'lines':
        return 'Each line stays intact; only the order of lines is reversed.';
      default:
        return 'Every character is reversed. Emoji and accented characters stay in one piece.';
    }
  });

  protected readonly output = computed(() => {
    const text = this.input();
    if (!text) return '';

    switch (this.mode()) {
      case 'words':
        return text
          .split('\n')
          .map((line) => line.split(/\s+/).filter(Boolean).reverse().join(' '))
          .join('\n');
      case 'lines':
        return text.split('\n').reverse().join('\n');
      default:
        return reverseGraphemes(text);
    }
  });

  protected readonly isPalindrome = computed(() => {
    const normalised = this.input()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '');
    return normalised.length > 2 && normalised === reverseGraphemes(normalised);
  });
}

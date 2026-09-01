import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { slugify } from '../lib/text.util';

@Component({
  selector: 'app-slug-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="slug-generator">
      <div class="flex flex-col gap-5">
        <div>
          <label class="label" for="slug-input">Title or heading (one per line)</label>
          <textarea
            id="slug-input"
            class="textarea h-32 !font-sans !text-base"
            placeholder="10 Café Recipes You'll Actually Make!"
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted">Separator</span>
          @for (option of separators; track option.value) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="separator() === option.value"
              (click)="separator.set(option.value)"
            >
              {{ option.label }}
            </button>
          }

          <span class="mx-1 h-5 w-px bg-line"></span>

          <label class="chip cursor-pointer" [class.is-active]="lowercase()">
            <input type="checkbox" class="sr-only" [checked]="lowercase()" (change)="lowercase.set(!lowercase())" />
            Lowercase
          </label>
          <label class="chip cursor-pointer" [class.is-active]="removeStopWords()">
            <input
              type="checkbox"
              class="sr-only"
              [checked]="removeStopWords()"
              (change)="removeStopWords.set(!removeStopWords())"
            />
            Drop stop words
          </label>
        </div>

        <div class="max-w-xs">
          <label class="label" for="slug-max">
            Maximum length: {{ maxLength() === 0 ? 'unlimited' : maxLength() }}
          </label>
          <input
            id="slug-max"
            type="range"
            min="0"
            max="120"
            step="5"
            class="w-full"
            [value]="maxLength()"
            (input)="maxLength.set(+$any($event.target).value)"
          />
        </div>

        @if (slugs().length) {
          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <tbody class="divide-y divide-line">
                @for (slug of slugs(); track $index) {
                  <tr>
                    <td class="px-3 py-3 font-mono break-all text-brand">{{ slug || '—' }}</td>
                    <td class="w-16 px-3 py-3 text-right text-xs text-faint">{{ slug.length }}</td>
                    <td class="w-12 px-2 py-2 text-right">
                      <app-copy-button [value]="slug" label="" variant="ghost" toastMessage="Slug copied" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (slugs().length > 1) {
            <div class="flex justify-end">
              <app-copy-button [value]="allSlugs()" label="Copy all" variant="secondary" />
            </div>
          }
        } @else {
          <p class="rounded-xl border border-line bg-bg-subtle p-4 text-sm text-muted">
            Type a title above to see its URL slug.
          </p>
        }
      </div>
    </app-tool-layout>
  `,
})
export class SlugGeneratorComponent {
  protected readonly separators = [
    { value: '-', label: 'Hyphen' },
    { value: '_', label: 'Underscore' },
    { value: '', label: 'None' },
  ];

  protected readonly input = signal('');
  protected readonly separator = signal('-');
  protected readonly lowercase = signal(true);
  protected readonly removeStopWords = signal(false);
  protected readonly maxLength = signal(0);

  protected readonly slugs = computed(() =>
    this.input()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        slugify(line, {
          separator: this.separator(),
          lowercase: this.lowercase(),
          removeStopWords: this.removeStopWords(),
          maxLength: this.maxLength(),
        }),
      ),
  );

  protected readonly allSlugs = computed(() => this.slugs().join('\n'));
}

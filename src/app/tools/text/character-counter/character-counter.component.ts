import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { graphemes } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface Limit {
  label: string;
  max: number;
  note: string;
}

const LIMITS: Limit[] = [
  { label: 'Page title', max: 60, note: 'Before Google truncates it in results' },
  { label: 'Meta description', max: 160, note: 'Typical snippet length' },
  { label: 'Social post', max: 280, note: 'Standard microblog limit' },
  { label: 'SMS segment', max: 160, note: 'GSM-7 encoding; 70 with any emoji' },
];

@Component({
  selector: 'app-character-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="character-counter">
      <div class="flex flex-col gap-5">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
            <p class="text-3xl font-bold text-brand">{{ length().toLocaleString() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">Characters</p>
          </div>
          <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
            <p class="text-3xl font-bold text-brand">{{ visible().toLocaleString() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">Visible</p>
          </div>
          <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
            <p class="text-3xl font-bold text-brand">{{ noSpaces().toLocaleString() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">No spaces</p>
          </div>
          <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
            <p class="text-3xl font-bold text-brand">{{ trimmed().toLocaleString() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">Trimmed</p>
          </div>
        </div>

        <div>
          <label class="label" for="cc-input">Your text</label>
          <textarea
            id="cc-input"
            class="textarea h-56 !font-sans !text-base"
            placeholder="Start typing to see the counts update."
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        <section class="flex flex-col gap-3">
          <h3 class="text-sm font-semibold">Against common limits</h3>
          @for (limit of limits; track limit.label) {
            <div>
              <div class="mb-1 flex items-baseline justify-between text-sm">
                <span class="font-medium">{{ limit.label }}</span>
                <span [class]="length() > limit.max ? 'text-danger font-medium' : 'text-muted'">
                  {{ length() }} / {{ limit.max }}
                  @if (length() > limit.max) {
                    ({{ length() - limit.max }} over)
                  }
                </span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  class="h-full rounded-full transition-all"
                  [class]="length() > limit.max ? 'bg-danger' : 'bg-brand'"
                  [style.width.%]="percent(limit.max)"
                ></div>
              </div>
              <p class="mt-1 text-xs text-faint">{{ limit.note }}</p>
            </div>
          }
        </section>

        @if (length() !== visible()) {
          <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
            This text contains characters that occupy more than one code unit — emoji, flags or
            combining accents. Systems that count "characters" may disagree by
            {{ length() - visible() }}.
          </p>
        }
      </div>
    </app-tool-layout>
  `,
})
export class CharacterCounterComponent {
  protected readonly limits = LIMITS;
  protected readonly input = signal('');

  protected readonly length = computed(() => this.input().length);
  protected readonly visible = computed(() => graphemes(this.input()).length);
  protected readonly noSpaces = computed(() => this.input().replace(/\s/g, '').length);
  protected readonly trimmed = computed(() => this.input().trim().length);

  protected percent(max: number): number {
    return Math.min(100, (this.length() / max) * 100);
  }
}

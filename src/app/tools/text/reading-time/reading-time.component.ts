import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { clamp } from '../../../core/utils';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { analyseText, formatDuration } from '../lib/text.util';

@Component({
  selector: 'app-reading-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout toolId="reading-time">
      <div class="flex flex-col gap-5">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-brand/30 bg-brand-soft p-5 text-center">
            <p class="text-3xl font-bold text-brand">{{ readTime() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">Silent reading</p>
          </div>
          <div class="rounded-xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-3xl font-bold">{{ speakTime() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">Read aloud</p>
          </div>
          <div class="rounded-xl border border-line bg-bg-subtle p-5 text-center">
            <p class="text-3xl font-bold">{{ words().toLocaleString() }}</p>
            <p class="mt-1 text-[11px] tracking-wider text-faint uppercase">Words</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="rt-wpm">Reading speed: {{ wpm() }} words per minute</label>
            <input
              id="rt-wpm"
              type="range"
              min="100"
              max="450"
              step="5"
              class="w-full"
              [value]="wpm()"
              (input)="wpm.set(+$any($event.target).value)"
            />
            <div class="mt-1 flex justify-between text-xs text-faint">
              <span>Technical (150)</span>
              <span>Average (225)</span>
              <span>Fast (400)</span>
            </div>
          </div>
          <div>
            <label class="label" for="rt-spm">Speaking speed: {{ spm() }} words per minute</label>
            <input
              id="rt-spm"
              type="range"
              min="90"
              max="220"
              step="5"
              class="w-full"
              [value]="spm()"
              (input)="spm.set(+$any($event.target).value)"
            />
            <div class="mt-1 flex justify-between text-xs text-faint">
              <span>Slow (100)</span>
              <span>Presentation (150)</span>
              <span>Fast (200)</span>
            </div>
          </div>
        </div>

        <div>
          <label class="label" for="rt-input">Article text</label>
          <textarea
            id="rt-input"
            class="textarea h-72 !font-sans !text-base"
            placeholder="Paste your article, script or blog post…"
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        <div class="overflow-hidden rounded-xl border border-line">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of breakdown(); track row.label) {
                <tr>
                  <td class="px-3 py-2 text-muted">{{ row.label }}</td>
                  <td class="px-3 py-2 text-right font-medium">{{ row.value }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class ReadingTimeComponent {
  protected readonly input = signal('');
  protected readonly wpm = signal(225);
  protected readonly spm = signal(150);

  private readonly stats = computed(() =>
    analyseText(this.input(), clamp(this.wpm(), 50, 1000), clamp(this.spm(), 50, 1000)),
  );

  protected readonly words = computed(() => this.stats().words);
  protected readonly readTime = computed(() => formatDuration(this.stats().readingMinutes));
  protected readonly speakTime = computed(() => formatDuration(this.stats().speakingMinutes));

  protected readonly breakdown = computed(() => {
    const s = this.stats();
    return [
      { label: 'Sentences', value: s.sentences.toLocaleString() },
      { label: 'Paragraphs', value: s.paragraphs.toLocaleString() },
      { label: 'Characters', value: s.characters.toLocaleString() },
      {
        label: 'Words per sentence',
        value: s.sentences ? (s.words / s.sentences).toFixed(1) : '—',
      },
      {
        label: 'Slides at 120 words each',
        value: s.words ? String(Math.ceil(s.words / 120)) : '0',
      },
    ];
  });
}

import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { clamp } from '../../../core/utils';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { makeParagraph, makeSentences, makeWords } from '../lib/text.util';

type Unit = 'paragraphs' | 'sentences' | 'words';

@Component({
  selector: 'app-lorem-ipsum',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="lorem-ipsum">
      <div class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            <label class="label" for="lorem-count">How many</label>
            <input
              id="lorem-count"
              type="number"
              class="input"
              min="1"
              max="100"
              [value]="count()"
              (input)="setCount($any($event.target).value)"
            />
          </div>
          <div>
            <span class="label">Unit</span>
            <div class="flex flex-wrap gap-2">
              @for (option of units; track option) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="unit() === option"
                  (click)="unit.set(option); generate()"
                >
                  {{ option }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <label class="chip cursor-pointer" [class.is-active]="classic()">
            <input type="checkbox" class="sr-only" [checked]="classic()" (change)="toggleClassic()" />
            Start with “Lorem ipsum dolor sit amet”
          </label>
          <label class="chip cursor-pointer" [class.is-active]="asHtml()">
            <input type="checkbox" class="sr-only" [checked]="asHtml()" (change)="toggleHtml()" />
            Wrap in &lt;p&gt; tags
          </label>

          <button type="button" class="btn btn-primary ml-auto" (click)="generate()">
            <app-icon name="refresh" class="h-4 w-4" />
            Generate
          </button>
        </div>

        <app-result-panel
          label="Placeholder text"
          [value]="output()"
          [downloadName]="asHtml() ? 'lorem.html' : 'lorem.txt'"
          placeholder="Press Generate to create placeholder text."
        />
      </div>
    </app-tool-layout>
  `,
})
export class LoremIpsumComponent {
  protected readonly units: Unit[] = ['paragraphs', 'sentences', 'words'];

  protected readonly count = signal(3);
  protected readonly unit = signal<Unit>('paragraphs');
  protected readonly classic = signal(true);
  protected readonly asHtml = signal(false);
  protected readonly output = signal('');

  constructor() {
    // Random text is generated client-side only so the prerendered HTML does
    // not disagree with what the user ends up seeing.
    afterNextRender(() => this.generate());
  }

  protected setCount(value: string): void {
    this.count.set(Math.round(clamp(Number(value), 1, 100)));
    this.generate();
  }

  protected toggleClassic(): void {
    this.classic.update((v) => !v);
    this.generate();
  }

  protected toggleHtml(): void {
    this.asHtml.update((v) => !v);
    this.generate();
  }

  protected generate(): void {
    const count = this.count();
    const classic = this.classic();

    let blocks: string[];
    switch (this.unit()) {
      case 'words':
        blocks = [makeWords(count, classic)];
        break;
      case 'sentences':
        blocks = [makeSentences(count, classic)];
        break;
      default:
        blocks = Array.from({ length: count }, (_, i) =>
          makeParagraph(3 + Math.floor(Math.random() * 3), classic && i === 0),
        );
    }

    this.output.set(
      this.asHtml() ? blocks.map((b) => `<p>${b}</p>`).join('\n') : blocks.join('\n\n'),
    );
  }
}

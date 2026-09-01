import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { clamp } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

const PROPERTIES = [
  {
    key: 'flexDirection',
    css: 'flex-direction',
    label: 'Direction',
    values: ['row', 'row-reverse', 'column', 'column-reverse'],
  },
  { key: 'flexWrap', css: 'flex-wrap', label: 'Wrap', values: ['nowrap', 'wrap', 'wrap-reverse'] },
  {
    key: 'justifyContent',
    css: 'justify-content',
    label: 'Justify content',
    values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
  },
  {
    key: 'alignItems',
    css: 'align-items',
    label: 'Align items',
    values: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
  },
  {
    key: 'alignContent',
    css: 'align-content',
    label: 'Align content',
    values: ['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
  },
] as const;

@Component({
  selector: 'app-flexbox-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="flexbox-generator">
      <div class="flex flex-col gap-5">
        <div
          class="min-h-72 rounded-2xl border border-line bg-bg-subtle p-4"
          [style.display]="'flex'"
          [style.flex-direction]="values()['flexDirection']"
          [style.flex-wrap]="values()['flexWrap']"
          [style.justify-content]="values()['justifyContent']"
          [style.align-items]="values()['alignItems']"
          [style.align-content]="values()['alignContent']"
          [style.gap.px]="gap()"
        >
          @for (item of items(); track item) {
            <div
              class="flex min-h-16 min-w-16 items-center justify-center rounded-xl bg-brand-soft font-semibold text-brand"
              [style.flex-grow]="grow()"
              [style.flex-shrink]="shrink()"
              [style.flex-basis]="basis()"
              [style.padding]="'1rem'"
            >
              {{ item }}
            </div>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn btn-secondary" (click)="addItem()" [disabled]="items().length >= 12">
            Add item
          </button>
          <button type="button" class="btn btn-secondary" (click)="removeItem()" [disabled]="items().length <= 1">
            Remove item
          </button>
          <span class="ml-2 text-sm text-muted">{{ items().length }} items</span>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          @for (property of properties; track property.key) {
            <div>
              <span class="label">{{ property.label }}</span>
              <div class="flex flex-wrap gap-1.5">
                @for (value of property.values; track value) {
                  <button
                    type="button"
                    class="chip !px-2.5 !py-1 !text-xs"
                    [attr.aria-pressed]="values()[property.key] === value"
                    (click)="set(property.key, value)"
                  >
                    {{ value }}
                  </button>
                }
              </div>
            </div>
          }

          <div>
            <label class="label" for="flex-gap">Gap: {{ gap() }}px</label>
            <input
              id="flex-gap"
              type="range"
              min="0"
              max="64"
              class="w-full"
              [value]="gap()"
              (input)="gap.set(+$any($event.target).value)"
            />
          </div>
        </div>

        <fieldset class="rounded-xl border border-line p-4">
          <legend class="px-2 text-sm font-semibold">Child properties</legend>
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label" for="flex-grow">flex-grow: {{ grow() }}</label>
              <input
                id="flex-grow"
                type="range"
                min="0"
                max="4"
                class="w-full"
                [value]="grow()"
                (input)="grow.set(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="flex-shrink">flex-shrink: {{ shrink() }}</label>
              <input
                id="flex-shrink"
                type="range"
                min="0"
                max="4"
                class="w-full"
                [value]="shrink()"
                (input)="shrink.set(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="flex-basis">flex-basis</label>
              <input
                id="flex-basis"
                type="text"
                class="input"
                [value]="basis()"
                (input)="basis.set($any($event.target).value || 'auto')"
              />
            </div>
          </div>
        </fieldset>

        <div class="overflow-hidden rounded-xl border border-line">
          <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
            <span class="text-xs font-semibold tracking-wide text-faint uppercase">CSS</span>
            <app-copy-button [value]="css()" label="Copy" variant="ghost" toastMessage="CSS copied" />
          </div>
          <pre class="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-fg">{{ css() }}</pre>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class FlexboxGeneratorComponent {
  protected readonly properties = PROPERTIES;

  protected readonly values = signal<Record<string, string>>({
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignContent: 'stretch',
  });

  protected readonly gap = signal(12);
  protected readonly grow = signal(0);
  protected readonly shrink = signal(1);
  protected readonly basis = signal('auto');
  protected readonly items = signal([1, 2, 3, 4]);

  protected readonly css = computed(() => {
    const v = this.values();
    const container = PROPERTIES.map((p) => `  ${p.css}: ${v[p.key]};`).join('\n');
    return [
      '.container {',
      '  display: flex;',
      container,
      `  gap: ${this.gap()}px;`,
      '}',
      '',
      '.item {',
      `  flex: ${this.grow()} ${this.shrink()} ${this.basis()};`,
      '}',
    ].join('\n');
  });

  protected set(key: string, value: string): void {
    this.values.update((current) => ({ ...current, [key]: value }));
  }

  protected addItem(): void {
    this.items.update((items) => [...items, items.length + 1]);
  }

  protected removeItem(): void {
    this.items.update((items) => items.slice(0, clamp(items.length - 1, 1, 12)));
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { clamp } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

@Component({
  selector: 'app-grid-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="grid-generator">
      <div class="flex flex-col gap-5">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'fixed'" (click)="mode.set('fixed')">
            Fixed tracks
          </button>
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="mode() === 'responsive'"
            (click)="mode.set('responsive')"
          >
            Auto-fit (responsive)
          </button>
        </div>

        <div
          class="min-h-72 rounded-2xl border border-line bg-bg-subtle p-4"
          [style.display]="'grid'"
          [style.grid-template-columns]="columnsValue()"
          [style.grid-template-rows]="mode() === 'fixed' ? rowsValue() : 'auto'"
          [style.gap]="gapValue()"
        >
          @for (cell of cells(); track cell) {
            <div
              class="flex min-h-16 items-center justify-center rounded-xl bg-brand-soft p-4 font-semibold text-brand"
            >
              {{ cell }}
            </div>
          }
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          @if (mode() === 'fixed') {
            <div>
              <label class="label" for="grid-cols">Columns: {{ columns() }}</label>
              <input
                id="grid-cols"
                type="range"
                min="1"
                max="8"
                class="w-full"
                [value]="columns()"
                (input)="setColumns(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="grid-rows">Rows: {{ rows() }}</label>
              <input
                id="grid-rows"
                type="range"
                min="1"
                max="8"
                class="w-full"
                [value]="rows()"
                (input)="setRows(+$any($event.target).value)"
              />
            </div>
          } @else {
            <div>
              <label class="label" for="grid-min">Minimum column width: {{ minWidth() }}px</label>
              <input
                id="grid-min"
                type="range"
                min="80"
                max="400"
                step="10"
                class="w-full"
                [value]="minWidth()"
                (input)="minWidth.set(+$any($event.target).value)"
              />
            </div>
            <div>
              <label class="label" for="grid-count">Preview items: {{ itemCount() }}</label>
              <input
                id="grid-count"
                type="range"
                min="1"
                max="16"
                class="w-full"
                [value]="itemCount()"
                (input)="itemCount.set(+$any($event.target).value)"
              />
            </div>
          }

          <div>
            <label class="label" for="grid-col-gap">Column gap: {{ columnGap() }}px</label>
            <input
              id="grid-col-gap"
              type="range"
              min="0"
              max="64"
              class="w-full"
              [value]="columnGap()"
              (input)="columnGap.set(+$any($event.target).value)"
            />
          </div>
          <div>
            <label class="label" for="grid-row-gap">Row gap: {{ rowGap() }}px</label>
            <input
              id="grid-row-gap"
              type="range"
              min="0"
              max="64"
              class="w-full"
              [value]="rowGap()"
              (input)="rowGap.set(+$any($event.target).value)"
            />
          </div>
        </div>

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
export class GridGeneratorComponent {
  protected readonly mode = signal<'fixed' | 'responsive'>('fixed');
  protected readonly columns = signal(3);
  protected readonly rows = signal(2);
  protected readonly columnGap = signal(16);
  protected readonly rowGap = signal(16);
  protected readonly minWidth = signal(200);
  protected readonly itemCount = signal(6);

  protected readonly columnsValue = computed(() =>
    this.mode() === 'fixed'
      ? `repeat(${this.columns()}, 1fr)`
      : `repeat(auto-fit, minmax(${this.minWidth()}px, 1fr))`,
  );

  protected readonly rowsValue = computed(() => `repeat(${this.rows()}, minmax(64px, auto))`);

  protected readonly gapValue = computed(() =>
    this.rowGap() === this.columnGap()
      ? `${this.rowGap()}px`
      : `${this.rowGap()}px ${this.columnGap()}px`,
  );

  protected readonly cells = computed(() => {
    const total = this.mode() === 'fixed' ? this.columns() * this.rows() : this.itemCount();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  protected readonly css = computed(() =>
    [
      '.grid {',
      '  display: grid;',
      `  grid-template-columns: ${this.columnsValue()};`,
      ...(this.mode() === 'fixed' ? [`  grid-template-rows: ${this.rowsValue()};`] : []),
      `  gap: ${this.gapValue()};`,
      '}',
    ].join('\n'),
  );

  protected setColumns(value: number): void {
    this.columns.set(clamp(value, 1, 8));
  }

  protected setRows(value: number): void {
    this.rows.set(clamp(value, 1, 8));
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { CompareOptions, compareText, toUnifiedDiff } from '../lib/diff.util';

/** Rendering thousands of rows is slower than any user needs; the full diff is downloadable. */
const MAX_VISIBLE_ROWS = 800;

const SAMPLE_LEFT = `# Deployment notes
Run the build with npm run build.
The output goes to dist/app/browser.
Deploy with wrangler deploy.
Remember to set the API key.
Check the logs afterwards.`;

const SAMPLE_RIGHT = `# Deployment notes
Run the build with npm run build.
The output goes to dist/app/browser.
Deploy with wrangler deploy.
No API key is needed — the app has no backend.
Check the logs afterwards.
Tag the release once it is live.`;

@Component({
  selector: 'app-text-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent, CopyButtonComponent, ResultPanelComponent],
  template: `
    <app-tool-layout toolId="text-compare">
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="min-w-0">
            <label class="label" for="cmp-left">Original</label>
            <textarea
              id="cmp-left"
              class="textarea h-64"
              spellcheck="false"
              placeholder="Paste the original text…"
              [value]="left()"
              (input)="left.set($any($event.target).value)"
            ></textarea>
            <p class="mt-1 text-xs text-faint">{{ leftLineCount() }} lines</p>
          </div>

          <div class="min-w-0">
            <label class="label" for="cmp-right">Changed</label>
            <textarea
              id="cmp-right"
              class="textarea h-64"
              spellcheck="false"
              placeholder="Paste the text to compare against…"
              [value]="right()"
              (input)="right.set($any($event.target).value)"
            ></textarea>
            <p class="mt-1 text-xs text-faint">{{ rightLineCount() }} lines</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="chip cursor-pointer" [class.is-active]="ignoreCase()">
            <input type="checkbox" class="sr-only" [checked]="ignoreCase()" (change)="ignoreCase.set(!ignoreCase())" />
            Ignore case
          </label>
          <label class="chip cursor-pointer" [class.is-active]="ignoreWhitespace()">
            <input
              type="checkbox"
              class="sr-only"
              [checked]="ignoreWhitespace()"
              (change)="ignoreWhitespace.set(!ignoreWhitespace())"
            />
            Ignore whitespace
          </label>
          <label class="chip cursor-pointer" [class.is-active]="ignoreBlankLines()">
            <input
              type="checkbox"
              class="sr-only"
              [checked]="ignoreBlankLines()"
              (change)="ignoreBlankLines.set(!ignoreBlankLines())"
            />
            Ignore blank lines
          </label>

          <span class="mx-1 h-5 w-px bg-line"></span>

          <button type="button" class="chip" [attr.aria-pressed]="view() === 'split'" (click)="view.set('split')">
            Side by side
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="view() === 'unified'" (click)="view.set('unified')">
            Unified
          </button>

          <div class="ml-auto flex gap-2">
            <button type="button" class="btn btn-ghost" (click)="swap()" [disabled]="!hasInput()">
              <app-icon name="swap" class="h-4 w-4" />
              Swap
            </button>
            <button type="button" class="btn btn-ghost" (click)="loadSample()">Load sample</button>
            <button type="button" class="btn btn-danger" (click)="clear()" [disabled]="!hasInput()">
              Clear
            </button>
          </div>
        </div>

        @if (hasInput()) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-success/40 bg-success-soft p-4 text-center">
              <p class="text-2xl font-bold text-success">+{{ result().added }}</p>
              <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Added</p>
            </div>
            <div class="rounded-xl border border-danger/40 bg-danger-soft p-4 text-center">
              <p class="text-2xl font-bold text-danger">−{{ result().removed }}</p>
              <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Removed</p>
            </div>
            <div class="rounded-xl border border-warning/40 bg-warning-soft p-4 text-center">
              <p class="text-2xl font-bold text-warning">{{ result().modified }}</p>
              <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Changed</p>
            </div>
            <div class="rounded-xl border border-line bg-bg-subtle p-4 text-center">
              <p class="text-2xl font-bold">{{ result().unchanged }}</p>
              <p class="mt-1 text-[11px] tracking-wide text-faint uppercase">Unchanged</p>
            </div>
          </div>

          @if (identical()) {
            <p class="flex items-center gap-2 rounded-xl border border-success/40 bg-success-soft p-4 text-sm text-success">
              <app-icon name="check-circle" class="h-5 w-5 shrink-0" />
              The two texts are identical{{ optionNote() }}.
            </p>
          }

          @if (result().approximate) {
            <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
              These texts have too little in common to align properly, so lines are compared by
              position instead.
            </p>
          }
        }

        @if (hasInput() && !identical()) {
          @if (view() === 'split') {
            <section class="overflow-hidden rounded-xl border border-line">
              <header class="grid grid-cols-2 divide-x divide-line border-b border-line bg-bg-subtle text-xs font-semibold tracking-wide text-faint uppercase">
                <span class="px-3 py-2">Original</span>
                <span class="px-3 py-2">Changed</span>
              </header>

              <div class="max-h-[540px] overflow-auto">
                <table class="w-full border-collapse font-mono text-xs">
                  <tbody>
                    @for (row of visibleRows(); track $index) {
                      <tr class="align-top">
                        <td
                          class="w-10 shrink-0 border-r border-line px-2 py-1 text-right text-faint select-none"
                          [class.bg-danger-soft]="row.type === 'remove' || row.type === 'modify'"
                        >
                          {{ row.leftNumber ?? '' }}
                        </td>
                        <td
                          class="w-1/2 border-r border-line px-3 py-1 break-words whitespace-pre-wrap"
                          [class.bg-danger-soft]="row.type === 'remove' || row.type === 'modify'"
                        >
                          @if (row.leftSegments) {
                            @for (segment of row.leftSegments; track $index) {
                              @if (segment.changed) {
                                <mark class="rounded-sm bg-danger/30 text-fg">{{ segment.text }}</mark>
                              } @else {
                                <span>{{ segment.text }}</span>
                              }
                            }
                          } @else {
                            {{ row.left }}
                          }
                        </td>

                        <td
                          class="w-10 shrink-0 border-r border-line px-2 py-1 text-right text-faint select-none"
                          [class.bg-success-soft]="row.type === 'add' || row.type === 'modify'"
                        >
                          {{ row.rightNumber ?? '' }}
                        </td>
                        <td
                          class="w-1/2 px-3 py-1 break-words whitespace-pre-wrap"
                          [class.bg-success-soft]="row.type === 'add' || row.type === 'modify'"
                        >
                          @if (row.rightSegments) {
                            @for (segment of row.rightSegments; track $index) {
                              @if (segment.changed) {
                                <mark class="rounded-sm bg-success/30 text-fg">{{ segment.text }}</mark>
                              } @else {
                                <span>{{ segment.text }}</span>
                              }
                            }
                          } @else {
                            {{ row.right }}
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else {
            <section class="overflow-hidden rounded-xl border border-line">
              <header class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
                <span class="text-xs font-semibold tracking-wide text-faint uppercase">Unified diff</span>
                <app-copy-button [value]="unified()" label="Copy" variant="ghost" toastMessage="Diff copied" />
              </header>

              <div class="max-h-[540px] overflow-auto">
                <table class="w-full border-collapse font-mono text-xs">
                  <tbody>
                    @for (row of unifiedRows(); track $index) {
                      <tr
                        [class.bg-success-soft]="row.marker === '+'"
                        [class.bg-danger-soft]="row.marker === '-'"
                      >
                        <td class="w-10 px-2 py-1 text-right text-faint select-none">{{ row.number }}</td>
                        <td
                          class="w-6 px-1 py-1 text-center select-none"
                          [class.text-success]="row.marker === '+'"
                          [class.text-danger]="row.marker === '-'"
                        >
                          {{ row.marker }}
                        </td>
                        <td class="px-2 py-1 break-words whitespace-pre-wrap">{{ row.text }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }

          @if (truncated()) {
            <p class="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-muted">
              Showing the first {{ maxVisibleRows }} of {{ result().rows.length }} rows. Download the
              diff below to see all of it.
            </p>
          }

          <app-result-panel
            label="Unified diff"
            [value]="unified()"
            [meta]="result().rows.length + ' rows'"
            downloadName="changes.diff"
            mimeType="text/x-diff"
            placeholder="The diff appears here."
          />
        }
      </div>
    </app-tool-layout>
  `,
})
export class TextCompareComponent {
  protected readonly maxVisibleRows = MAX_VISIBLE_ROWS;

  protected readonly left = signal('');
  protected readonly right = signal('');
  protected readonly ignoreCase = signal(false);
  protected readonly ignoreWhitespace = signal(false);
  protected readonly ignoreBlankLines = signal(false);
  protected readonly view = signal<'split' | 'unified'>('split');

  private readonly options = computed<CompareOptions>(() => ({
    ignoreCase: this.ignoreCase(),
    ignoreWhitespace: this.ignoreWhitespace(),
    ignoreBlankLines: this.ignoreBlankLines(),
  }));

  protected readonly hasInput = computed(() => !!(this.left().trim() || this.right().trim()));

  protected readonly result = computed(() =>
    compareText(this.left(), this.right(), this.options()),
  );

  protected readonly identical = computed(() => {
    const r = this.result();
    return r.added === 0 && r.removed === 0 && r.modified === 0;
  });

  protected readonly optionNote = computed(() => {
    const active = [
      this.ignoreCase() ? 'case' : '',
      this.ignoreWhitespace() ? 'whitespace' : '',
      this.ignoreBlankLines() ? 'blank lines' : '',
    ].filter(Boolean);
    if (!active.length) return '';
    const list =
      active.length === 1 ? active[0] : `${active.slice(0, -1).join(', ')} and ${active.at(-1)}`;
    return ` once ${list} are ignored`;
  });

  protected readonly visibleRows = computed(() => this.result().rows.slice(0, MAX_VISIBLE_ROWS));

  protected readonly truncated = computed(() => this.result().rows.length > MAX_VISIBLE_ROWS);

  /** Flattens the aligned rows into marker-prefixed lines for the unified view. */
  protected readonly unifiedRows = computed(() => {
    const out: { marker: string; number: number | null; text: string }[] = [];

    for (const row of this.visibleRows()) {
      switch (row.type) {
        case 'equal':
          out.push({ marker: ' ', number: row.leftNumber, text: row.left ?? '' });
          break;
        case 'add':
          out.push({ marker: '+', number: row.rightNumber, text: row.right ?? '' });
          break;
        case 'remove':
          out.push({ marker: '-', number: row.leftNumber, text: row.left ?? '' });
          break;
        case 'modify':
          out.push({ marker: '-', number: row.leftNumber, text: row.left ?? '' });
          out.push({ marker: '+', number: row.rightNumber, text: row.right ?? '' });
          break;
      }
    }

    return out;
  });

  protected readonly unified = computed(() =>
    this.hasInput() ? toUnifiedDiff(this.result().rows) : '',
  );

  protected readonly leftLineCount = computed(() => (this.left() ? this.left().split('\n').length : 0));
  protected readonly rightLineCount = computed(() =>
    this.right() ? this.right().split('\n').length : 0,
  );

  protected swap(): void {
    const left = this.left();
    this.left.set(this.right());
    this.right.set(left);
  }

  protected loadSample(): void {
    this.left.set(SAMPLE_LEFT);
    this.right.set(SAMPLE_RIGHT);
  }

  protected clear(): void {
    this.left.set('');
    this.right.set('');
  }
}

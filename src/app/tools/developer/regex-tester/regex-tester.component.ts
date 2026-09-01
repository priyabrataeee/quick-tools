import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface MatchRow {
  index: number;
  value: string;
  start: number;
  groups: { name: string; value: string }[];
}

interface Segment {
  text: string;
  hit: boolean;
}

const MAX_MATCHES = 500;

const FLAGS = [
  { flag: 'g', label: 'global', hint: 'Find every match, not just the first' },
  { flag: 'i', label: 'ignore case', hint: 'Case-insensitive matching' },
  { flag: 'm', label: 'multiline', hint: '^ and $ match at line breaks' },
  { flag: 's', label: 'dotall', hint: '. also matches newlines' },
  { flag: 'u', label: 'unicode', hint: 'Treat the pattern as Unicode code points' },
];

@Component({
  selector: 'app-regex-tester',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="regex-tester">
      <div class="flex flex-col gap-4">
        <div>
          <label class="label" for="re-pattern">Regular expression</label>
          <div class="flex items-center gap-2">
            <span class="font-mono text-lg text-faint">/</span>
            <input
              id="re-pattern"
              type="text"
              class="input font-mono"
              placeholder="\\b\\w+@\\w+\\.\\w{2,}\\b"
              spellcheck="false"
              autocomplete="off"
              [value]="pattern()"
              (input)="pattern.set($any($event.target).value)"
            />
            <span class="font-mono text-lg text-faint">/{{ flags() }}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          @for (f of flagOptions; track f.flag) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="hasFlag(f.flag)"
              [title]="f.hint"
              (click)="toggleFlag(f.flag)"
            >
              <span class="font-mono">{{ f.flag }}</span>
              {{ f.label }}
            </button>
          }
        </div>

        @if (error()) {
          <div class="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <app-icon name="alert" class="h-4 w-4 shrink-0" />
            {{ error() }}
          </div>
        }

        <div>
          <label class="label" for="re-text">Test text</label>
          <textarea
            id="re-text"
            class="textarea h-40"
            placeholder="Paste the text to search…"
            spellcheck="false"
            [value]="text()"
            (input)="text.set($any($event.target).value)"
          ></textarea>
        </div>

        @if (pattern() && text() && !error()) {
          <div class="rounded-xl border border-line">
            <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
              <h3 class="text-xs font-semibold tracking-wide text-faint uppercase">Highlighted</h3>
              <span class="text-xs text-faint">
                {{ matches().length }} {{ matches().length === 1 ? 'match' : 'matches' }}
                @if (truncated()) { (showing first {{ maxMatches }}) }
              </span>
            </div>
            <p class="max-h-52 overflow-auto p-3 font-mono text-sm break-words whitespace-pre-wrap">
              @for (segment of segments(); track $index) {
                @if (segment.hit) {
                  <mark class="rounded bg-brand-soft px-0.5 text-brand">{{ segment.text }}</mark>
                } @else {
                  <span>{{ segment.text }}</span>
                }
              }
            </p>
          </div>

          @if (matches().length) {
            <div class="max-h-72 overflow-auto rounded-xl border border-line">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-bg-subtle text-xs tracking-wide text-faint uppercase">
                  <tr>
                    <th class="w-12 px-3 py-2 text-left">#</th>
                    <th class="px-3 py-2 text-left">Match</th>
                    <th class="w-20 px-3 py-2 text-left">At</th>
                    <th class="px-3 py-2 text-left">Groups</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (row of matches(); track row.index) {
                    <tr>
                      <td class="px-3 py-2 text-faint">{{ row.index + 1 }}</td>
                      <td class="px-3 py-2 font-mono break-all text-brand">{{ row.value }}</td>
                      <td class="px-3 py-2 text-faint">{{ row.start }}</td>
                      <td class="px-3 py-2 text-xs text-muted">
                        @if (row.groups.length) {
                          @for (g of row.groups; track g.name) {
                            <span class="mr-2 inline-block">
                              <span class="text-faint">{{ g.name }}:</span>
                              <span class="font-mono">{{ g.value }}</span>
                            </span>
                          }
                        } @else {
                          —
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <div>
            <label class="label" for="re-replace">Replacement (supports $1, $&lt;name&gt;)</label>
            <input
              id="re-replace"
              type="text"
              class="input font-mono"
              placeholder="[$&]"
              [value]="replacement()"
              (input)="replacement.set($any($event.target).value)"
            />
          </div>

          <app-result-panel
            label="Replace result"
            [value]="replaced()"
            downloadName="replaced.txt"
            placeholder="Enter a replacement above to preview the substitution."
          />
        }
      </div>
    </app-tool-layout>
  `,
})
export class RegexTesterComponent {
  protected readonly flagOptions = FLAGS;
  protected readonly maxMatches = MAX_MATCHES;

  protected readonly pattern = signal('');
  protected readonly text = signal('');
  protected readonly flags = signal('gi');
  protected readonly replacement = signal('');
  /** True when the match list hit the safety cap. */
  protected readonly truncated = computed(() => this.matches().length >= MAX_MATCHES);

  private readonly compiled = computed<{ regex: RegExp } | { error: string } | null>(() => {
    const source = this.pattern();
    if (!source) return null;
    try {
      return { regex: new RegExp(source, this.flags()) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid regular expression' };
    }
  });

  protected readonly error = computed(() => {
    const c = this.compiled();
    return c && 'error' in c ? c.error : '';
  });

  protected readonly matches = computed<MatchRow[]>(() => {
    const c = this.compiled();
    const text = this.text();
    if (!c || 'error' in c || !text) return [];

    // A fresh regex per run keeps lastIndex from leaking between evaluations.
    const regex = new RegExp(c.regex.source, c.regex.flags.includes('g') ? c.regex.flags : c.regex.flags + 'g');
    const rows: MatchRow[] = [];
    let match: RegExpExecArray | null;
    let guard = 0;

    while ((match = regex.exec(text)) !== null) {
      if (guard++ >= MAX_MATCHES) break;

      const groups: { name: string; value: string }[] = [];
      for (let i = 1; i < match.length; i++) {
        groups.push({ name: String(i), value: match[i] ?? '' });
      }
      for (const [name, value] of Object.entries(match.groups ?? {})) {
        groups.push({ name, value: value ?? '' });
      }

      rows.push({ index: rows.length, value: match[0], start: match.index, groups });

      // Zero-length matches would loop forever without a manual advance.
      if (match[0] === '') regex.lastIndex++;
      if (!c.regex.flags.includes('g')) break;
    }

    return rows;
  });

  protected readonly segments = computed<Segment[]>(() => {
    const text = this.text();
    const matches = this.matches();
    if (!matches.length) return [{ text, hit: false }];

    const parts: Segment[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.start > cursor) parts.push({ text: text.slice(cursor, m.start), hit: false });
      parts.push({ text: m.value, hit: true });
      cursor = m.start + m.value.length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
    return parts;
  });

  protected readonly replaced = computed(() => {
    const c = this.compiled();
    const replacement = this.replacement();
    if (!c || 'error' in c || !this.text() || !replacement) return '';
    try {
      return this.text().replace(c.regex, replacement);
    } catch {
      return '';
    }
  });

  protected hasFlag(flag: string): boolean {
    return this.flags().includes(flag);
  }

  protected toggleFlag(flag: string): void {
    this.flags.update((current) =>
      current.includes(flag) ? current.replace(flag, '') : current + flag,
    );
  }
}

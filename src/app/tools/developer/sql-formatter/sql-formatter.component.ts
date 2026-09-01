import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { formatSql, minifySql } from '../lib/sql-format';

const SAMPLE =
  "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.created_at > '2026-01-01' and u.active = true group by u.id, u.name having count(o.id) > 3 order by orders desc limit 20;";

@Component({
  selector: 'app-sql-formatter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent],
  template: `
    <app-tool-layout toolId="sql-formatter">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'format'" (click)="mode.set('format')">
            Format
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="mode() === 'minify'" (click)="mode.set('minify')">
            Minify
          </button>

          @if (mode() === 'format') {
            <span class="mx-2 h-5 w-px bg-line"></span>
            @for (size of [2, 4]; track size) {
              <button type="button" class="chip" [attr.aria-pressed]="indent() === size" (click)="indent.set(size)">
                {{ size }} spaces
              </button>
            }
          }

          <div class="ml-auto flex gap-2">
            <button type="button" class="btn btn-ghost" (click)="input.set(sample)">Load sample</button>
            <button type="button" class="btn btn-danger" (click)="input.set('')" [disabled]="!input()">
              Clear
            </button>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="sql-input">SQL query</label>
            <textarea
              id="sql-input"
              class="textarea h-[420px]"
              spellcheck="false"
              placeholder="SELECT * FROM users WHERE active = true;"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
          </div>

          <app-result-panel
            [label]="mode() === 'format' ? 'Formatted SQL' : 'Minified SQL'"
            [value]="output()"
            downloadName="query.sql"
            mimeType="application/sql"
            placeholder="Paste a query on the left."
          />
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class SqlFormatterComponent {
  protected readonly sample = SAMPLE;
  protected readonly input = signal('');
  protected readonly mode = signal<'format' | 'minify'>('format');
  protected readonly indent = signal(2);

  protected readonly output = computed(() => {
    const sql = this.input().trim();
    if (!sql) return '';
    return this.mode() === 'format' ? formatSql(sql, this.indent()) : minifySql(sql);
  });
}

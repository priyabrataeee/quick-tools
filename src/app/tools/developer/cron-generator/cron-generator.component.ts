import { ChangeDetectionStrategy, Component, afterNextRender, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { CRON_FIELDS, CRON_PRESETS, describeCron, nextRuns, parseCron } from '../lib/cron';

@Component({
  selector: 'app-cron-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent, IconComponent],
  template: `
    <app-tool-layout toolId="cron-generator">
      <div class="flex flex-col gap-5">
        <div class="grid gap-3 sm:grid-cols-5">
          @for (field of fields; track field.name; let i = $index) {
            <div>
              <label class="label" [attr.for]="'cron-' + i">{{ field.name }}</label>
              <input
                [id]="'cron-' + i"
                type="text"
                class="input text-center font-mono"
                [value]="parts()[i]"
                (input)="setPart(i, $any($event.target).value)"
              />
              <p class="mt-1 text-center text-[11px] text-faint">{{ field.min }}–{{ field.max }}</p>
            </div>
          }
        </div>

        <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-subtle p-4">
          <code class="flex-1 font-mono text-lg break-all text-brand">{{ expression() }}</code>
          <app-copy-button [value]="expression()" label="Copy" variant="secondary" />
        </div>

        @if (error()) {
          <div class="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <app-icon name="alert" class="h-4 w-4 shrink-0" />
            {{ error() }}
          </div>
        } @else {
          <p class="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-base">
            <app-icon name="info" class="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>{{ description() }}</span>
          </p>

          @if (runs().length) {
            <section class="overflow-hidden rounded-xl border border-line">
              <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                Next {{ runs().length }} runs (your local time)
              </h3>
              <ul class="divide-y divide-line">
                @for (run of runs(); track run.getTime()) {
                  <li class="flex items-center gap-3 px-3 py-2 text-sm">
                    <app-icon name="clock" class="h-4 w-4 text-faint" />
                    <span class="font-mono">{{ run.toLocaleString() }}</span>
                  </li>
                }
              </ul>
            </section>
          } @else if (ready()) {
            <p class="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
              This expression is valid but will not fire within the next four years — check the day
              and month combination.
            </p>
          }
        }

        <section>
          <h3 class="mb-2 text-sm font-semibold">Common schedules</h3>
          <div class="flex flex-wrap gap-2">
            @for (preset of presets; track preset.expression) {
              <button type="button" class="chip" (click)="apply(preset.expression)">
                {{ preset.label }}
              </button>
            }
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-line">
          <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
            Syntax reference
          </h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of syntax; track row.symbol) {
                <tr>
                  <td class="w-20 px-3 py-2 font-mono text-brand">{{ row.symbol }}</td>
                  <td class="px-3 py-2 text-muted">{{ row.meaning }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    </app-tool-layout>
  `,
})
export class CronGeneratorComponent {
  protected readonly fields = CRON_FIELDS;
  protected readonly presets = CRON_PRESETS;
  protected readonly syntax = [
    { symbol: '*', meaning: 'Every value in the field' },
    { symbol: '5', meaning: 'A single value' },
    { symbol: '1,15', meaning: 'A list of values' },
    { symbol: '1-5', meaning: 'A range of values, inclusive' },
    { symbol: '*/10', meaning: 'Every tenth value, starting at the lowest' },
    { symbol: '1-20/5', meaning: 'Every fifth value inside a range' },
  ];

  protected readonly parts = signal(['0', '9', '*', '*', '1-5']);
  /** Run times are only computed on the client, since "now" differs per visit. */
  protected readonly ready = signal(false);

  protected readonly expression = computed(() => this.parts().join(' '));

  private readonly validation = computed(() => {
    try {
      parseCron(this.expression());
      return '';
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid cron expression.';
    }
  });

  protected readonly error = computed(() => this.validation());
  protected readonly description = computed(() =>
    this.validation() ? '' : describeCron(this.expression()),
  );

  protected readonly runs = computed(() => {
    if (!this.ready() || this.validation()) return [];
    try {
      return nextRuns(this.expression(), 5);
    } catch {
      return [];
    }
  });

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected setPart(index: number, value: string): void {
    this.parts.update((current) => {
      const next = [...current];
      next[index] = value.trim() || '*';
      return next;
    });
  }

  protected apply(expression: string): void {
    this.parts.set(expression.split(' '));
  }
}

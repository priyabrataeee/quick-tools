import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { contrastRatio, parseColor, toHex } from '../lib/color.util';

interface Check {
  label: string;
  required: number;
  passes: boolean;
}

@Component({
  selector: 'app-contrast-checker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, IconComponent],
  template: `
    <app-tool-layout toolId="contrast-checker">
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="fg-input">Text colour</label>
            <div class="flex gap-2">
              <input
                id="fg-input"
                type="text"
                class="input font-mono"
                spellcheck="false"
                [value]="foreground()"
                (input)="foreground.set($any($event.target).value)"
              />
              <input
                type="color"
                class="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
                [value]="fgHex()"
                (input)="foreground.set($any($event.target).value)"
                aria-label="Pick a text colour"
              />
            </div>
          </div>
          <div>
            <label class="label" for="bg-input">Background colour</label>
            <div class="flex gap-2">
              <input
                id="bg-input"
                type="text"
                class="input font-mono"
                spellcheck="false"
                [value]="background()"
                (input)="background.set($any($event.target).value)"
              />
              <input
                type="color"
                class="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
                [value]="bgHex()"
                (input)="background.set($any($event.target).value)"
                aria-label="Pick a background colour"
              />
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-secondary w-fit" (click)="swap()">
          <app-icon name="swap" class="h-4 w-4" />
          Swap colours
        </button>

        @if (ratio() === null) {
          <p class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            Enter two readable colour values — hex, rgb() or hsl().
          </p>
        } @else {
          <div class="rounded-2xl p-8 text-center" [style.background-color]="bgHex()">
            <p class="text-3xl font-bold" [style.color]="fgHex()">Large text sample</p>
            <p class="mt-3 text-base" [style.color]="fgHex()">
              Normal body text at 16 pixels — the size most of your content will actually use.
            </p>
            <p class="mt-2 text-sm" [style.color]="fgHex()">Small print at 14 pixels.</p>
          </div>

          <div class="flex items-center justify-center gap-4 rounded-xl border border-line bg-bg-subtle p-6">
            <div class="text-center">
              <p class="text-5xl font-bold" [class]="overallPass() ? 'text-success' : 'text-danger'">
                {{ ratio()!.toFixed(2) }}:1
              </p>
              <p class="mt-1 text-sm text-muted">Contrast ratio</p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            @for (check of checks(); track check.label) {
              <div
                class="flex items-center gap-3 rounded-xl border p-3"
                [class]="
                  check.passes
                    ? 'border-success/40 bg-success-soft'
                    : 'border-danger/40 bg-danger-soft'
                "
              >
                <app-icon
                  [name]="check.passes ? 'check-circle' : 'x'"
                  class="h-5 w-5 shrink-0"
                  [class]="check.passes ? 'text-success' : 'text-danger'"
                />
                <div>
                  <p class="text-sm font-medium">{{ check.label }}</p>
                  <p class="text-xs text-muted">Needs {{ check.required }}:1</p>
                </div>
                <span
                  class="ml-auto text-sm font-semibold"
                  [class]="check.passes ? 'text-success' : 'text-danger'"
                >
                  {{ check.passes ? 'Pass' : 'Fail' }}
                </span>
              </div>
            }
          </div>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ContrastCheckerComponent {
  protected readonly foreground = signal('#52525b');
  protected readonly background = signal('#ffffff');

  private readonly fgColor = computed(() => parseColor(this.foreground()));
  private readonly bgColor = computed(() => parseColor(this.background()));

  protected readonly fgHex = computed(() => {
    const c = this.fgColor();
    return c ? toHex(c) : '#000000';
  });
  protected readonly bgHex = computed(() => {
    const c = this.bgColor();
    return c ? toHex(c) : '#ffffff';
  });

  protected readonly ratio = computed<number | null>(() => {
    const fg = this.fgColor();
    const bg = this.bgColor();
    return fg && bg ? contrastRatio(fg, bg) : null;
  });

  protected readonly checks = computed<Check[]>(() => {
    const ratio = this.ratio();
    if (ratio === null) return [];
    return [
      { label: 'AA — normal text', required: 4.5, passes: ratio >= 4.5 },
      { label: 'AA — large text (18.66px bold / 24px)', required: 3, passes: ratio >= 3 },
      { label: 'AAA — normal text', required: 7, passes: ratio >= 7 },
      { label: 'AAA — large text', required: 4.5, passes: ratio >= 4.5 },
      { label: 'Non-text elements (icons, borders)', required: 3, passes: ratio >= 3 },
    ];
  });

  protected readonly overallPass = computed(() => (this.ratio() ?? 0) >= 4.5);

  protected swap(): void {
    const fg = this.foreground();
    this.foreground.set(this.background());
    this.background.set(fg);
  }
}

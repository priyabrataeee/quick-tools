import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

type Corner = 'tl' | 'tr' | 'br' | 'bl';

const CORNERS: { key: Corner; label: string }[] = [
  { key: 'tl', label: 'Top left' },
  { key: 'tr', label: 'Top right' },
  { key: 'br', label: 'Bottom right' },
  { key: 'bl', label: 'Bottom left' },
];

@Component({
  selector: 'app-border-radius-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent, IconComponent],
  template: `
    <app-tool-layout toolId="border-radius-generator">
      <div class="flex flex-col gap-5">
        <div class="flex h-72 items-center justify-center rounded-2xl border border-line bg-bg-subtle">
          <div
            class="h-48 w-48 bg-gradient-to-br from-brand to-accent transition-all"
            [style.border-radius]="value()"
          ></div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="chip cursor-pointer" [class.is-active]="elliptical()">
            <input type="checkbox" class="sr-only" [checked]="elliptical()" (change)="elliptical.set(!elliptical())" />
            Elliptical corners
          </label>
          <button type="button" class="chip" [attr.aria-pressed]="unit() === '%'" (click)="unit.set('%')">
            Percent
          </button>
          <button type="button" class="chip" [attr.aria-pressed]="unit() === 'px'" (click)="unit.set('px')">
            Pixels
          </button>

          <button type="button" class="btn btn-ghost ml-auto" (click)="randomise()">
            <app-icon name="refresh" class="h-4 w-4" />
            Random blob
          </button>
          <button type="button" class="btn btn-secondary" (click)="reset()">Reset</button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          @for (corner of corners; track corner.key) {
            <div class="rounded-xl border border-line p-4">
              <h3 class="mb-3 text-sm font-semibold">{{ corner.label }}</h3>

              <div class="mb-1 flex justify-between text-xs text-faint">
                <span>{{ elliptical() ? 'Horizontal' : 'Radius' }}</span>
                <span>{{ horizontal()[corner.key] }}{{ unit() }}</span>
              </div>
              <input
                type="range"
                class="w-full"
                min="0"
                [max]="max()"
                [value]="horizontal()[corner.key]"
                (input)="setHorizontal(corner.key, +$any($event.target).value)"
                [attr.aria-label]="corner.label + ' horizontal radius'"
              />

              @if (elliptical()) {
                <div class="mt-3 mb-1 flex justify-between text-xs text-faint">
                  <span>Vertical</span>
                  <span>{{ vertical()[corner.key] }}{{ unit() }}</span>
                </div>
                <input
                  type="range"
                  class="w-full"
                  min="0"
                  [max]="max()"
                  [value]="vertical()[corner.key]"
                  (input)="setVertical(corner.key, +$any($event.target).value)"
                  [attr.aria-label]="corner.label + ' vertical radius'"
                />
              }
            </div>
          }
        </div>

        <div class="overflow-hidden rounded-xl border border-line">
          <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
            <span class="text-xs font-semibold tracking-wide text-faint uppercase">CSS</span>
            <app-copy-button [value]="declaration()" label="Copy" variant="ghost" toastMessage="CSS copied" />
          </div>
          <pre class="overflow-x-auto p-4 font-mono text-xs text-fg">{{ declaration() }}</pre>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class BorderRadiusGeneratorComponent {
  protected readonly corners = CORNERS;

  protected readonly unit = signal<'%' | 'px'>('%');
  protected readonly elliptical = signal(false);
  protected readonly horizontal = signal<Record<Corner, number>>({ tl: 24, tr: 24, br: 24, bl: 24 });
  protected readonly vertical = signal<Record<Corner, number>>({ tl: 24, tr: 24, br: 24, bl: 24 });

  protected readonly max = computed(() => (this.unit() === '%' ? 100 : 200));

  protected readonly value = computed(() => {
    const u = this.unit();
    const h = this.horizontal();
    const horizontalPart = `${h.tl}${u} ${h.tr}${u} ${h.br}${u} ${h.bl}${u}`;
    if (!this.elliptical()) return this.collapse(horizontalPart);
    const v = this.vertical();
    const verticalPart = `${v.tl}${u} ${v.tr}${u} ${v.br}${u} ${v.bl}${u}`;
    return `${this.collapse(horizontalPart)} / ${this.collapse(verticalPart)}`;
  });

  protected readonly declaration = computed(() => `border-radius: ${this.value()};`);

  /** Shortens `24px 24px 24px 24px` to `24px`, as a person would write it. */
  private collapse(part: string): string {
    const [tl, tr, br, bl] = part.split(' ');
    if (tl === tr && tr === br && br === bl) return tl;
    if (tl === br && tr === bl) return `${tl} ${tr}`;
    if (tr === bl) return `${tl} ${tr} ${br}`;
    return part;
  }

  protected setHorizontal(corner: Corner, value: number): void {
    this.horizontal.update((current) => ({ ...current, [corner]: value }));
  }

  protected setVertical(corner: Corner, value: number): void {
    this.vertical.update((current) => ({ ...current, [corner]: value }));
  }

  protected reset(): void {
    this.horizontal.set({ tl: 24, tr: 24, br: 24, bl: 24 });
    this.vertical.set({ tl: 24, tr: 24, br: 24, bl: 24 });
    this.elliptical.set(false);
  }

  protected randomise(): void {
    const random = () => 20 + Math.floor(Math.random() * 60);
    this.unit.set('%');
    this.elliptical.set(true);
    this.horizontal.set({ tl: random(), tr: random(), br: random(), bl: random() });
    this.vertical.set({ tl: random(), tr: random(), br: random(), bl: random() });
  }
}

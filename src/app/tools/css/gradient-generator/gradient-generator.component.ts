import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { clamp } from '../../../core/utils';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

interface Stop {
  id: number;
  color: string;
  position: number;
}

type GradientType = 'linear' | 'radial' | 'conic';

@Component({
  selector: 'app-gradient-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent, IconComponent],
  template: `
    <app-tool-layout toolId="gradient-generator">
      <div class="flex flex-col gap-5">
        <div class="h-56 rounded-2xl border border-line" [style.background]="gradient()"></div>

        <div class="flex flex-wrap items-center gap-2">
          @for (option of types; track option.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="type() === option.id"
              (click)="type.set(option.id)"
            >
              {{ option.label }}
            </button>
          }

          <button type="button" class="btn btn-ghost ml-auto" (click)="randomise()">
            <app-icon name="refresh" class="h-4 w-4" />
            Random
          </button>
        </div>

        @if (type() !== 'radial') {
          <div>
            <label class="label" for="grad-angle">Angle: {{ angle() }}°</label>
            <input
              id="grad-angle"
              type="range"
              min="0"
              max="360"
              class="w-full"
              [value]="angle()"
              (input)="angle.set(+$any($event.target).value)"
            />
          </div>
        } @else {
          <div class="flex flex-wrap gap-2">
            @for (shape of radialShapes; track shape) {
              <button
                type="button"
                class="chip"
                [attr.aria-pressed]="radialShape() === shape"
                (click)="radialShape.set(shape)"
              >
                {{ shape }}
              </button>
            }
          </div>
        }

        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Colour stops</h3>
            <button type="button" class="btn btn-secondary" (click)="addStop()" [disabled]="stops().length >= 6">
              Add stop
            </button>
          </div>

          @for (stop of stops(); track stop.id; let i = $index) {
            <div class="flex items-center gap-3 rounded-xl border border-line p-3">
              <input
                type="color"
                class="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
                [value]="stop.color"
                (input)="setColor(stop.id, $any($event.target).value)"
                [attr.aria-label]="'Colour for stop ' + (i + 1)"
              />
              <div class="flex-1">
                <div class="mb-1 flex justify-between text-xs text-faint">
                  <span class="font-mono">{{ stop.color }}</span>
                  <span>{{ stop.position }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  class="w-full"
                  [value]="stop.position"
                  (input)="setPosition(stop.id, +$any($event.target).value)"
                  [attr.aria-label]="'Position for stop ' + (i + 1)"
                />
              </div>
              @if (stops().length > 2) {
                <button
                  type="button"
                  class="btn btn-ghost h-8 w-8 !p-0"
                  (click)="removeStop(stop.id)"
                  [attr.aria-label]="'Remove stop ' + (i + 1)"
                >
                  <app-icon name="x" class="h-4 w-4" />
                </button>
              }
            </div>
          }
        </section>

        <div class="overflow-hidden rounded-xl border border-line">
          <div class="flex items-center justify-between border-b border-line bg-bg-subtle px-3 py-2">
            <span class="text-xs font-semibold tracking-wide text-faint uppercase">CSS</span>
            <app-copy-button [value]="declaration()" label="Copy" variant="ghost" toastMessage="CSS copied" />
          </div>
          <pre class="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-fg">{{ declaration() }}</pre>
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class GradientGeneratorComponent {
  protected readonly types: { id: GradientType; label: string }[] = [
    { id: 'linear', label: 'Linear' },
    { id: 'radial', label: 'Radial' },
    { id: 'conic', label: 'Conic' },
  ];
  protected readonly radialShapes = ['circle', 'ellipse'] as const;

  private nextId = 2;
  protected readonly type = signal<GradientType>('linear');
  protected readonly angle = signal(135);
  protected readonly radialShape = signal<'circle' | 'ellipse'>('circle');
  protected readonly stops = signal<Stop[]>([
    { id: 0, color: '#6366f1', position: 0 },
    { id: 1, color: '#a855f7', position: 100 },
  ]);

  private readonly stopList = computed(() =>
    [...this.stops()]
      .sort((a, b) => a.position - b.position)
      .map((s) => `${s.color} ${s.position}%`)
      .join(', '),
  );

  protected readonly gradient = computed(() => {
    switch (this.type()) {
      case 'radial':
        return `radial-gradient(${this.radialShape()} at center, ${this.stopList()})`;
      case 'conic':
        return `conic-gradient(from ${this.angle()}deg at center, ${this.stopList()})`;
      default:
        return `linear-gradient(${this.angle()}deg, ${this.stopList()})`;
    }
  });

  protected readonly declaration = computed(() => `background: ${this.gradient()};`);

  protected setColor(id: number, color: string): void {
    this.stops.update((stops) => stops.map((s) => (s.id === id ? { ...s, color } : s)));
  }

  protected setPosition(id: number, position: number): void {
    this.stops.update((stops) =>
      stops.map((s) => (s.id === id ? { ...s, position: clamp(position, 0, 100) } : s)),
    );
  }

  protected addStop(): void {
    const stops = this.stops();
    const last = stops[stops.length - 1];
    this.stops.update((current) => [
      ...current,
      {
        id: this.nextId++,
        color: last?.color ?? '#6366f1',
        position: clamp(Math.round((last?.position ?? 50) / 2 + 50), 0, 100),
      },
    ]);
  }

  protected removeStop(id: number): void {
    this.stops.update((stops) => (stops.length > 2 ? stops.filter((s) => s.id !== id) : stops));
  }

  protected randomise(): void {
    const hue = Math.floor(Math.random() * 360);
    const complement = (hue + 40 + Math.floor(Math.random() * 120)) % 360;
    this.angle.set(Math.floor(Math.random() * 360));
    this.stops.set([
      { id: this.nextId++, color: hslToHex(hue, 75, 60), position: 0 },
      { id: this.nextId++, color: hslToHex(complement, 75, 55), position: 100 },
    ]);
  }
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) =>
    Math.round(255 * n)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

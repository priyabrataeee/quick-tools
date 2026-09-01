import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { hslToRgb, parseColor, rgbToCmyk, rgbToHsb, rgbToHsl, toHex } from '../lib/color.util';

@Component({
  selector: 'app-color-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="color-converter">
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            class="h-28 w-full rounded-2xl border border-line sm:w-40"
            [style.background-color]="swatch()"
          ></div>

          <div class="flex-1">
            <label class="label" for="color-input">Colour value</label>
            <div class="flex gap-2">
              <input
                id="color-input"
                type="text"
                class="input font-mono"
                placeholder="#6366f1, rgb(99 102 241), hsl(239 84% 67%)"
                spellcheck="false"
                [value]="input()"
                (input)="input.set($any($event.target).value)"
              />
              <input
                type="color"
                class="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
                [value]="pickerValue()"
                (input)="input.set($any($event.target).value)"
                aria-label="Pick a colour"
              />
            </div>
            @if (!parsed() && input().trim()) {
              <p class="mt-2 text-sm text-danger">
                Could not read that colour. Try a hex value, rgb() or hsl().
              </p>
            }
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          @for (preset of presets; track preset) {
            <button
              type="button"
              class="h-8 w-8 rounded-lg border border-line transition-transform hover:scale-110"
              [style.background-color]="preset"
              (click)="input.set(preset)"
              [attr.aria-label]="'Use ' + preset"
            ></button>
          }
        </div>

        @if (parsed()) {
          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <tbody class="divide-y divide-line">
                @for (row of formats(); track row.label) {
                  <tr>
                    <td class="w-24 px-3 py-2.5 font-medium text-faint">{{ row.label }}</td>
                    <td class="px-3 py-2.5 font-mono break-all">{{ row.value }}</td>
                    <td class="w-12 px-2 py-1.5 text-right">
                      <app-copy-button
                        [value]="row.value"
                        label=""
                        variant="ghost"
                        [toastMessage]="row.label + ' copied'"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <section>
            <h3 class="mb-3 text-sm font-semibold">Tints and shades</h3>
            <div class="grid grid-cols-5 gap-2 sm:grid-cols-10">
              @for (variant of variants(); track variant.label) {
                <button
                  type="button"
                  class="group flex flex-col items-center gap-1"
                  (click)="input.set(variant.hex)"
                >
                  <span
                    class="h-12 w-full rounded-lg border border-line transition-transform group-hover:scale-105"
                    [style.background-color]="variant.hex"
                  ></span>
                  <span class="text-[10px] text-faint">{{ variant.label }}</span>
                </button>
              }
            </div>
          </section>
        }
      </div>
    </app-tool-layout>
  `,
})
export class ColorConverterComponent {
  protected readonly presets = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#64748b',
  ];

  protected readonly input = signal('#6366f1');

  protected readonly parsed = computed(() => parseColor(this.input()));
  protected readonly swatch = computed(() => {
    const rgb = this.parsed();
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})` : 'transparent';
  });

  /** `<input type="color">` only accepts 6-digit hex. */
  protected readonly pickerValue = computed(() => {
    const rgb = this.parsed();
    return rgb ? toHex(rgb) : '#000000';
  });

  protected readonly formats = computed(() => {
    const rgb = this.parsed();
    if (!rgb) return [];

    const hsl = rgbToHsl(rgb);
    const hsb = rgbToHsb(rgb);
    const cmyk = rgbToCmyk(rgb);
    const alpha = Math.round(rgb.a * 100) / 100;

    return [
      { label: 'HEX', value: toHex(rgb, rgb.a < 1) },
      { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
      { label: 'RGBA', value: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` },
      { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
      { label: 'HSLA', value: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})` },
      { label: 'HSB', value: `hsb(${hsb.h}, ${hsb.s}%, ${hsb.v}%)` },
      { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
      { label: 'CSS var', value: `--color: ${toHex(rgb)};` },
    ];
  });

  protected readonly variants = computed(() => {
    const rgb = this.parsed();
    if (!rgb) return [];
    const { h, s } = rgbToHsl(rgb);
    return [95, 85, 75, 65, 55, 45, 35, 25, 15, 8].map((lightness) => {
      const { r, g, b } = hslToRgb(h, s, lightness);
      return { label: String(lightness), hex: toHex({ r, g, b, a: 1 }) };
    });
  });
}

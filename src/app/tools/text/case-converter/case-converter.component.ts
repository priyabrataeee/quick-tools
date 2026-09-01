import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { CASE_TRANSFORMS } from '../lib/text.util';

@Component({
  selector: 'app-case-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, CopyButtonComponent],
  template: `
    <app-tool-layout toolId="case-converter">
      <div class="flex flex-col gap-5">
        <div>
          <label class="label" for="case-input">Your text</label>
          <textarea
            id="case-input"
            class="textarea h-40 !font-sans !text-base"
            placeholder="Type anything — every case appears below as you type."
            [value]="input()"
            (input)="input.set($any($event.target).value)"
          ></textarea>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-secondary" (click)="input.set(sample)">
            Load example
          </button>
          <button type="button" class="btn btn-danger" (click)="input.set('')" [disabled]="!input()">
            Clear
          </button>
        </div>

        <div class="overflow-hidden rounded-xl border border-line">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-line">
              @for (row of results(); track row.id) {
                <tr class="hover:bg-brand-soft/40">
                  <td class="w-40 px-3 py-3 align-top">
                    <p class="font-medium">{{ row.label }}</p>
                    <p class="text-xs text-faint">{{ row.example }}</p>
                  </td>
                  <td class="px-3 py-3 break-all">
                    @if (row.value) {
                      {{ row.value }}
                    } @else {
                      <span class="text-faint">—</span>
                    }
                  </td>
                  <td class="w-12 px-2 py-2 text-right align-top">
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
      </div>
    </app-tool-layout>
  `,
})
export class CaseConverterComponent {
  protected readonly sample = 'the quick brown fox jumps over the lazy dog';
  protected readonly input = signal('');

  protected readonly results = computed(() => {
    const text = this.input();
    return CASE_TRANSFORMS.map((transform) => ({
      id: transform.id,
      label: transform.label,
      example: transform.example,
      value: text ? transform.apply(text) : '',
    }));
  });
}

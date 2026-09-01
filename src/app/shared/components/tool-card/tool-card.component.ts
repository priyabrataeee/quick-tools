import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tool } from '../../../core/tool.types';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-tool-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <a
      [routerLink]="['/tools', tool().id]"
      class="card group flex h-full flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
    >
      <div class="flex items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg"
        >
          <app-icon [name]="tool().icon" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="truncate font-semibold text-fg group-hover:text-brand">{{ tool().name }}</h3>
          @if (showCategory()) {
            <p class="text-xs text-faint">{{ categoryName() }}</p>
          }
        </div>
        @if (tool().trending) {
          <span
            class="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-warning uppercase"
            >Hot</span
          >
        }
      </div>
      <p class="line-clamp-2 text-sm leading-relaxed text-muted">{{ tool().description }}</p>
    </a>
  `,
})
export class ToolCardComponent {
  readonly tool = input.required<Tool>();
  readonly categoryName = input<string>('');
  readonly showCategory = input(false);
}

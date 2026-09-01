import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../core/tool.types';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-category-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <a
      [routerLink]="['/category', category().id]"
      class="card group flex h-full flex-col gap-2 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg"
      >
        <app-icon [name]="category().icon" class="h-5 w-5" />
      </span>
      <h3 class="mt-1 font-semibold text-fg group-hover:text-brand">{{ category().name }}</h3>
      <p class="text-sm leading-relaxed text-muted">{{ category().description }}</p>
      <p class="mt-auto pt-2 text-xs font-medium text-faint">
        {{ count() }} {{ count() === 1 ? 'tool' : 'tools' }}
      </p>
    </a>
  `,
})
export class CategoryCardComponent {
  readonly category = input.required<Category>();
  readonly count = input(0);
}

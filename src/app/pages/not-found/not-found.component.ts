import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommandPaletteService } from '../../core/command-palette.service';
import { SeoService } from '../../core/seo.service';
import { ToolService } from '../../core/tool.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <p class="text-6xl font-extrabold tracking-tight text-brand">404</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">This page does not exist</h1>
      <p class="mx-auto mt-3 max-w-md text-muted">
        The tool you were looking for may have been renamed, or the link may be wrong.
      </p>

      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <a routerLink="/" class="btn btn-primary">
          <app-icon name="home" class="h-4 w-4" />
          Go home
        </a>
        <button type="button" class="btn btn-secondary" (click)="palette.open()">
          <app-icon name="search" class="h-4 w-4" />
          Search tools
        </button>
      </div>

      <section class="mt-14 text-left">
        <h2 class="mb-4 text-center text-lg font-semibold">Popular tools instead</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          @for (tool of popular(); track tool.id) {
            <app-tool-card [tool]="tool" />
          }
        </div>
      </section>
    </div>
  `,
})
export class NotFoundComponent implements OnInit {
  protected readonly palette = inject(CommandPaletteService);
  private readonly toolService = inject(ToolService);
  private readonly seo = inject(SeoService);

  protected readonly popular = () => this.toolService.popularTools().slice(0, 4);

  ngOnInit(): void {
    this.seo.apply({
      title: 'Page Not Found',
      description: 'The page you were looking for does not exist. Browse all free QuickTools utilities instead.',
      path: '/404',
    });
  }
}

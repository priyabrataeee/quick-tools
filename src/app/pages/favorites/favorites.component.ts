import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { ToolService } from '../../core/tool.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';

@Component({
  selector: 'app-favorites',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
      <header class="animate-rise mb-8">
        <h1 class="text-3xl font-bold tracking-tight md:text-4xl">Your favourites</h1>
        <p class="mt-2 max-w-2xl text-lg text-muted">
          Tools you have saved. They are stored in this browser only — nothing is synced to a
          server.
        </p>
      </header>

      @if (favorites().length) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (tool of favorites(); track tool.id) {
            <app-tool-card [tool]="tool" />
          }
        </div>
      } @else {
        <div class="card p-12 text-center">
          <app-icon name="heart" class="mx-auto mb-4 h-10 w-10 text-faint" />
          <h2 class="text-lg font-semibold">Nothing saved yet</h2>
          <p class="mx-auto mt-2 max-w-md text-muted">
            Open any tool and press <strong class="text-fg">Save</strong> in its header to pin it
            here for quick access.
          </p>
          <a routerLink="/tools" class="btn btn-primary mt-6">Browse all tools</a>
        </div>
      }

      @if (recent().length) {
        <section class="mt-14">
          <h2 class="mb-4 text-xl font-bold tracking-tight">Recently used</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (tool of recent(); track tool.id) {
              <app-tool-card [tool]="tool" />
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class FavoritesComponent implements OnInit {
  private readonly toolService = inject(ToolService);
  private readonly seo = inject(SeoService);

  protected readonly favorites = this.toolService.favoriteTools;
  protected readonly recent = this.toolService.recentTools;

  ngOnInit(): void {
    this.seo.apply({
      title: 'Your Favourite Tools',
      description: 'The OnDevice Tools utilities you have saved, stored locally in your own browser.',
      path: '/favorites',
      keywords: ['favourites', 'saved tools', 'bookmarks'],
      // Per-browser content: identical empty shell for every crawler, so it is
      // noindex rather than robots.txt-disallowed. A disallowed URL can still be
      // indexed from an inbound link precisely because the crawler is forbidden
      // from fetching it and seeing this directive.
      noindex: true,
    });
  }
}

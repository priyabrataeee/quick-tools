import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { SITE_DESCRIPTION } from '../../core/site.config';
import { ToolService } from '../../core/tool.service';
import { CategoryCardComponent } from '../../shared/components/category-card/category-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent, CategoryCardComponent],
  template: `
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 h-96" aria-hidden="true"></div>

      <div class="relative mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:px-6 md:pt-24">
        <p
          class="animate-rise mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted"
        >
          <app-icon name="lock" class="h-3.5 w-3.5 text-brand" />
          {{ toolCount }} tools · everything runs in your browser
        </p>

        <h1
          class="animate-rise text-4xl font-extrabold tracking-tight text-balance md:text-6xl"
        >
          Every tool you need,<br class="hidden sm:block" />
          <span class="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
            without the upload.
          </span>
        </h1>

        <p class="animate-rise mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-balance text-muted">
          Formatters, converters, calculators and image tools that work instantly and privately.
          No sign-up, no server, no tracking.
        </p>

        <!-- Live search -->
        <div class="animate-rise mx-auto mt-9 max-w-xl">
          <div class="relative">
            <app-icon
              name="search"
              class="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-faint"
            />
            <label for="hero-search" class="sr-only">Search tools</label>
            <input
              id="hero-search"
              type="search"
              class="input h-14 rounded-2xl pr-24 pl-12 text-base"
              [placeholder]="'Search ' + toolCount + '+ free tools…'"
              autocomplete="off"
              [value]="query()"
              (input)="onSearch($event)"
            />
            <kbd class="kbd absolute top-1/2 right-4 hidden -translate-y-1/2 sm:inline-flex">
              Ctrl K
            </kbd>
          </div>

          @if (query().trim()) {
            <div class="mt-4 text-left">
              @if (searchResults().length) {
                <p class="mb-3 text-sm text-muted">
                  {{ searchResults().length }}
                  {{ searchResults().length === 1 ? 'tool matches' : 'tools match' }} “{{ query() }}”
                </p>
                <div class="grid gap-3 sm:grid-cols-2">
                  @for (tool of searchResults(); track tool.id) {
                    <app-tool-card [tool]="tool" [showCategory]="true" [categoryName]="nameOf(tool.category)" />
                  }
                </div>
              } @else {
                <p class="card p-6 text-center text-sm text-muted">
                  No tools match “{{ query() }}”. Try a different word — or
                  <a routerLink="/tools" class="text-brand underline">browse everything</a>.
                </p>
              }
            </div>
          }
        </div>
      </div>
    </section>

    @if (!query().trim()) {
      <div class="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <!-- Recently used -->
        @if (recent().length) {
          <section class="mb-14">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-xl font-bold tracking-tight">
                <app-icon name="clock" class="h-5 w-5 text-brand" />
                Jump back in
              </h2>
              <button type="button" class="btn btn-ghost text-xs" (click)="clearRecent()">
                Clear history
              </button>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (tool of recent(); track tool.id) {
                <app-tool-card [tool]="tool" />
              }
            </div>
          </section>
        }

        <!-- Favourites -->
        @if (favorites().length) {
          <section class="mb-14">
            <h2 class="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight">
              <app-icon name="heart-filled" class="h-5 w-5 text-brand" />
              Your favourites
            </h2>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (tool of favorites(); track tool.id) {
                <app-tool-card [tool]="tool" />
              }
            </div>
          </section>
        }

        <!-- Popular -->
        <section class="mb-14">
          <h2 class="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <app-icon name="star" class="h-5 w-5 text-brand" />
            Popular tools
          </h2>
          <p class="mb-5 text-muted">The utilities people reach for most often.</p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (tool of popular(); track tool.id) {
              <app-tool-card [tool]="tool" [showCategory]="true" [categoryName]="nameOf(tool.category)" />
            }
          </div>
        </section>

        <!-- Categories -->
        <section class="mb-14">
          <h2 class="mb-1 text-2xl font-bold tracking-tight">Browse by category</h2>
          <p class="mb-5 text-muted">Nine collections covering development, design and everyday maths.</p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (category of categories(); track category.id) {
              <app-category-card [category]="category" [count]="countIn(category.id)" />
            }
          </div>
        </section>

        <!-- Trending + newest -->
        <!-- min-w-0 on the grid items: without it their default min-width of auto
             lets the truncated single-line rows widen the track past the viewport. -->
        <div class="mb-14 grid gap-10 lg:grid-cols-2">
          <section class="min-w-0">
            <h2 class="mb-1 flex items-center gap-2 text-xl font-bold tracking-tight">
              <app-icon name="trending-up" class="h-5 w-5 text-brand" />
              Trending this month
            </h2>
            <p class="mb-4 text-sm text-muted">Gaining the most use right now.</p>
            <ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              @for (tool of trending(); track tool.id) {
                <li>
                  <a
                    [routerLink]="['/tools', tool.id]"
                    class="flex items-center gap-3 bg-surface px-4 py-3 transition-colors hover:bg-brand-soft"
                  >
                    <app-icon [name]="tool.icon" class="h-4.5 w-4.5 text-brand" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium">{{ tool.name }}</span>
                      <span class="block truncate text-xs text-faint">{{ tool.description }}</span>
                    </span>
                    <app-icon name="chevron-right" class="h-4 w-4 text-faint" />
                  </a>
                </li>
              }
            </ul>
          </section>

          <section class="min-w-0">
            <h2 class="mb-1 flex items-center gap-2 text-xl font-bold tracking-tight">
              <app-icon name="sparkle" class="h-5 w-5 text-brand" />
              Recently added
            </h2>
            <p class="mb-4 text-sm text-muted">The newest additions to OnDevice Tools.</p>
            <ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              @for (tool of newest(); track tool.id) {
                <li>
                  <a
                    [routerLink]="['/tools', tool.id]"
                    class="flex items-center gap-3 bg-surface px-4 py-3 transition-colors hover:bg-brand-soft"
                  >
                    <app-icon [name]="tool.icon" class="h-4.5 w-4.5 text-brand" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium">{{ tool.name }}</span>
                      <span class="block truncate text-xs text-faint">{{ nameOf(tool.category) }}</span>
                    </span>
                    <app-icon name="chevron-right" class="h-4 w-4 text-faint" />
                  </a>
                </li>
              }
            </ul>
          </section>
        </div>

        <!-- SEO copy -->
        <section class="prose-qt mx-auto max-w-3xl border-t border-line pt-12">
          <h2>Free online tools that respect your privacy</h2>
          <p>
            OnDevice Tools is a collection of {{ toolCount }} browser-based utilities for developers,
            designers, writers and anyone who needs a quick answer. Every tool runs as JavaScript
            inside your own browser tab. There is no upload step, no queue and no account, because
            there is no server doing the work.
          </p>
          <p>
            That design has three practical consequences. Results are instant, since nothing travels
            over the network. Your data stays private, whether it is a JWT from a staging
            environment, a contract you need to split, or a photo you would rather not hand to a
            stranger. And the whole site keeps working offline once you have visited it.
          </p>
          <h3>What you will find here</h3>
          <ul>
            <li>
              <strong>Developer tools</strong> — JSON, XML, YAML and SQL formatters, Base64 and URL
              encoders, a JWT decoder, hash generation and a live regex tester.
            </li>
            <li>
              <strong>Text tools</strong> — word and character counting, case conversion, slug
              generation, line sorting and deduplication.
            </li>
            <li>
              <strong>Image and PDF tools</strong> — compression, resizing, cropping, format
              conversion, plus merging, splitting and rotating PDFs.
            </li>
            <li>
              <strong>CSS and colour tools</strong> — visual generators for shadows, gradients,
              grid and flexbox, colour conversion and WCAG contrast checking.
            </li>
            <li>
              <strong>Calculators and converters</strong> — percentages, EMI, SIP, GST, compound
              interest, plus unit conversion and date arithmetic.
            </li>
          </ul>
          <h3>Is it really free?</h3>
          <p>
            Yes. There is no paid tier, no usage limit and no sign-up. Because processing happens on
            your device rather than on rented servers, running OnDevice Tools costs almost nothing.
          </p>
        </section>
      </div>
    }
  `,
})
export class HomeComponent implements OnInit {
  private readonly toolService = inject(ToolService);
  private readonly seo = inject(SeoService);

  protected readonly query = signal('');
  protected readonly categories = this.toolService.categories;
  protected readonly popular = computed(() => this.toolService.popularTools().slice(0, 8));
  protected readonly trending = computed(() => this.toolService.trendingTools().slice(0, 6));
  protected readonly newest = computed(() => this.toolService.newestTools().slice(0, 6));
  protected readonly recent = computed(() => this.toolService.recentTools().slice(0, 4));
  protected readonly favorites = computed(() => this.toolService.favoriteTools().slice(0, 4));
  protected readonly toolCount = this.toolService.tools().length;

  protected readonly searchResults = computed(() => this.toolService.search(this.query()).slice(0, 12));

  ngOnInit(): void {
    this.seo.apply({
      title: `${this.toolCount} Free Browser Tools`,
      description: SITE_DESCRIPTION,
      path: '/',
      keywords: [
        'free online tools',
        'browser tools',
        'json formatter',
        'image compressor',
        'unit converter',
        'developer utilities',
      ],
    });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected nameOf(categoryId: string): string {
    return this.toolService.categories().find((c) => c.id === categoryId)?.name ?? '';
  }

  protected countIn(categoryId: string): number {
    return this.toolService.tools().filter((t) => t.category === categoryId).length;
  }

  protected clearRecent(): void {
    this.toolService.clearRecent();
  }
}

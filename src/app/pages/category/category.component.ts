import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { canonicalUrl } from '../../core/site.config';
import { ToolService } from '../../core/tool.service';
import { Category, CategoryId } from '../../core/tool.types';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';

@Component({
  selector: 'app-category',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  template: `
    @let cat = category();
    @if (cat) {
      <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <nav class="mb-5 flex items-center gap-1.5 text-sm text-faint" aria-label="Breadcrumb">
          <a routerLink="/" class="transition-colors hover:text-fg">Home</a>
          <app-icon name="chevron-right" class="h-3.5 w-3.5" />
          <span class="text-muted" aria-current="page">{{ cat.name }}</span>
        </nav>

        <header class="animate-rise mb-8 flex items-start gap-4">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"
          >
            <app-icon [name]="cat.icon" class="h-6 w-6" />
          </span>
          <div>
            <h1 class="text-3xl font-bold tracking-tight md:text-4xl">{{ cat.name }}</h1>
            <p class="mt-2 max-w-2xl text-lg text-muted">{{ cat.description }}</p>
            <p class="mt-1 text-sm text-faint">{{ tools().length }} tools in this category</p>
          </div>
        </header>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (tool of tools(); track tool.id) {
            <app-tool-card [tool]="tool" />
          }
        </div>

        <section class="mt-14">
          <h2 class="mb-4 text-xl font-bold tracking-tight">Other categories</h2>
          <div class="flex flex-wrap gap-2">
            @for (other of otherCategories(); track other.id) {
              <a [routerLink]="['/category', other.id]" class="chip">{{ other.name }}</a>
            }
          </div>
        </section>
      </div>
    } @else {
      <div class="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 class="text-2xl font-bold">Category not found</h1>
        <a routerLink="/tools" class="btn btn-primary mt-6">Browse all tools</a>
      </div>
    }
  `,
})
export class CategoryComponent implements OnInit {
  private readonly toolService = inject(ToolService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  private readonly categoryId = signal<CategoryId | null>(null);

  protected readonly category = computed<Category | undefined>(() => {
    const id = this.categoryId();
    return id ? this.toolService.category(id) : undefined;
  });

  protected readonly tools = computed(() => {
    const id = this.categoryId();
    return id ? this.toolService.byCategory(id) : [];
  });

  protected readonly otherCategories = computed(() =>
    this.toolService.categories().filter((c) => c.id !== this.categoryId()),
  );

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') as CategoryId | null;
      this.categoryId.set(id);

      const category = this.category();
      if (!category) return;

      const tools = this.tools();
      this.seo.apply({
        title: `${category.name} — ${tools.length} Free Online Tools`,
        description: `${category.description} All ${tools.length} tools run entirely in your browser with no uploads.`,
        path: `/category/${category.id}`,
        keywords: [category.name.toLowerCase(), ...tools.slice(0, 8).map((t) => t.name.toLowerCase())],
        structuredData: [
          {
            '@type': 'CollectionPage',
            name: category.name,
            description: category.description,
            url: canonicalUrl(`/category/${category.id}`),
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: tools.length,
              itemListElement: tools.map((tool, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: tool.name,
                url: canonicalUrl(`/tools/${tool.id}`),
              })),
            },
          },
        ],
      });
    });
  }
}

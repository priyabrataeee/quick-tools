import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClipboardService } from '../../../core/clipboard.service';
import { SeoService } from '../../../core/seo.service';
import { ToastService } from '../../../core/toast.service';
import { ToolService } from '../../../core/tool.service';
import { canonicalUrl } from '../../../core/site.config';
import { IconComponent } from '../icon/icon.component';
import { ToolCardComponent } from '../tool-card/tool-card.component';

/**
 * The shell every tool page shares: breadcrumb, header with favourite and
 * share actions, the tool UI itself, then FAQ, long-form copy and related
 * tools — all sourced from the registry so a tool component only has to
 * supply its interactive part.
 */
@Component({
  selector: 'app-tool-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  template: `
    @let t = tool();
    @if (t) {
      <article class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <nav class="mb-5 flex items-center gap-1.5 text-sm text-faint" aria-label="Breadcrumb">
          <a routerLink="/" class="transition-colors hover:text-fg">Home</a>
          <app-icon name="chevron-right" class="h-3.5 w-3.5" />
          <a [routerLink]="['/category', t.category]" class="transition-colors hover:text-fg">
            {{ categoryName() }}
          </a>
          <app-icon name="chevron-right" class="h-3.5 w-3.5" />
          <span class="truncate text-muted" aria-current="page">{{ t.name }}</span>
        </nav>

        <header class="animate-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"
          >
            <app-icon [name]="t.icon" class="h-6 w-6" />
          </span>
          <div class="min-w-0 flex-1">
            <h1 class="text-3xl font-bold tracking-tight text-balance text-fg md:text-4xl">
              {{ t.name }}
            </h1>
            <p class="mt-2 text-lg leading-relaxed text-muted">{{ t.description }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="btn btn-secondary"
              [attr.aria-pressed]="isFavorite()"
              (click)="toggleFavorite()"
            >
              <app-icon [name]="isFavorite() ? 'heart-filled' : 'heart'" class="h-4 w-4" />
              <span class="sr-only sm:not-sr-only">{{ isFavorite() ? 'Saved' : 'Save' }}</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="share()">
              <app-icon name="share" class="h-4 w-4" />
              <span class="sr-only sm:not-sr-only">Share</span>
            </button>
          </div>
        </header>

        <section class="card animate-rise p-4 sm:p-6" aria-label="{{ t.name }} tool">
          <ng-content />
        </section>

        <section class="mt-14">
          <h2 class="mb-4 text-2xl font-bold tracking-tight text-fg">About {{ t.name }}</h2>
          <div class="prose-qt max-w-none">
            @for (paragraph of t.about; track $index) {
              <p>{{ paragraph }}</p>
            }
            <ng-content select="[extraCopy]" />
          </div>
        </section>

        @if (t.faqs.length) {
          <section class="mt-12">
            <h2 class="mb-4 text-2xl font-bold tracking-tight text-fg">Frequently asked questions</h2>
            <div class="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              @for (faq of t.faqs; track faq.q) {
                <details class="group bg-surface">
                  <summary
                    class="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-medium text-fg hover:bg-brand-soft"
                  >
                    {{ faq.q }}
                    <app-icon
                      name="chevron-down"
                      class="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p class="px-4 pb-4 leading-relaxed text-muted">{{ faq.a }}</p>
                </details>
              }
            </div>
          </section>
        }

        @if (related().length) {
          <section class="mt-12">
            <h2 class="mb-4 text-2xl font-bold tracking-tight text-fg">Related tools</h2>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (rel of related(); track rel.id) {
                <app-tool-card [tool]="rel" />
              }
            </div>
          </section>
        }
      </article>
    } @else {
      <div class="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 class="text-2xl font-bold text-fg">Tool not found</h1>
        <p class="mt-2 text-muted">This tool is not in the registry.</p>
        <a routerLink="/tools" class="btn btn-primary mt-6">Browse all tools</a>
      </div>
    }
  `,
})
export class ToolLayoutComponent implements OnInit {
  readonly toolId = input.required<string>();

  private readonly toolService = inject(ToolService);
  private readonly seo = inject(SeoService);
  private readonly clipboard = inject(ClipboardService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  protected readonly tool = computed(() => this.toolService.get(this.toolId()));
  protected readonly categoryName = computed(() => {
    const t = this.tool();
    return t ? (this.toolService.category(t.category)?.name ?? '') : '';
  });
  protected readonly related = computed(() => {
    const t = this.tool();
    return t ? this.toolService.related(t, 3) : [];
  });

  /** Local mirror so the button re-renders under OnPush. */
  protected readonly isFavorite = signal(false);

  ngOnInit(): void {
    // `toolId` is a static literal on every tool page, so resolving it once is
    // enough; there is no id-change case to handle.
    const t = this.tool();
    if (!t) return;
    this.seo.applyForTool(t, this.categoryName());
    this.toolService.addRecent(t.id);
    this.isFavorite.set(this.toolService.isFavorite(t.id));
  }

  protected toggleFavorite(): void {
    const t = this.tool();
    if (!t) return;
    const added = this.toolService.toggleFavorite(t.id);
    this.isFavorite.set(added);
    this.toast.success(added ? `${t.name} saved to favourites` : `${t.name} removed from favourites`);
  }

  protected async share(): Promise<void> {
    const t = this.tool();
    if (!t) return;
    const url = canonicalUrl(`/tools/${t.id}`);
    const nav = this.document.defaultView?.navigator;

    if (nav && 'share' in nav) {
      try {
        await nav.share({ title: t.name, text: t.description, url });
        return;
      } catch {
        // The user dismissed the sheet, or sharing is unavailable — fall back
        // to copying the link.
      }
    }
    await this.clipboard.copy(url, 'Link copied to clipboard');
  }
}

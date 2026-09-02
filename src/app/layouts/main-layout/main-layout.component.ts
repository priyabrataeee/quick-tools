import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommandPaletteService } from '../../core/command-palette.service';
import { ThemeService } from '../../core/theme.service';
import { ToolService } from '../../core/tool.service';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToastContainerComponent } from '../../shared/components/toast/toast-container.component';

@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    CommandPaletteComponent,
    ToastContainerComponent,
  ],
  template: `
    <a
      href="#main"
      class="sr-only-focusable absolute top-2 left-2 z-[70] rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg"
    >
      Skip to content
    </a>

    <app-command-palette />
    <app-toast-container />

    <div class="flex min-h-screen flex-col bg-bg text-fg">
      <header class="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a routerLink="/" class="flex shrink-0 items-center gap-2">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg"
            >
              <app-icon name="bolt" class="h-4.5 w-4.5" />
            </span>
            <span class="text-lg font-bold tracking-tight">
              OnDevice <span class="text-brand">Tools</span>
            </span>
          </a>

          <nav class="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            @for (link of navLinks; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="text-fg bg-surface-strong"
                [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                class="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
              >
                {{ link.label }}
              </a>
            }
          </nav>

          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              class="hidden items-center gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-sm text-faint transition-colors hover:border-line-strong hover:text-fg sm:flex"
              (click)="palette.open()"
            >
              <app-icon name="search" class="h-4 w-4" />
              <span>Search tools</span>
              <kbd class="kbd ml-3">Ctrl K</kbd>
            </button>

            <button
              type="button"
              class="btn btn-ghost h-9 w-9 !p-0 sm:hidden"
              (click)="palette.open()"
              aria-label="Search tools"
            >
              <app-icon name="search" class="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              class="btn btn-ghost h-9 w-9 !p-0"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
            >
              <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" class="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              class="btn btn-ghost h-9 w-9 !p-0 md:hidden"
              (click)="mobileOpen.set(!mobileOpen())"
              [attr.aria-expanded]="mobileOpen()"
              aria-label="Toggle navigation menu"
            >
              <app-icon [name]="mobileOpen() ? 'x' : 'menu'" class="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        @if (mobileOpen()) {
          <nav class="border-t border-line px-4 py-3 md:hidden" aria-label="Mobile">
            @for (link of navLinks; track link.path) {
              <a
                [routerLink]="link.path"
                (click)="mobileOpen.set(false)"
                class="block rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-strong hover:text-fg"
              >
                {{ link.label }}
              </a>
            }
          </nav>
        }
      </header>

      <main id="main" class="flex-1">
        <router-outlet />
      </main>

      <footer class="mt-16 border-t border-line bg-bg-subtle">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div class="grid gap-10 md:grid-cols-[1.5fr_2fr]">
            <div>
              <a routerLink="/" class="flex items-center gap-2">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
                  <app-icon name="bolt" class="h-4.5 w-4.5" />
                </span>
                <span class="text-lg font-bold tracking-tight">
                  OnDevice <span class="text-brand">Tools</span>
                </span>
              </a>
              <p class="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                {{ toolCount }} free utilities that run entirely in your browser. No sign-up, no
                uploads, no tracking — your data never leaves your device.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-6 sm:grid-cols-3">
              @for (group of footerGroups(); track group.title) {
                <div>
                  <h2 class="mb-3 text-xs font-semibold tracking-wider text-faint uppercase">
                    {{ group.title }}
                  </h2>
                  <ul class="space-y-2">
                    @for (item of group.items; track item.path) {
                      <li>
                        <a
                          [routerLink]="item.path"
                          class="text-sm text-muted transition-colors hover:text-fg"
                          >{{ item.label }}</a
                        >
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          </div>

          <div
            class="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-sm text-faint sm:flex-row"
          >
            <p>© {{ year }} OnDevice Tools — free forever, no account required.</p>
            <p class="flex items-center gap-1.5">
              <app-icon name="lock" class="h-3.5 w-3.5" />
              100% client-side processing
            </p>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class MainLayoutComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly palette = inject(CommandPaletteService);
  private readonly toolService = inject(ToolService);

  protected readonly mobileOpen = signal(false);
  protected readonly year = new Date().getFullYear();
  protected readonly toolCount = this.toolService.tools().length;

  protected readonly navLinks = [
    { path: '/', label: 'Home' },
    { path: '/tools', label: 'All tools' },
    { path: '/favorites', label: 'Favourites' },
  ];

  /** Category links, chunked into three footer columns. */
  protected readonly footerGroups = () => {
    const categories = this.toolService.categories();
    const perColumn = Math.ceil(categories.length / 2);
    return [
      {
        title: 'Categories',
        items: categories.slice(0, perColumn).map((c) => ({ path: `/category/${c.id}`, label: c.name })),
      },
      {
        title: 'More categories',
        items: categories.slice(perColumn).map((c) => ({ path: `/category/${c.id}`, label: c.name })),
      },
      {
        title: 'Site',
        items: [
          { path: '/tools', label: 'All tools' },
          { path: '/favorites', label: 'Favourites' },
          { path: '/privacy', label: 'Privacy' },
        ],
      },
    ];
  };
}

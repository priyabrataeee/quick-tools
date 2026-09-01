import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommandPaletteService } from '../../../core/command-palette.service';
import { ToolService } from '../../../core/tool.service';
import { Tool } from '../../../core/tool.types';
import { IconComponent } from '../icon/icon.component';

/**
 * Global Ctrl/Cmd+K command palette.
 *
 * Open state lives in CommandPaletteService so any control can trigger it
 * directly instead of dispatching a fake keyboard event.
 */
@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    @if (palette.isOpen()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[18vh]">
        <div
          class="animate-fade fixed inset-0 bg-black/50 backdrop-blur-sm"
          (click)="palette.close()"
          aria-hidden="true"
        ></div>

        <div
          class="animate-pop relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Search tools"
        >
          <div class="flex items-center gap-3 border-b border-line px-4">
            <app-icon name="search" class="h-5 w-5 text-faint" />
            <input
              #searchInput
              type="text"
              class="w-full border-none bg-transparent py-4 text-base text-fg outline-none placeholder:text-faint"
              placeholder="Search tools, categories, keywords…"
              autocomplete="off"
              spellcheck="false"
              role="combobox"
              aria-expanded="true"
              aria-controls="qt-palette-results"
              [attr.aria-activedescendant]="results().length ? 'qt-opt-' + activeIndex() : null"
              [value]="query()"
              (input)="onInput($event)"
            />
            <kbd class="kbd">Esc</kbd>
          </div>

          <div id="qt-palette-results" class="flex-1 overflow-y-auto p-2" role="listbox">
            @if (results().length === 0) {
              <p class="px-3 py-10 text-center text-sm text-muted">
                No tools match “{{ query() }}”.
              </p>
            } @else {
              <p class="px-3 py-2 text-xs font-semibold tracking-wider text-faint uppercase">
                {{ query() ? 'Results' : 'Popular tools' }}
              </p>
              <ul>
                @for (tool of results(); track tool.id; let i = $index) {
                  <li>
                    <button
                      type="button"
                      [id]="'qt-opt-' + i"
                      role="option"
                      [attr.aria-selected]="i === activeIndex()"
                      class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                      [class.bg-brand-soft]="i === activeIndex()"
                      (mouseenter)="activeIndex.set(i)"
                      (click)="go(tool)"
                    >
                      <span
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
                      >
                        <app-icon [name]="tool.icon" class="h-4.5 w-4.5" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium text-fg">{{ tool.name }}</span>
                        <span class="block truncate text-xs text-muted">{{ tool.description }}</span>
                      </span>
                      <app-icon name="chevron-right" class="h-4 w-4 text-faint" />
                    </button>
                  </li>
                }
              </ul>
            }
          </div>

          <footer
            class="flex items-center gap-4 border-t border-line bg-bg-subtle px-4 py-2 text-xs text-faint"
          >
            <span class="flex items-center gap-1"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> navigate</span>
            <span class="flex items-center gap-1"><kbd class="kbd">↵</kbd> open</span>
            <span class="ml-auto">{{ results().length }} shown</span>
          </footer>
        </div>
      </div>
    }
  `,
})
export class CommandPaletteComponent {
  protected readonly palette = inject(CommandPaletteService);
  private readonly toolService = inject(ToolService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly results = computed<Tool[]>(() => {
    const q = this.query();
    if (!q.trim()) {
      const popular = this.toolService.popularTools();
      return popular.length ? popular.slice(0, 8) : this.toolService.tools().slice(0, 8);
    }
    return this.toolService.search(q).slice(0, 20);
  });

  constructor() {
    // Seed the query whenever the palette opens.
    effect(() => {
      if (!this.palette.isOpen()) return;
      this.query.set(this.palette.initialQuery());
      this.activeIndex.set(0);
    });

    // Focus in a separate effect keyed on the view query: the input does not
    // exist until after the change detection pass that opened the dialog, so
    // this re-runs once `searchInput` resolves.
    effect(() => {
      const input = this.searchInput();
      if (this.palette.isOpen() && input) input.nativeElement.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (isShortcut) {
      event.preventDefault();
      this.palette.toggle();
      return;
    }

    if (!this.palette.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.palette.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        const tool = this.results()[this.activeIndex()];
        if (tool) {
          event.preventDefault();
          this.go(tool);
        }
        break;
      }
    }
  }

  private move(delta: number): void {
    const count = this.results().length;
    if (count === 0) return;
    this.activeIndex.set((this.activeIndex() + delta + count) % count);
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected go(tool: Tool): void {
    this.palette.close();
    void this.router.navigate(['/tools', tool.id]);
  }
}

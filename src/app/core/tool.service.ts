import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CATEGORIES, Category, CategoryId, Tool } from './tool.types';
import { TOOLS } from './data/tools.data';

const FAVORITES_KEY = 'qt.favorites';
const RECENT_KEY = 'qt.recent';
const MAX_RECENT = 8;

/** Reads a JSON array of strings from localStorage, tolerating corrupt values. */
function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class ToolService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly tools = signal<Tool[]>(TOOLS);
  readonly categories = signal<readonly Category[]>(CATEGORIES);

  readonly favoriteIds = signal<string[]>([]);
  readonly recentIds = signal<string[]>([]);

  /** Index for O(1) lookups by id. */
  private readonly byId = new Map(TOOLS.map((t) => [t.id, t]));

  readonly favoriteTools = computed(() =>
    this.favoriteIds()
      .map((id) => this.byId.get(id))
      .filter((t): t is Tool => !!t),
  );

  readonly recentTools = computed(() =>
    this.recentIds()
      .map((id) => this.byId.get(id))
      .filter((t): t is Tool => !!t),
  );

  readonly popularTools = computed(() => this.tools().filter((t) => t.popular));
  readonly trendingTools = computed(() => this.tools().filter((t) => t.trending));

  readonly newestTools = computed(() =>
    [...this.tools()].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 8),
  );

  constructor() {
    if (this.isBrowser) {
      this.favoriteIds.set(readList(FAVORITES_KEY));
      this.recentIds.set(readList(RECENT_KEY));
    }
  }

  get(id: string): Tool | undefined {
    return this.byId.get(id);
  }

  byCategory(category: CategoryId): Tool[] {
    return this.tools().filter((t) => t.category === category);
  }

  category(id: CategoryId): Category | undefined {
    return CATEGORIES.find((c) => c.id === id);
  }

  /** Tools in the same category, excluding the current one. */
  related(tool: Tool, limit = 6): Tool[] {
    return this.tools()
      .filter((t) => t.category === tool.category && t.id !== tool.id)
      .slice(0, limit);
  }

  /**
   * Ranked full-text search across name, description, category and keywords.
   * Ranking favours prefix matches on the name so that typing "js" surfaces
   * "JSON Formatter" before a tool that merely mentions JSON in its blurb.
   */
  search(query: string): Tool[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);

    const scored = this.tools()
      .map((tool) => ({ tool, score: this.score(tool, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));

    return scored.map((r) => r.tool);
  }

  private score(tool: Tool, terms: string[]): number {
    const name = tool.name.toLowerCase();
    const description = tool.description.toLowerCase();
    const keywords = tool.keywords.join(' ').toLowerCase();
    const category = (this.category(tool.category)?.name ?? '').toLowerCase();

    let total = 0;
    for (const term of terms) {
      let best = 0;
      if (name === term) best = 100;
      else if (name.startsWith(term)) best = 60;
      else if (name.includes(term)) best = 40;
      else if (tool.id.includes(term)) best = 35;
      else if (keywords.includes(term)) best = 20;
      else if (category.includes(term)) best = 15;
      else if (description.includes(term)) best = 10;

      // Every term must match something, otherwise the tool is not a result.
      if (best === 0) return 0;
      total += best;
    }
    return total;
  }

  isFavorite(id: string): boolean {
    return this.favoriteIds().includes(id);
  }

  toggleFavorite(id: string): boolean {
    const next = this.isFavorite(id)
      ? this.favoriteIds().filter((x) => x !== id)
      : [...this.favoriteIds(), id];
    this.favoriteIds.set(next);
    this.persist(FAVORITES_KEY, next);
    return next.includes(id);
  }

  addRecent(id: string): void {
    if (!this.isBrowser || !this.byId.has(id)) return;
    const next = [id, ...this.recentIds().filter((x) => x !== id)].slice(0, MAX_RECENT);
    this.recentIds.set(next);
    this.persist(RECENT_KEY, next);
  }

  clearRecent(): void {
    this.recentIds.set([]);
    this.persist(RECENT_KEY, []);
  }

  private persist(key: string, value: string[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be full or blocked (private mode). Losing a preference is
      // not worth breaking the page over.
    }
  }
}

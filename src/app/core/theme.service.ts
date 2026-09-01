import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'qt.theme';

/**
 * Theme is stored as a preference (light / dark / system) rather than a
 * resolved value, so that "system" keeps tracking the OS setting after a
 * reload. The resolved value is applied as a `dark` class on <html>, which is
 * what the Tailwind custom variant and the CSS variable blocks key off.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly preference = signal<ThemePreference>('system');

  /** Tracks the OS-level preference so "system" stays live. */
  private readonly systemPrefersDark = signal(false);

  readonly isDark = computed(() => {
    const pref = this.preference();
    return pref === 'system' ? this.systemPrefersDark() : pref === 'dark';
  });

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        this.preference.set(stored);
      }

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark.set(media.matches);
      media.addEventListener('change', (e) => this.systemPrefersDark.set(e.matches));
    }

    effect(() => {
      const dark = this.isDark();
      const pref = this.preference();
      if (!this.isBrowser) return;

      const root = this.document.documentElement;
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';

      const meta = this.document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#09090b' : '#ffffff');

      try {
        localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        // Ignore storage failures; the theme still applies for this session.
      }
    });
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
  }

  /** Flips between light and dark, resolving "system" to its current value. */
  toggle(): void {
    this.preference.set(this.isDark() ? 'light' : 'dark');
  }
}

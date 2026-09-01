import { Injectable, signal } from '@angular/core';

/**
 * Open/close state for the global command palette.
 *
 * This lives in a service rather than in the palette component so that any
 * button anywhere in the app can open it without resorting to synthetic
 * keyboard events.
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  readonly isOpen = signal(false);
  /** Seed text applied the next time the palette opens. */
  readonly initialQuery = signal('');

  open(query = ''): void {
    this.initialQuery.set(query);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }
}

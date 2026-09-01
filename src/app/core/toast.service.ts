import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, kind: ToastKind = 'info', durationMs = 2600): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, kind }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), durationMs),
    );
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 4000);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

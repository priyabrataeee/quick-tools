import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);

  /**
   * Copies text and reports the outcome via a toast.
   *
   * The async Clipboard API is unavailable on insecure origins and in some
   * embedded webviews, so a `document.execCommand` fallback keeps the copy
   * buttons working there rather than silently doing nothing.
   */
  async copy(text: string, label = 'Copied to clipboard'): Promise<boolean> {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        this.toast.success(label);
        return true;
      }
    } catch {
      // Fall through to the legacy path below.
    }

    try {
      const area = this.document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      this.document.body.appendChild(area);
      area.select();
      const ok = this.document.execCommand('copy');
      this.document.body.removeChild(area);
      if (ok) {
        this.toast.success(label);
        return true;
      }
    } catch {
      // Ignore and report failure below.
    }

    this.toast.error('Could not copy — press Ctrl/Cmd + C instead');
    return false;
  }
}

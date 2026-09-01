import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3 shadow-lg"
        >
          <app-icon
            [name]="toast.kind === 'success' ? 'check-circle' : toast.kind === 'error' ? 'alert' : 'info'"
            class="h-5 w-5"
            [class.text-success]="toast.kind === 'success'"
            [class.text-danger]="toast.kind === 'error'"
            [class.text-brand]="toast.kind === 'info'"
          />
          <p class="flex-1 text-sm text-fg">{{ toast.message }}</p>
          <button
            type="button"
            class="btn btn-ghost -mr-2 h-7 w-7 !p-0"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <app-icon name="x" class="h-4 w-4" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}

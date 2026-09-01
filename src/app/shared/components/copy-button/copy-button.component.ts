import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ClipboardService } from '../../../core/clipboard.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="btn"
      [class.btn-secondary]="variant() === 'secondary'"
      [class.btn-ghost]="variant() === 'ghost'"
      [class.btn-primary]="variant() === 'primary'"
      [disabled]="!value()"
      (click)="onCopy()"
      [attr.aria-label]="label() || 'Copy to clipboard'"
    >
      <app-icon [name]="copied() ? 'check' : 'copy'" class="h-4 w-4" />
      @if (label()) {
        <span>{{ copied() ? 'Copied' : label() }}</span>
      }
    </button>
  `,
})
export class CopyButtonComponent {
  readonly value = input<string>('');
  readonly label = input<string>('Copy');
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('secondary');
  /** Message shown in the toast; defaults to a generic confirmation. */
  readonly toastMessage = input<string>('Copied to clipboard');

  protected readonly copied = signal(false);
  private readonly clipboard = inject(ClipboardService);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected async onCopy(): Promise<void> {
    const ok = await this.clipboard.copy(this.value(), this.toastMessage());
    if (!ok) return;
    this.copied.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copied.set(false), 1800);
  }
}

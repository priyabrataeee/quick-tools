import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Drag-and-drop file picker.
 *
 * Files are handed straight to the parent as `File` objects — nothing is read
 * or uploaded here, which keeps every tool's "runs on your device" promise
 * honest.
 */
@Component({
  selector: 'app-upload-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="rounded-2xl border-2 border-dashed p-8 text-center transition-colors"
      [class.border-line]="!isOver()"
      [class.border-brand]="isOver()"
      [class.bg-brand-soft]="isOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <app-icon name="upload" class="mx-auto mb-3 h-8 w-8 text-brand" />
      <p class="font-medium text-fg">{{ title() }}</p>
      <p class="mt-1 text-sm text-muted">{{ hint() }}</p>

      <button type="button" class="btn btn-primary mt-4" (click)="fileInputRef().nativeElement.click()">
        <app-icon name="upload" class="h-4 w-4" />
        {{ multiple() ? 'Choose files' : 'Choose file' }}
      </button>

      <input
        #fileInput
        type="file"
        class="sr-only"
        [accept]="accept()"
        [multiple]="multiple()"
        (change)="onChange($event)"
        [attr.aria-label]="title()"
      />
    </div>
  `,
})
export class UploadZoneComponent {
  readonly accept = input('*/*');
  readonly multiple = input(false);
  readonly title = input('Drop a file here');
  readonly hint = input('or use the button below — files never leave your device');

  readonly filesSelected = output<File[]>();

  protected readonly isOver = signal(false);
  /** Named differently from the `#fileInput` template variable so the
   * template type-checker does not resolve the two to each other. */
  protected readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.filesSelected.emit(this.multiple() ? files : files.slice(0, 1));
  }

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.filesSelected.emit(files);
    // Reset so selecting the same file twice still fires a change event.
    input.value = '';
  }
}

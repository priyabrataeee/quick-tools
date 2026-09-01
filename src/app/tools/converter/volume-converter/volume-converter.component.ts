import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UnitConverterComponent } from '../shared/unit-converter.component';
import { VOLUME } from '../lib/units';

@Component({
  selector: 'app-volume-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UnitConverterComponent],
  template: `<app-unit-converter toolId="volume-converter" [group]="group" defaultUnit="l" />`,
})
export class VolumeConverterComponent {
  protected readonly group = VOLUME;
}

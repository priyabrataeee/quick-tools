import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UnitConverterComponent } from '../shared/unit-converter.component';
import { LENGTH } from '../lib/units';

@Component({
  selector: 'app-length-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UnitConverterComponent],
  template: `<app-unit-converter toolId="length-converter" [group]="group" defaultUnit="m" />`,
})
export class LengthConverterComponent {
  protected readonly group = LENGTH;
}

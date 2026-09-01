import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UnitConverterComponent } from '../shared/unit-converter.component';
import { AREA } from '../lib/units';

@Component({
  selector: 'app-area-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UnitConverterComponent],
  template: `<app-unit-converter toolId="area-converter" [group]="group" defaultUnit="m2" />`,
})
export class AreaConverterComponent {
  protected readonly group = AREA;
}

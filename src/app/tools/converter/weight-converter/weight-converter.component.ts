import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UnitConverterComponent } from '../shared/unit-converter.component';
import { WEIGHT } from '../lib/units';

@Component({
  selector: 'app-weight-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UnitConverterComponent],
  template: `<app-unit-converter toolId="weight-converter" [group]="group" defaultUnit="kg" />`,
})
export class WeightConverterComponent {
  protected readonly group = WEIGHT;
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UnitConverterComponent } from '../shared/unit-converter.component';
import { SPEED } from '../lib/units';

@Component({
  selector: 'app-speed-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UnitConverterComponent],
  template: `<app-unit-converter toolId="speed-converter" [group]="group" defaultUnit="kph" />`,
})
export class SpeedConverterComponent {
  protected readonly group = SPEED;
}

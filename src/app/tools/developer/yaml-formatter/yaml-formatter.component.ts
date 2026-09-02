import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';
import { YamlError, parseYaml, toYaml } from '../lib/yaml';

const SAMPLE_YAML = `# Deployment configuration
name: ondevice-tools
replicas: 3
image:
  repository: ghcr.io/ondevice-tools/web
  tag: "2.4.0"
  pullPolicy: IfNotPresent
env:
  - name: NODE_ENV
    value: production
  - name: LOG_LEVEL
    value: info
resources:
  limits: { cpu: 500m, memory: 512Mi }
notes: |
  Static build only.
  No backend is deployed.
`;

@Component({
  selector: 'app-yaml-formatter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="yaml-formatter">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="direction() === 'toJson'"
            (click)="setDirection('toJson')"
          >
            YAML → JSON
          </button>
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="direction() === 'toYaml'"
            (click)="setDirection('toYaml')"
          >
            JSON → YAML
          </button>

          <div class="ml-auto flex gap-2">
            <button type="button" class="btn btn-ghost" (click)="loadSample()">Load sample</button>
            <button type="button" class="btn btn-danger" (click)="input.set('')" [disabled]="!input()">
              Clear
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm">
            <p class="flex items-center gap-2 font-medium text-danger">
              <app-icon name="alert" class="h-4 w-4" />
              {{ direction() === 'toJson' ? 'Invalid YAML' : 'Invalid JSON' }}
            </p>
            <p class="mt-1 break-words text-muted">{{ error() }}</p>
          </div>
        }

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="label" for="yaml-input">
              {{ direction() === 'toJson' ? 'YAML input' : 'JSON input' }}
            </label>
            <textarea
              id="yaml-input"
              class="textarea h-[420px]"
              spellcheck="false"
              [placeholder]="direction() === 'toJson' ? 'key: value' : '{ &quot;key&quot;: &quot;value&quot; }'"
              [value]="input()"
              (input)="input.set($any($event.target).value)"
            ></textarea>
          </div>

          <app-result-panel
            [label]="direction() === 'toJson' ? 'JSON output' : 'YAML output'"
            [value]="output()"
            [downloadName]="direction() === 'toJson' ? 'converted.json' : 'converted.yaml'"
            [mimeType]="direction() === 'toJson' ? 'application/json' : 'text/yaml'"
            placeholder="Paste a document on the left."
          />
        </div>
      </div>
    </app-tool-layout>
  `,
})
export class YamlFormatterComponent {
  protected readonly direction = signal<'toJson' | 'toYaml'>('toJson');
  protected readonly input = signal('');

  private readonly result = computed<{ value: string; error: string }>(() => {
    const text = this.input().trim();
    if (!text) return { value: '', error: '' };

    try {
      if (this.direction() === 'toJson') {
        return { value: JSON.stringify(parseYaml(text), null, 2), error: '' };
      }
      return { value: toYaml(JSON.parse(text)), error: '' };
    } catch (e) {
      if (e instanceof YamlError) return { value: '', error: e.message };
      return { value: '', error: e instanceof Error ? e.message : 'Could not convert this document.' };
    }
  });

  protected readonly output = computed(() => this.result().value);
  protected readonly error = computed(() => this.result().error);

  protected setDirection(direction: 'toJson' | 'toYaml'): void {
    // Carry the current output across so switching direction round-trips.
    const current = this.output();
    this.direction.set(direction);
    if (current) this.input.set(current);
  }

  protected loadSample(): void {
    this.direction.set('toJson');
    this.input.set(SAMPLE_YAML);
  }
}

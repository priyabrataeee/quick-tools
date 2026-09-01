import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { ToolLayoutComponent } from '../../../shared/components/tool-layout/tool-layout.component';

/** Decodes a base64url segment to a UTF-8 string. */
function decodeSegment(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

interface ClaimRow {
  key: string;
  value: string;
  note: string;
}

const CLAIM_NOTES: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires at',
  nbf: 'Not valid before',
  iat: 'Issued at',
  jti: 'JWT ID',
  scope: 'Granted scopes',
  azp: 'Authorised party',
};

const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat', 'auth_time', 'updated_at']);

@Component({
  selector: 'app-jwt-decoder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolLayoutComponent, ResultPanelComponent, IconComponent],
  template: `
    <app-tool-layout toolId="jwt-decoder">
      <div class="flex flex-col gap-4">
        <div>
          <label class="label" for="jwt-input">JSON Web Token</label>
          <textarea
            id="jwt-input"
            class="textarea h-32"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.signature"
            spellcheck="false"
            [value]="input()"
            (input)="onInput($event)"
          ></textarea>
          <p class="mt-1 flex items-center gap-1.5 text-xs text-faint">
            <app-icon name="lock" class="h-3.5 w-3.5" />
            Decoded locally. The signature is never verified, so no secret is required.
          </p>
        </div>

        @if (error()) {
          <div class="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            {{ error() }}
          </div>
        }

        @if (payloadJson()) {
          @if (expiryState(); as state) {
            <div
              class="flex items-center gap-2 rounded-xl border p-3 text-sm"
              [class]="
                state.expired
                  ? 'border-danger/40 bg-danger-soft text-danger'
                  : 'border-success/40 bg-success-soft text-success'
              "
            >
              <app-icon [name]="state.expired ? 'alert' : 'check-circle'" class="h-4 w-4" />
              {{ state.label }}
            </div>
          }

          <div class="grid gap-4 lg:grid-cols-2">
            <app-result-panel label="Header" [value]="headerJson()" downloadName="jwt-header.json" />
            <app-result-panel label="Payload" [value]="payloadJson()" downloadName="jwt-payload.json" />
          </div>

          @if (claims().length) {
            <section class="overflow-hidden rounded-xl border border-line">
              <h3 class="border-b border-line bg-bg-subtle px-3 py-2 text-xs font-semibold tracking-wide text-faint uppercase">
                Claims
              </h3>
              <table class="w-full text-sm">
                <tbody class="divide-y divide-line">
                  @for (claim of claims(); track claim.key) {
                    <tr>
                      <td class="w-32 px-3 py-2 font-mono text-brand align-top">{{ claim.key }}</td>
                      <td class="px-3 py-2 break-all text-fg">{{ claim.value }}</td>
                      <td class="w-40 px-3 py-2 text-right text-xs text-faint">{{ claim.note }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }

          <p class="rounded-xl border border-line bg-bg-subtle p-3 text-xs text-muted">
            <strong class="text-fg">Signature:</strong>
            <span class="font-mono break-all">{{ signature() || '(none)' }}</span>
          </p>
        }
      </div>
    </app-tool-layout>
  `,
})
export class JwtDecoderComponent {
  protected readonly input = signal('');
  protected readonly error = signal('');
  protected readonly headerJson = signal('');
  protected readonly payloadJson = signal('');
  protected readonly signature = signal('');
  private readonly payload = signal<Record<string, unknown> | null>(null);

  protected readonly claims = computed<ClaimRow[]>(() => {
    const data = this.payload();
    if (!data) return [];
    return Object.entries(data).map(([key, value]) => ({
      key,
      value: this.formatClaim(key, value),
      note: CLAIM_NOTES[key] ?? '',
    }));
  });

  protected readonly expiryState = computed(() => {
    const data = this.payload();
    const exp = data?.['exp'];
    if (typeof exp !== 'number') return null;
    const date = new Date(exp * 1000);
    const expired = date.getTime() < Date.now();
    return {
      expired,
      label: expired
        ? `Expired on ${date.toLocaleString()}`
        : `Valid until ${date.toLocaleString()}`,
    };
  });

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value.trim();
    this.input.set(raw);
    this.decode(raw);
  }

  private decode(raw: string): void {
    this.error.set('');
    this.headerJson.set('');
    this.payloadJson.set('');
    this.signature.set('');
    this.payload.set(null);

    if (!raw) return;

    const token = raw.replace(/^Bearer\s+/i, '').trim();
    const parts = token.split('.');
    if (parts.length < 2) {
      this.error.set('A JWT has at least two dot-separated segments. This does not look like one.');
      return;
    }

    try {
      const header = JSON.parse(decodeSegment(parts[0])) as Record<string, unknown>;
      const payload = JSON.parse(decodeSegment(parts[1])) as Record<string, unknown>;
      this.headerJson.set(JSON.stringify(header, null, 2));
      this.payloadJson.set(JSON.stringify(payload, null, 2));
      this.payload.set(payload);
      this.signature.set(parts[2] ?? '');
    } catch {
      this.error.set('Could not decode this token. The header or payload is not valid base64url JSON.');
    }
  }

  private formatClaim(key: string, value: unknown): string {
    if (TIME_CLAIMS.has(key) && typeof value === 'number') {
      return `${value} — ${new Date(value * 1000).toLocaleString()}`;
    }
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  }
}

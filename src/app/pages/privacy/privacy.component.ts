import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">Privacy</h1>
      <p class="mt-3 text-lg text-muted">
        The short version: OnDevice Tools has no backend, so there is nowhere for your data to go.
      </p>

      <div class="prose-qt mt-8">
        <h2>What we collect</h2>
        <p>
          Nothing. OnDevice Tools is a static site. There is no account system, no analytics script, no
          advertising network and no server-side processing of anything you type, paste or upload.
        </p>

        <h2>How the tools work</h2>
        <p>
          Every tool runs as JavaScript inside your browser tab. When you format JSON, compress an
          image or merge a PDF, the work happens on your own device using standard web APIs. The
          file never crosses the network.
        </p>

        <h2>What is stored on your device</h2>
        <p>
          Three small values are kept in your browser's local storage so the site remembers your
          preferences between visits:
        </p>
        <ul>
          <li><code>qt.theme</code> — whether you chose light, dark or system appearance.</li>
          <li><code>qt.favorites</code> — the list of tools you saved.</li>
          <li><code>qt.recent</code> — the last few tools you opened.</li>
        </ul>
        <p>
          These never leave your browser. Clearing your site data removes them permanently, and the
          site works exactly the same without them.
        </p>

        <h2>Third-party requests</h2>
        <p>
          The site loads its web font from Google Fonts. If you would rather avoid that request
          entirely, blocking it changes nothing except the typeface. Once the service worker has
          cached the app, OnDevice Tools works fully offline.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this page, or a tool behaving unexpectedly? Head back to the
          <a routerLink="/">home page</a> and use any tool — there is no form here that would send
          us anything.
        </p>
      </div>
    </div>
  `,
})
export class PrivacyComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.apply({
      title: 'Privacy',
      description:
        'OnDevice Tools has no backend and collects nothing. Every tool runs in your browser and your files never leave your device.',
      path: '/privacy',
      keywords: ['privacy', 'no tracking', 'client-side', 'data protection'],
    });
  }
}

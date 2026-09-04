import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { EMAIL, SITE_NAME } from '../../core/site.config';

@Component({
  selector: 'app-terms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">Terms of use</h1>
      <p class="mt-3 text-lg text-muted">
        Short, because there is not much to agree to: no account, no payment, and no data held on
        your behalf.
      </p>
      <p class="mt-2 text-sm text-faint">Last updated {{ updated }}</p>

      <div class="prose-qt mt-8">
        <h2>1. Accepting these terms</h2>
        <p>
          By using {{ siteName }} you accept the terms on this page. If you do not accept them,
          please do not use the site. There is nothing to cancel or delete if you change your
          mind, because nothing about you is stored on our side.
        </p>

        <h2>2. What the service is</h2>
        <p>
          {{ siteName }} provides free browser-based utilities. All processing happens locally in
          your browser using standard web APIs. The site does not receive, store or transmit the
          content you paste, type or open in a tool.
        </p>

        <h2>3. Free, with no guarantee of availability</h2>
        <p>
          The tools are free to use for personal and commercial work alike, with no usage limits
          and no attribution required. In return, the service is provided on an "as is" and "as
          available" basis. Tools may be changed, renamed or withdrawn, and the site may be
          unavailable at any time without notice.
        </p>

        <h2>4. No warranty on results — verify anything that matters</h2>
        <p>
          The tools are built carefully and tested, but they are supplied without warranty of any
          kind, express or implied, including fitness for a particular purpose. You are
          responsible for checking any output before you rely on it.
        </p>
        <p>
          This matters most for the calculators. Figures produced by the loan, tax, interest and
          investment tools are illustrative and are not financial, tax, legal or investment
          advice. They may not reflect current rates, local rules, fees or rounding conventions
          used by any particular institution. Do not make a financial decision on their output
          without confirming it with a qualified professional or the institution concerned.
        </p>

        <h2>5. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, {{ siteName }} and its operator are not liable
          for any loss or damage arising from your use of the site — including lost data, lost
          profits, corrupted files, or decisions taken on the basis of a tool's output. Because
          your files are processed only on your own device, you should keep your own backups of
          anything important before transforming it.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be excluded.
        </p>

        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the site for anything unlawful, or to process material you have no right to;</li>
          <li>
            attempt to disrupt the site or the network it is served from, including automated
            request flooding;
          </li>
          <li>
            scrape or re-host the site's pages in bulk in a way that presents them as your own;
          </li>
          <li>interfere with or attempt to obscure the advertising on the site.</li>
        </ul>

        <h2>7. Your content</h2>
        <p>
          You keep every right in the content you process. No licence is granted to us over it,
          for the straightforward reason that we never receive it.
        </p>

        <h2>8. Our content</h2>
        <p>
          The site's name, design, written explanations and tool implementations are the property
          of the operator and protected by copyright. Output <em>produced by</em> a tool from your
          own input is yours to use however you like, with no restriction.
        </p>

        <h2>9. Advertising and third parties</h2>
        <p>
          The site is funded by advertising and may display ads served by Google and its partners.
          Those ads are supplied by third parties whose own terms and privacy policies apply to
          them. We do not endorse advertised products, and we are not party to any transaction you
          enter into with an advertiser. See the <a routerLink="/privacy">privacy page</a> for
          what advertising can and cannot access.
        </p>

        <h2>10. External links</h2>
        <p>
          The site links to third-party documentation and standards. We do not control those sites
          and are not responsible for their content or practices.
        </p>

        <h2>11. Changes to these terms</h2>
        <p>
          These terms may be updated as the site changes. The "last updated" date above always
          reflects the current version, and continuing to use the site after a change means you
          accept the revised terms.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these terms: <a [href]="'mailto:' + email">{{ email }}</a>. Data
          protection and privacy questions go to
          <a [href]="'mailto:' + privacyEmail">{{ privacyEmail }}</a> instead — see the
          <a routerLink="/contact">contact page</a> for the full list.
        </p>
      </div>
    </div>
  `,
})
export class TermsComponent implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly siteName = SITE_NAME;
  protected readonly email = EMAIL.contact;
  protected readonly privacyEmail = EMAIL.privacy;
  protected readonly updated = 'September 2026';

  ngOnInit(): void {
    this.seo.apply({
      title: 'Terms of Use',
      description:
        'Terms of use for OnDevice Tools: free browser-based utilities provided as is, with no account, no stored data and no warranty on results.',
      path: '/terms',
      keywords: ['terms of use', 'terms and conditions', 'disclaimer', 'legal'],
    });
  }
}

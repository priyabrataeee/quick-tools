import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { DONATION_URL, EMAIL, SITE_AUTHOR } from '../../core/site.config';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">Contact</h1>
      <p class="mt-3 text-lg text-muted">
        Three addresses, all read by one person. There is no contact form here — a form would
        need a server, and this site does not have one.
      </p>

      <ul class="mt-8 grid gap-3 sm:grid-cols-3">
        @for (route of routes; track route.address) {
          <li class="card flex flex-col gap-1 p-4">
            <span class="text-xs font-semibold tracking-wider text-faint uppercase">
              {{ route.label }}
            </span>
            <a
              [href]="'mailto:' + route.address"
              class="font-medium break-all text-brand hover:underline"
              rel="nofollow"
            >
              {{ route.address }}
            </a>
            <span class="text-sm text-muted">{{ route.use }}</span>
          </li>
        }
      </ul>

      <div class="prose-qt mt-10">
        <h2>What to write about</h2>
        <p>
          {{ author }} maintains OnDevice Tools alone, so mail arrives directly rather than through
          a support queue. Anything below is best sent to
          <a [href]="'mailto:' + email.support">{{ email.support }}</a>:
        </p>
        <ul>
          <li>
            <strong>A tool giving the wrong answer.</strong> The most valuable report there is.
            Include the input you used and what you expected — with a client-side tool, a specific
            input is usually enough to reproduce the bug exactly.
          </li>
          <li>
            <strong>A tool that will not load or breaks in your browser.</strong> Mention the
            browser and version; edge cases in Safari and older Chromium builds are the usual
            culprits.
          </li>
          <li>
            <strong>A request for a new tool.</strong> Say what you are actually trying to
            accomplish rather than just naming a feature — it often changes the answer.
          </li>
          <li>
            <strong>A correction to the wording anywhere on the site,</strong> including anything
            on the <a routerLink="/privacy">privacy</a> or <a routerLink="/about">about</a> pages
            that reads as overstated.
          </li>
        </ul>
        <p>
          Advertising, licensing and press enquiries go to
          <a [href]="'mailto:' + email.contact">{{ email.contact }}</a>. Anything about data
          protection, cookies or the privacy policy goes to
          <a [href]="'mailto:' + email.privacy">{{ email.privacy }}</a>, which is monitored
          separately.
        </p>

        <h2>What not to send</h2>
        <p>
          Please do not attach the file you were processing. Almost every bug report can be
          reproduced from a description or a small sample, and since the site never receives your
          data by design, emailing it defeats the point of using this site in the first place. If
          a specific file really is required to reproduce something, redact it first.
        </p>

        <h2>Response time</h2>
        <p>
          This is a side project, not a company. Expect a reply within a few days rather than
          within an hour. Reports of a tool producing a wrong result jump the queue, because a
          quietly incorrect calculator is worse than a broken one.
        </p>

        <h2>Privacy of what you send</h2>
        <p>
          Email you send is stored in an ordinary mailbox and used only to answer you. It is not
          added to a mailing list, not shared, and not used for anything else. The rest of the
          site's data practices are on the <a routerLink="/privacy">privacy page</a>.
        </p>

        <h2>Supporting the site</h2>
        <p>
          OnDevice Tools is free and stays free. If it saved you some time and you would rather
          contribute directly than see ads, you can
          <a [href]="donationUrl" target="_blank" rel="noopener nofollow">buy me a coffee</a>.
          Entirely optional — nothing on the site is gated behind it.
        </p>
      </div>
    </div>
  `,
})
export class ContactComponent implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly email = EMAIL;
  protected readonly author = SITE_AUTHOR;
  protected readonly donationUrl = DONATION_URL;

  protected readonly routes = [
    { label: 'General', address: EMAIL.contact, use: 'Enquiries, advertising, press.' },
    { label: 'Support', address: EMAIL.support, use: 'Bugs, wrong results, tool requests.' },
    { label: 'Privacy', address: EMAIL.privacy, use: 'Data protection and policy questions.' },
  ];

  ngOnInit(): void {
    this.seo.apply({
      title: 'Contact',
      description:
        'How to reach OnDevice Tools with bug reports, tool requests, corrections and advertising enquiries.',
      path: '/contact',
      keywords: ['contact', 'support', 'bug report', 'feedback'],
    });
  }
}

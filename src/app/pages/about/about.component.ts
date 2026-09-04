import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { DONATION_URL, EMAIL, SITE_AUTHOR, SITE_FOUNDED } from '../../core/site.config';
import { ToolService } from '../../core/tool.service';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">About OnDevice Tools</h1>
      <p class="mt-3 text-lg text-muted">
        {{ toolCount }} everyday utilities that do their work inside your browser tab, because
        there is no server here to send anything to.
      </p>

      <div class="prose-qt mt-8">
        <h2>Why this site exists</h2>
        <p>
          Most free online tools work the same way: you choose a file, the page uploads it to a
          server you know nothing about, something happens there, and a result comes back. For a
          throwaway snippet that is fine. For a contract, a passport scan, a database dump or a
          JSON Web Token from a live environment, it is a decision most people would not make
          consciously if the page said out loud what it was doing.
        </p>
        <p>
          OnDevice Tools was built to remove that decision. Every tool here is written in
          JavaScript that runs on your own machine. Your file is read by the browser, processed by
          the browser, and handed back by the browser. There is no upload step to opt out of,
          because there is no server capable of receiving one.
        </p>

        <h2>How it actually works</h2>
        <p>
          The site is a static build. Each of the {{ toolCount }} tools is prerendered to plain
          HTML at build time and served as a file from a CDN — the same way an image is served.
          When you open a tool, the browser downloads a small JavaScript bundle for that one tool
          and runs it locally.
        </p>
        <p>
          The heavy lifting uses capabilities browsers already ship: the Canvas API for image
          compression and resizing, the File API for reading files you choose, Web Crypto for
          hashing, and the built-in JSON and text parsers for the developer tools. Longer jobs run
          in a Web Worker so the page stays responsive. Nothing about that pipeline involves a
          network request.
        </p>
        <p>
          A service worker caches the app after your first visit, so the tools keep working with
          no connection at all. That is the simplest proof of the claim: something that genuinely
          uploads your data cannot run on a plane.
        </p>

        <h2>What this means in practice</h2>
        <ul>
          <li><strong>It is instant.</strong> No upload, no queue, no round trip.</li>
          <li>
            <strong>It works on files you should not upload.</strong> Client data, credentials,
            anything under an NDA.
          </li>
          <li>
            <strong>There is no size limit imposed by a server</strong> — only what your own
            device can comfortably hold in memory.
          </li>
          <li><strong>It works offline</strong> once cached, including on a plane or a train.</li>
          <li><strong>There is no account.</strong> Nothing to sign up for, nothing to cancel.</li>
        </ul>

        <h2>Who builds it</h2>
        <p>
          OnDevice Tools is built and maintained by {{ author }}, an independent developer. It
          started in {{ founded }} as a handful of tools that solved problems I kept hitting, and
          grew as I got tired of pasting things into sites I did not trust.
        </p>
        <p>
          It is a one-person project, which is why tools ship steadily rather than all at once,
          and why the feedback loop is short: if something is wrong, mail
          <a [href]="'mailto:' + email.support">{{ email.support }}</a> and it usually gets fixed
          the same week.
        </p>

        <h2>How it is paid for</h2>
        <p>
          Serving static files from a CDN costs very little, which is the main reason this can be
          free with no usage limits. Running costs are covered by advertising. Ads are display
          units on the page — they never see the contents of the tool you are using, because that
          content is never sent anywhere for them to see.
        </p>
        <p>
          Exactly what advertising does and does not have access to is set out on the
          <a routerLink="/privacy">privacy page</a>, in plain language.
        </p>
        <p>
          If you would rather support the site directly than see ads, you can
          <a [href]="donationUrl" target="_blank" rel="noopener nofollow">buy me a coffee</a>.
          It is genuinely optional: there is no membership, no ad-free tier and nothing withheld
          from anyone who does not.
        </p>

        <h2>What is not here</h2>
        <p>
          No account system, no cloud storage, no sync between devices, no team features and no
          paid tier. Those would all require a backend, and the absence of a backend is the entire
          point. If you need a tool that remembers your work across machines, this is the wrong
          site — and that is a deliberate trade.
        </p>

        <h2>Get in touch</h2>
        <p>
          Bug reports and tool requests go to
          <a [href]="'mailto:' + email.support">{{ email.support }}</a>, anything else to
          <a [href]="'mailto:' + email.contact">{{ email.contact }}</a> — see the
          <a routerLink="/contact">contact page</a> for which is which. Requests for a tool that
          would need a server get an honest no rather than a maybe.
        </p>
      </div>
    </div>
  `,
})
export class AboutComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly toolService = inject(ToolService);

  protected readonly toolCount = this.toolService.tools().length;
  protected readonly author = SITE_AUTHOR;
  protected readonly founded = SITE_FOUNDED;
  protected readonly email = EMAIL;
  protected readonly donationUrl = DONATION_URL;

  ngOnInit(): void {
    this.seo.apply({
      title: 'About',
      description: `Who builds OnDevice Tools, how ${this.toolCount} browser-based utilities run without a server, and how the site is funded.`,
      path: '/about',
      keywords: ['about', 'client-side tools', 'no upload', 'privacy first', 'how it works'],
    });
  }
}

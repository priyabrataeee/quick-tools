import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { ADS_ENABLED, CF_ANALYTICS_TOKEN, DONATION_URL, EMAIL } from '../../core/site.config';

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">Privacy</h1>
      <p class="mt-3 text-lg text-muted">
        The short version: the files and text you put into a tool never leave your device. The
        advertising that funds the site does use cookies, and this page explains exactly where the
        line falls.
      </p>
      <p class="mt-2 text-sm text-faint">Last updated {{ updated }}</p>

      <div class="prose-qt mt-8">
        <h2>The one distinction that matters</h2>
        <p>
          Two different things happen on a page here, and it is worth separating them clearly
          rather than making a single sweeping claim.
        </p>
        <ul>
          <li>
            <strong>Your content — never transmitted.</strong> The JSON you paste, the image you
            compress, the PDF you merge, the password you hash. This is processed entirely by
            JavaScript running in your browser. It is never uploaded, never seen by us, and never
            seen by any advertiser. This is a property of how the site is built, not a promise
            about how we behave.
          </li>
          <li>
            <strong>Your visit — measured, like on most sites.</strong> That you opened a
            particular page, roughly where in the world you are, and what browser you use. The ad
            network sees this, and uses cookies for it.
          </li>
        </ul>
        <p>
          An advertiser can know you visited the image compressor. It cannot know anything about
          the image, because the image was never sent anywhere.
        </p>

        <h2>How the tools work</h2>
        <p>
          Every tool runs as JavaScript inside your browser tab, using standard web APIs — Canvas
          for images, the File API for reading files you choose, Web Crypto for hashing, the
          built-in parsers for JSON, XML and YAML. There is no backend that could receive your
          data, so there is no upload to opt out of.
        </p>
        <p>
          You can verify this yourself in about thirty seconds: open your browser's developer
          tools, switch to the Network tab, and run any tool. You will see no request carrying
          your input. Or disconnect from the internet entirely — once the service worker has
          cached the site, every tool still works.
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
          These stay in your browser and are never transmitted. Clearing your site data removes
          them permanently, and every tool works exactly the same without them.
        </p>

        @if (adsEnabled) {
        <h2>Advertising</h2>
        <p>
          This site is free with no usage limits, and it is funded by advertising rather than by
          subscriptions or by selling data. Ads are served by
          <strong>Google AdSense</strong>.
        </p>
        <p>To be specific about what that involves:</p>
        <ul>
          <li>
            Google, as a third-party vendor, uses cookies to serve ads on this site. The
            DoubleClick DART cookie enables Google and its partners to serve ads based on your
            visit to this and other sites on the internet.
          </li>
          <li>
            Third-party vendors and ad networks may also use cookies, web beacons or similar
            technologies to measure ad performance and limit how often you see the same ad.
          </li>
          <li>
            These cookies may be used to show you personalised ads. Where required by law, you are
            asked for consent before that happens, and you can decline and still use every tool on
            the site.
          </li>
          <li>
            Ad units are ordinary display slots on the page. They run in isolated frames and have
            no access to what you type into a tool, what file you opened, or the result the tool
            produced.
          </li>
        </ul>
        <p>
          You can opt out of personalised advertising by Google at
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener nofollow"
            >Google Ads Settings</a
          >, and opt out of many other vendors at
          <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener nofollow"
            >aboutads.info</a
          >
          or
          <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener nofollow"
            >the NAI opt-out page</a
          >. Blocking ads with an extension also works, and nothing on the site breaks if you do —
          there is no wall, no nag and no reduced functionality.
        </p>
        <p>
          Google's own explanation of how it uses data from sites that use its services is at
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener nofollow"
            >policies.google.com/technologies/partner-sites</a
          >.
        </p>
        <p>
          If you would rather not see ads at all, blocking them is fine by us — and if you want to
          support the site directly instead, you can
          <a [href]="donationUrl" target="_blank" rel="noopener nofollow">buy me a coffee</a>.
        </p>
        }

        <h2>Analytics</h2>
        @if (analyticsEnabled) {
          <p>
            Aggregate traffic measurement is done with Cloudflare Web Analytics, which is cookieless
            and does not fingerprint or track individuals across sites. It records page views and
            referrers in aggregate. There is no Google Analytics on this site.
          </p>
        } @else {
          <p>
            There is no analytics script on this site at all — no Google Analytics, no product
            analytics, nothing that records your visit on our behalf.
          </p>
        }

        <h2>Other third-party requests</h2>
        <ul>
          <li>
            <strong>Google Fonts</strong> serves the site's typeface. Blocking it changes nothing
            except the font.
          </li>
          <li>
            <strong>Cloudflare</strong> serves every page as our host and, as with any web host,
            processes the network request itself.
          </li>
        </ul>
        <p>
          Once the service worker has cached the app, the tools work fully offline with no
          third-party requests at all.
        </p>

        <h2>Children</h2>
        <p>
          The site is not directed at children under 13 and we do not knowingly collect any
          personal information from them.
        </p>

        <h2>Your rights</h2>
        <p>
          We hold no account, no profile and no database of users, so there is nothing for us to
          export or delete on request. The data that does exist about your visit is held by the
          third parties named above, and their own policies and opt-outs — linked in this page —
          are the way to exercise your rights over it. Clearing your browser's site data removes
          everything stored locally and every advertising cookie set through this site.
        </p>

        <h2>Changes to this page</h2>
        <p>
          If what the site does changes, this page changes with it, and the date at the top is
          updated. It is meant to describe reality rather than to cover us; if you find a
          statement here that is not accurate, please report it.
        </p>

        <h2>Contact</h2>
        <p>
          Questions, corrections or data-protection requests about this page:
          <a [href]="'mailto:' + privacyEmail">{{ privacyEmail }}</a>. More on how the site is built
          and funded is on the <a routerLink="/about">about page</a>.
        </p>
      </div>
    </div>
  `,
})
export class PrivacyComponent implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly privacyEmail = EMAIL.privacy;
  protected readonly donationUrl = DONATION_URL;
  protected readonly updated = 'September 2026';

  /**
   * The disclosures below are gated on what the build actually does, so this
   * page cannot describe advertising or analytics that is not running — or stay
   * silent about either once it is.
   */
  protected readonly adsEnabled = ADS_ENABLED;
  protected readonly analyticsEnabled = CF_ANALYTICS_TOKEN.length > 0;

  ngOnInit(): void {
    this.seo.apply({
      title: 'Privacy',
      description:
        'What OnDevice Tools does and does not collect. Your files are processed in your browser and never uploaded; advertising and analytics are disclosed in full.',
      path: '/privacy',
      keywords: ['privacy policy', 'cookies', 'adsense', 'client-side', 'data protection'],
    });
  }
}

import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_URL,
  canonicalUrl,
} from './site.config';
import { Tool } from './tool.types';

export interface SeoConfig {
  /** Page title without the site suffix. */
  title: string;
  description: string;
  keywords?: string[];
  /** Path beginning with a slash, e.g. `/tools/json-formatter`. */
  path: string;
  image?: string;
  /** Extra JSON-LD graph nodes to emit alongside the defaults. */
  structuredData?: Record<string, unknown>[];
  /**
   * Keep the page out of the index. Used for pages whose content is per-browser
   * and therefore meaningless to a crawler, e.g. /favorites.
   */
  noindex?: boolean;
}

const LD_ATTR = 'data-qt-ld';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  apply(config: SeoConfig): void {
    const fullTitle =
      config.path === '/' ? `${SITE_NAME} — ${config.title}` : `${config.title} | ${SITE_NAME}`;
    const url = canonicalUrl(config.path);
    const image = config.image ?? SITE_OG_IMAGE;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({
      name: 'keywords',
      content: (config.keywords ?? []).join(', '),
    });

    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:image', content: image });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    // Reset on every navigation: this is a single-page app, so a tag left over
    // from the previous route would silently apply to the next one.
    this.meta.updateTag({
      name: 'robots',
      content: config.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    });

    this.setCanonical(url);
    this.setStructuredData([
      this.organizationNode(),
      this.websiteNode(),
      ...(config.structuredData ?? []),
    ]);
  }

  /** Convenience wrapper that derives every tag from a registry entry. */
  applyForTool(tool: Tool, categoryName: string): void {
    const path = `/tools/${tool.id}`;
    const url = canonicalUrl(path);

    this.apply({
      title: `${tool.name} — Free, Nothing Uploaded`,
      description: tool.description,
      keywords: [
        tool.name.toLowerCase(),
        ...tool.keywords,
        'free',
        'online',
        'offline',
        'no upload',
        'in browser',
      ],
      path,
      structuredData: [
        {
          '@type': 'SoftwareApplication',
          name: tool.name,
          url,
          description: tool.description,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires a modern web browser with JavaScript enabled',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          isAccessibleForFree: true,
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
            {
              '@type': 'ListItem',
              position: 2,
              name: categoryName,
              item: canonicalUrl(`/category/${tool.category}`),
            },
            { '@type': 'ListItem', position: 3, name: tool.name, item: url },
          ],
        },
        ...(tool.faqs.length
          ? [
              {
                '@type': 'FAQPage',
                mainEntity: tool.faqs.map((faq) => ({
                  '@type': 'Question',
                  name: faq.q,
                  acceptedAnswer: { '@type': 'Answer', text: faq.a },
                })),
              },
            ]
          : []),
      ],
    });
  }

  /**
   * Publisher identity, referenced by @id from the other nodes.
   *
   * Search engines use this to attribute every page to one named entity, which
   * is also what an ad network's site review looks for.
   */
  private organizationNode(): Record<string, unknown> {
    return {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: canonicalUrl('/'),
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
      description: SITE_DESCRIPTION,
      founder: { '@type': 'Person', name: SITE_AUTHOR },
    };
  }

  private websiteNode(): Record<string, unknown> {
    return {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: canonicalUrl('/'),
      publisher: { '@id': `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/tools/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Replaces any previously injected JSON-LD. Navigating between tools must not
   * leave the previous tool's structured data behind.
   */
  private setStructuredData(nodes: Record<string, unknown>[]): void {
    const head = this.document.head;
    head.querySelectorAll(`script[${LD_ATTR}]`).forEach((el) => el.remove());

    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute(LD_ATTR, '');
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': nodes,
    });
    head.appendChild(script);
  }
}

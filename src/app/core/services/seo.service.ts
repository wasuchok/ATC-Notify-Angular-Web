import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

type PublicSeoOptions = {
  title: string;
  description: string;
  path: string;
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly siteName = 'Anotix by Aoyama';
  private readonly logoPath = '/assets/logo.png';
  private readonly structuredDataId = 'anotix-org-jsonld';

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  setPublicPage(options: PublicSeoOptions) {
    const origin = this.document.location?.origin || '';
    const canonicalUrl = origin ? `${origin}${options.path}` : options.path;
    const imageUrl = origin ? `${origin}${this.logoPath}` : this.logoPath;

    this.title.setTitle(options.title);
    this.updateTag('name', 'description', options.description);
    this.updateTag('property', 'og:type', 'website');
    this.updateTag('property', 'og:title', options.title);
    this.updateTag('property', 'og:description', options.description);
    this.updateTag('property', 'og:site_name', this.siteName);
    this.updateTag('property', 'og:url', canonicalUrl);
    this.updateTag('property', 'og:image', imageUrl);
    this.updateTag('name', 'twitter:card', 'summary_large_image');
    this.updateTag('name', 'twitter:title', options.title);
    this.updateTag('name', 'twitter:description', options.description);
    this.updateTag('name', 'twitter:image', imageUrl);

    this.setCanonical(canonicalUrl);
    this.setOrganizationStructuredData(canonicalUrl, imageUrl);
  }

  private updateTag(attribute: 'name' | 'property', key: string, content: string) {
    this.meta.updateTag({ [attribute]: key, content });
  }

  private setCanonical(url: string) {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setOrganizationStructuredData(url: string, logoUrl: string) {
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.siteName,
      alternateName: ['Anotix', 'Aoyama', 'Aoyama Thailand'],
      url,
      logo: logoUrl,
      sameAs: [],
      description: 'Anotix by Aoyama ระบบแจ้งเตือนและสื่อสารภายในองค์กรแบบเรียลไทม์',
    };

    let script = this.document.getElementById(this.structuredDataId) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.id = this.structuredDataId;
      this.document.head.appendChild(script);
    }
    script.text = JSON.stringify(payload);
  }
}

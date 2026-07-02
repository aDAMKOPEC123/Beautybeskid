import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { SEO as cfg } from '@/lib/seo-config';

interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  schema?: object;
}

export const PageSEO = ({ title, description, canonical, ogImage, schema }: Props) => {
  const alreadyBranded = /BeskidStudio|Wiktoria Ćwik/i.test(title);
  const fullTitle = alreadyBranded ? title : `${title} | Wiktoria Ćwik`;
  const url = canonical ? `${cfg.domain}${canonical}` : cfg.domain;
  const image = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${cfg.domain}${ogImage}`
    : `${cfg.domain}/images/og-salon.jpg`;

  useEffect(() => {
    const selectors = [
      'meta[name="description"]',
      'meta[name="robots"]',
      'link[rel="canonical"]',
      'meta[property="og:type"]',
      'meta[property="og:site_name"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[property="og:image"]',
      'meta[property="og:locale"]',
    ];

    selectors.forEach((selector) => {
      const elements = Array.from(document.head.querySelectorAll(selector));
      elements.slice(0, -1).forEach((element) => element.remove());
    });
  }, [description, fullTitle, image, url]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <meta name="geo.region" content="PL-MA" />
      <meta name="geo.placename" content={cfg.address.city} />
      <meta name="geo.position" content={`${cfg.lat};${cfg.lon}`} />
      <meta name="ICBM" content={`${cfg.lat}, ${cfg.lon}`} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="business.business" />
      <meta property="og:site_name" content={cfg.siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="pl_PL" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
};

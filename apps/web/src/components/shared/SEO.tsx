import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { SEO as cfg } from '@/lib/seo-config';

interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  schema?: object;
  noIndex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

export const PageSEO = ({ title, description, canonical, ogImage, schema, noIndex = false, type = 'website', publishedTime, modifiedTime, author }: Props) => {
  const alreadyBranded = /BeskidStudio|Wiktoria Ćwik/i.test(title);
  const fullTitle = alreadyBranded ? title : `${title} | Wiktoria Ćwik`;
  const url = canonical ? `${cfg.domain}${canonical}` : cfg.domain;
  const image = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${cfg.domain}${ogImage}`
    : `${cfg.domain}/images/beautybeskid-hero-premium.webp`;
  const imageType = image.toLowerCase().match(/\.png(?:\?|$)/)
    ? 'image/png'
    : image.toLowerCase().match(/\.jpe?g(?:\?|$)/)
      ? 'image/jpeg'
      : 'image/webp';

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
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image:alt"]',
      'meta[property="og:image:width"]',
      'meta[property="og:image:height"]',
      'meta[property="og:image:type"]',
      'meta[property="og:locale"]',
      'meta[name="twitter:card"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:alt"]',
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
      <meta
        name="robots"
        content={noIndex ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large'}
      />
      <meta name="geo.region" content="PL-MA" />
      <meta name="geo.placename" content={cfg.address.city} />
      <meta name="geo.position" content={`${cfg.lat};${cfg.lon}`} />
      <meta name="ICBM" content={`${cfg.lat}, ${cfg.lon}`} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={cfg.siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:alt" content={`${fullTitle} — BeskidStudio`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content={imageType} />
      <meta property="og:locale" content="pl_PL" />
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && (
        <meta property="article:section" content="Kosmetologia" />
      )}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={`${fullTitle} — BeskidStudio`} />
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
};

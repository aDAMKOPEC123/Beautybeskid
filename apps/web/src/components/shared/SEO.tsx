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
  const fullTitle = `${title} | ${cfg.siteName}`;
  const url = canonical ? `${cfg.domain}${canonical}` : cfg.domain;
  const image = ogImage ?? `${cfg.domain}/images/og-salon.jpg`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="business.business" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
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

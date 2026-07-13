import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

const DOMAIN = 'https://kosmetologwiktoriacwik.pl';

const STATIC_LASTMOD = new Date().toISOString().split('T')[0];

const staticUrls = [
  { loc: '/', priority: '1.0', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/uslugi', priority: '0.9', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/blog', priority: '0.8', changefreq: 'daily', lastmod: STATIC_LASTMOD },
  { loc: '/metamorfozy', priority: '0.8', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/program-lojalnosciowy', priority: '0.7', changefreq: 'monthly', lastmod: STATIC_LASTMOD },
  { loc: '/o-nas', priority: '0.7', changefreq: 'monthly', lastmod: STATIC_LASTMOD },
  { loc: '/kontakt', priority: '0.6', changefreq: 'yearly', lastmod: STATIC_LASTMOD },
  { loc: '/regulamin', priority: '0.3', changefreq: 'yearly' },
  // Canonical local SEO landing pages only. Redirect sources belong in Nginx,
  // never in the sitemap, because Google should index their final destinations.
  { loc: '/kosmetolog-mordarka', priority: '0.88', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/kosmetyczka-limanowa', priority: '0.92', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/laminacja-brwi-limanowa', priority: '0.9', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/laminacja-rzes-limanowa', priority: '0.9', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/oprawa-oka-limanowa', priority: '0.9', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/podolog-limanowa', priority: '0.9', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/podologia-limanowa', priority: '0.9', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
  { loc: '/spa-stop-limanowa', priority: '0.88', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
];

function toXmlDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [posts, services] = await Promise.all([
      prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.service.findMany({
        // Generic/internal categories must not become thin indexable landing pages.
        where: { isActive: true, slug: { notIn: ['inne'] } },
        select: { slug: true, updatedAt: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const staticEntries = staticUrls
      .map(
        ({ loc, priority, changefreq, lastmod }) => `
  <url>
    <loc>${DOMAIN}${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
      )
      .join('');

    const serviceEntries = services
      .map(
        (s) => `
  <url>
    <loc>${DOMAIN}/uslugi/${escapeXml(s.slug)}</loc>
    <lastmod>${toXmlDate(s.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`,
      )
      .join('');

    const postEntries = posts
      .map(
        (p) => `
  <url>
    <loc>${DOMAIN}/blog/${escapeXml(p.slug)}</loc>
    <lastmod>${toXmlDate(p.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>`,
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${serviceEntries}
${postEntries}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch {
    res.status(500).send('Error generating sitemap');
  }
});

export default router;

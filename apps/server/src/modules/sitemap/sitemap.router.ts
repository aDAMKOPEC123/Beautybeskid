import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

const DOMAIN = 'https://kosmetologwiktoriacwik.pl';

const staticUrls = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/uslugi', priority: '0.9', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.8', changefreq: 'daily' },
  { loc: '/metamorfozy', priority: '0.8', changefreq: 'weekly' },
  { loc: '/program-lojalnosciowy', priority: '0.7', changefreq: 'monthly' },
  { loc: '/o-nas', priority: '0.7', changefreq: 'monthly' },
  { loc: '/kontakt', priority: '0.6', changefreq: 'yearly' },
  { loc: '/regulamin', priority: '0.3', changefreq: 'yearly' },
  { loc: '/kosmetolog-mordarka', priority: '0.88', changefreq: 'weekly' },
  { loc: '/kosmetyczka-limanowa', priority: '0.92', changefreq: 'weekly' },
  { loc: '/laminacja-brwi-limanowa', priority: '0.9', changefreq: 'weekly' },
  { loc: '/laminacja-rzes-limanowa', priority: '0.9', changefreq: 'weekly' },
  { loc: '/oprawa-oka-limanowa', priority: '0.9', changefreq: 'weekly' },
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
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const staticEntries = staticUrls
      .map(
        ({ loc, priority, changefreq }) => `
  <url>
    <loc>${DOMAIN}${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
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

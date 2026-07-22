import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const INDEXNOW_KEY = 'fa7e7a5c6ff16203c0da528cd3472cb5';

const router = Router();

const DOMAIN = 'https://kosmetologwiktoriacwik.pl';

// Use the build date so static pages get a real lastmod that updates on each deploy.
const STATIC_LASTMOD: string = new Date().toISOString().split('T')[0];

// Google ignores <priority> and <changefreq> — keep only <loc> and <lastmod>.
const staticUrls = [
  { loc: '/', lastmod: STATIC_LASTMOD },
  { loc: '/uslugi', lastmod: STATIC_LASTMOD },
  { loc: '/blog', lastmod: STATIC_LASTMOD },
  { loc: '/metamorfozy', lastmod: STATIC_LASTMOD },
  { loc: '/o-nas', lastmod: STATIC_LASTMOD },
  { loc: '/kontakt', lastmod: STATIC_LASTMOD },
  { loc: '/program-lojalnosciowy', lastmod: STATIC_LASTMOD },
  { loc: '/regulamin', lastmod: STATIC_LASTMOD },
  // Canonical local SEO landing pages only. Redirect sources belong in Nginx,
  // never in the sitemap, because Google should index their final destinations.
  { loc: '/kosmetolog-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/kosmetolog-mordarka', lastmod: STATIC_LASTMOD },
  { loc: '/laminacja-brwi-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/laminacja-rzes-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/oprawa-oka-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/podolog-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/spa-stop-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/wrastajace-paznokcie-limanowa', lastmod: STATIC_LASTMOD },
  { loc: '/pedicure-podologiczny-limanowa', lastmod: STATIC_LASTMOD },
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
        ({ loc, lastmod }) => `
  <url>
    <loc>${DOMAIN}${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
  </url>`,
      )
      .join('');

    const serviceEntries = services
      .map(
        (s) => `
  <url>
    <loc>${DOMAIN}/uslugi/${escapeXml(s.slug)}</loc>
    <lastmod>${toXmlDate(s.updatedAt)}</lastmod>
  </url>`,
      )
      .join('');

    const postEntries = posts
      .map(
        (p) => `
  <url>
    <loc>${DOMAIN}/blog/${escapeXml(p.slug)}</loc>
    <lastmod>${toXmlDate(p.updatedAt)}</lastmod>
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

// IndexNow: submit URLs to Bing/Yandex/Naver for fast indexing.
// POST /sitemap.xml/indexnow with optional { urls: string[] } body.
// Without body, submits all sitemap URLs.
router.post('/indexnow', async (req: Request, res: Response) => {
  try {
    let urls: string[] = req.body?.urls;

    if (!urls || urls.length === 0) {
      const [posts, services] = await Promise.all([
        prisma.blogPost.findMany({
          where: { isPublished: true },
          select: { slug: true },
        }),
        prisma.service.findMany({
          where: { isActive: true, slug: { notIn: ['inne'] } },
          select: { slug: true },
        }),
      ]);

      urls = [
        ...staticUrls.map((u) => `${DOMAIN}${u.loc}`),
        ...services.map((s) => `${DOMAIN}/uslugi/${s.slug}`),
        ...posts.map((p) => `${DOMAIN}/blog/${p.slug}`),
      ];
    }

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'kosmetologwiktoriacwik.pl',
        key: INDEXNOW_KEY,
        keyLocation: `${DOMAIN}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    res.json({
      status: response.status,
      submitted: urls.length,
      message: response.status === 200 || response.status === 202
        ? 'URLs submitted successfully'
        : `IndexNow responded with ${response.status}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'IndexNow submission failed' });
  }
});

export default router;

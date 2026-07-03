import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DOMAIN = process.env.SEO_DOMAIN || 'https://kosmetologwiktoriacwik.pl';
const API_ORIGIN = process.env.SEO_API_ORIGIN || DOMAIN;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const template = (await readFile(path.join(DIST_DIR, 'index.html'), 'utf8'))
  .replace(/\s*<script type="application\/ld\+json" data-generated-seo>[\s\S]*?<\/script>/g, '');

const corePages = [
  {
    path: '/',
    title: 'Kosmetolog Limanowa | Wiktoria Ćwik – BeskidStudio',
    description: 'Kosmetolog Wiktoria Ćwik koło Limanowej. Konsultacje kosmetologiczne, laminacja brwi i rzęs, pielęgnacja skóry oraz rezerwacja online.',
    heading: 'Kosmetolog Limanowa – Wiktoria Ćwik',
    lead: 'BeskidStudio w Mordarce koło Limanowej. Konsultacje, zabiegi kosmetologiczne, stylizacja brwi i rzęs oraz wygodna rezerwacja online.',
    items: ['Konsultacje kosmetologiczne', 'Laminacja brwi i rzęs', 'Pielęgnacja skóry', 'Rezerwacja online'],
  },
  {
    path: '/uslugi',
    title: 'Usługi kosmetyczne Limanowa | Wiktoria Ćwik',
    description: 'Usługi kosmetyczne koło Limanowej: konsultacje, pielęgnacja skóry, laminacja brwi i rzęs oraz stylizacja oprawy oka. Sprawdź ceny i terminy.',
    heading: 'Usługi kosmetyczne – Limanowa i Mordarka',
    lead: 'Sprawdź aktualne zabiegi BeskidStudio Wiktoria Ćwik, ich czas, ceny oraz najbliższe terminy.',
    items: ['Konsultacja kosmetologiczna', 'Laminacja brwi', 'Lifting rzęs', 'Henna i regulacja brwi'],
  },
  {
    path: '/kontakt',
    title: 'Kontakt i dojazd | Kosmetolog Limanowa',
    description: 'BeskidStudio Wiktoria Ćwik, Mordarka 505 koło Limanowej. Telefon 532 128 227, mapa dojazdu, godziny otwarcia i rezerwacja wizyty online.',
    heading: 'Kontakt i dojazd do BeskidStudio',
    lead: 'Salon mieści się pod adresem Mordarka 505, 34-600 Mordarka, kilka minut od Limanowej.',
    items: ['Telefon: +48 532 128 227', 'E-mail: kontakt@kosmetologwiktoriacwik.pl', 'Poniedziałek–piątek: 09:00–18:00', 'Sobota: 09:00–14:00'],
  },
  {
    path: '/blog',
    title: 'Blog kosmetologiczny | Wiktoria Ćwik Limanowa',
    description: 'Porady kosmetologa z Limanowej o pielęgnacji skóry, zabiegach, brwiach i rzęsach. Przeczytaj artykuły Wiktorii Ćwik.',
    heading: 'Blog kosmetologiczny Wiktorii Ćwik',
    lead: 'Praktyczne wskazówki o świadomej pielęgnacji skóry, przygotowaniu do zabiegów oraz opiece po wizycie.',
    items: ['Pielęgnacja skóry', 'Kosmetologia', 'Brwi i rzęsy', 'Zalecenia po zabiegach'],
  },
  {
    path: '/o-nas',
    title: 'Wiktoria Ćwik – kosmetolog Limanowa | O salonie',
    description: 'Poznaj Wiktorię Ćwik i BeskidStudio w Mordarce koło Limanowej. Indywidualne konsultacje, spokojna atmosfera i świadoma pielęgnacja.',
    heading: 'Wiktoria Ćwik – kosmetolog koło Limanowej',
    lead: 'BeskidStudio łączy profesjonalną konsultację, indywidualny plan pielęgnacji i opiekę także po wizycie.',
    items: ['Indywidualne konsultacje', 'Jasny plan pielęgnacji', 'Bezpieczne procedury', 'Kontakt po zabiegu'],
  },
  {
    path: '/metamorfozy',
    title: 'Efekty zabiegów i metamorfozy | Limanowa',
    description: 'Zobacz efekty zabiegów wykonanych w BeskidStudio Wiktoria Ćwik koło Limanowej. Galeria metamorfoz przed i po.',
    heading: 'Efekty zabiegów – metamorfozy',
    lead: 'Galeria efektów pracy BeskidStudio Wiktoria Ćwik dla klientek z Limanowej, Mordarki i okolic.',
    items: ['Efekty przed i po', 'Naturalne rezultaty', 'Indywidualnie dobrane zabiegi'],
  },
  {
    path: '/program-lojalnosciowy',
    title: 'Program lojalnościowy | BeskidStudio Limanowa',
    description: 'Zbieraj punkty za wizyty w BeskidStudio Wiktoria Ćwik koło Limanowej i wymieniaj je na dostępne nagrody. Sprawdź zasady programu.',
    heading: 'Program lojalnościowy BeskidStudio',
    lead: 'Punkty za wizyty, polecenia i aktywność możesz wymieniać na nagrody dostępne w panelu klienta.',
    items: ['Punkty za wizyty', 'Nagrody w panelu klienta', 'Historia punktów online'],
  },
  {
    path: '/regulamin',
    title: 'Regulamin i polityka prywatności | BeskidStudio',
    description: 'Regulamin serwisu, zasady rezerwacji oraz polityka prywatności BeskidStudio Wiktoria Ćwik.',
    heading: 'Regulamin i polityka prywatności',
    lead: 'Zasady korzystania z serwisu, rezerwacji wizyt oraz informacje dotyczące przetwarzania danych.',
    items: ['Zasady rezerwacji', 'Płatności i odwołanie wizyty', 'Prywatność i dane osobowe'],
  },
];

const localPages = [
  ['kosmetolog-mordarka', 'Kosmetolog Mordarka', 'Konsultacje kosmetologiczne i indywidualnie dobrane zabiegi blisko Limanowej.'],
  ['kosmetyczka-limanowa', 'Kosmetyczka Limanowa', 'Aktualne zabiegi beauty, konsultacje oraz stylizacja brwi i rzęs.'],
  ['laminacja-brwi-limanowa', 'Laminacja brwi Limanowa', 'Stylizacja i laminacja brwi dopasowana do rysów twarzy.'],
  ['laminacja-rzes-limanowa', 'Laminacja rzęs Limanowa', 'Naturalny lifting i laminacja rzęs z zaleceniami pielęgnacyjnymi.'],
  ['oprawa-oka-limanowa', 'Oprawa oka Limanowa', 'Laminacja, lifting, henna i regulacja dopasowane do oczekiwanego efektu.'],
].map(([slug, label, offer]) => ({
  path: `/${slug}`,
  title: `${label} | Wiktoria Ćwik`,
  description: `${label}: ${offer} BeskidStudio koło Limanowej. Sprawdź terminy online.`,
  heading: `${label} – BeskidStudio Wiktoria Ćwik`,
  lead: offer,
  items: ['Mordarka 505, 34-600 Mordarka', 'Rezerwacja online', 'Telefon: +48 532 128 227'],
}));

const unavailablePages = [
  ['podolog-limanowa', 'Podologia Limanowa – usługa w przygotowaniu'],
  ['podolog-mordarka', 'Podologia Mordarka – usługa w przygotowaniu'],
  ['wrastajace-paznokcie-limanowa', 'Wrastające paznokcie Limanowa – usługa w przygotowaniu'],
  ['wrastajace-paznokcie-mordarka', 'Wrastające paznokcie Mordarka – usługa w przygotowaniu'],
].map(([slug, label]) => ({
  path: `/${slug}`,
  title: `${label} | BeskidStudio`,
  description: 'Podologia nie jest obecnie dostępna do rezerwacji w BeskidStudio. Sprawdź aktualną ofertę salonu lub skontaktuj się w sprawie przyszłych terminów.',
  heading: label,
  lead: 'Ta usługa nie jest obecnie dostępna do rezerwacji. Aktualna oferta znajduje się na stronie usług.',
  items: ['Aktualny status usługi', 'Kontakt z salonem', 'Dostępne zabiegi beauty'],
  noIndex: true,
}));

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const truncate = (value, maxLength) => {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
};

const richTextToText = (value) => {
  if (!value) return '';
  try {
    const document = typeof value === 'string' ? JSON.parse(value) : value;
    const parts = [];
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.text === 'string') parts.push(node.text);
      if (Array.isArray(node.content)) {
        node.content.forEach(visit);
        if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type)) parts.push('\n');
      }
    };
    visit(document);
    return cleanText(parts.join(' '));
  } catch {
    return cleanText(value);
  }
};

const fetchApi = async (pathname) => {
  const response = await fetch(`${API_ORIGIN}${pathname}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'BeskidStudio-SEO-Builder/1.0' },
  });
  if (!response.ok) throw new Error(`SEO API ${pathname} returned ${response.status}`);
  return response.json();
};

const loadDynamicPages = async () => {
  const [servicesPayload, postsPayload] = await Promise.all([
    fetchApi('/api/services'),
    fetchApi('/api/blog'),
  ]);

  const services = servicesPayload?.data?.services ?? [];
  const posts = postsPayload?.data?.posts ?? [];

  const servicePages = services
    .filter((service) => service.isActive !== false)
    .map((service) => {
      const description = truncate(
        service.description || `${service.name} w BeskidStudio Wiktoria Ćwik, Mordarka 505 koło Limanowej. Sprawdź cenę i zarezerwuj termin online.`,
        158,
      );
      return {
        path: `/uslugi/${service.slug}`,
        title: `${service.name} Limanowa | BeskidStudio`,
        description,
        heading: `${service.name} – Limanowa i okolice`,
        lead: description,
        bodyText: truncate(richTextToText(service.detailedContent), 2400),
        items: [`Cena: ${service.price} zł`, `Czas zabiegu: ${service.durationMinutes} min`, `Kategoria: ${service.category}`],
        schema: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Service',
              '@id': `${DOMAIN}/uslugi/${service.slug}#service`,
              name: service.name,
              description,
              serviceType: service.category,
              provider: { '@id': `${DOMAIN}/#beautysalon` },
              areaServed: 'Limanowa i powiat limanowski',
              offers: {
                '@type': 'Offer',
                price: String(service.price),
                priceCurrency: 'PLN',
                availability: 'https://schema.org/InStock',
                url: `${DOMAIN}/uslugi/${service.slug}`,
              },
            },
            breadcrumbSchema(`/uslugi/${service.slug}`, ['Strona główna', 'Usługi', service.name]),
          ],
        },
      };
    });

  const postPages = posts
    .filter((post) => post.isPublished !== false)
    .map((post) => {
      const description = truncate(
        post.metaDescription || post.excerpt || `${post.title} – poradnik Wiktorii Ćwik, kosmetologa z okolic Limanowej.`,
        158,
      );
      return {
        path: `/blog/${post.slug}`,
        title: truncate(post.metaTitle || `${post.title} | Wiktoria Ćwik`, 65),
        description,
        heading: post.title,
        lead: truncate(post.excerpt || description, 360),
        bodyText: truncate(richTextToText(post.content), 6000),
        items: [post.category, `${post.readingTime || 5} min czytania`, 'Autor: Wiktoria Ćwik'],
        schema: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BlogPosting',
              '@id': `${DOMAIN}/blog/${post.slug}#article`,
              headline: post.title,
              description,
              datePublished: post.createdAt,
              dateModified: post.updatedAt,
              author: { '@type': 'Person', name: post.author?.name || 'Wiktoria Ćwik' },
              publisher: { '@id': `${DOMAIN}/#beautysalon` },
              mainEntityOfPage: `${DOMAIN}/blog/${post.slug}`,
              ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
            },
            breadcrumbSchema(`/blog/${post.slug}`, ['Strona główna', 'Blog', post.title]),
          ],
        },
      };
    });

  return [...servicePages, ...postPages];
};

function absoluteUrl(value) {
  if (!value) return undefined;
  return value.startsWith('http') ? value : `${DOMAIN}${value}`;
}

function breadcrumbSchema(pagePath, labels) {
  const segments = pagePath.split('/').filter(Boolean);
  return {
    '@type': 'BreadcrumbList',
    itemListElement: labels.map((name, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: index === 0 ? DOMAIN : `${DOMAIN}/${segments.slice(0, index).join('/')}`,
    })),
  };
}

const staticContent = ({ heading, lead, items, bodyText }) => `
      <main data-seo-static-content style="max-width:960px;margin:0 auto;padding:48px 24px;font-family:Arial,sans-serif;color:#173b2a">
        <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9b6d3f">BeskidStudio Wiktoria Ćwik</p>
        <h1 style="font-size:clamp(32px,6vw,58px);line-height:1.08;margin:12px 0 18px">${escapeHtml(heading)}</h1>
        <p style="max-width:720px;font-size:18px;line-height:1.65;color:#496255">${escapeHtml(lead)}</p>
        ${bodyText ? `<div style="max-width:760px;font-size:16px;line-height:1.75;color:#334c40"><p>${escapeHtml(bodyText)}</p></div>` : ''}
        <ul style="margin:28px 0;padding-left:22px;line-height:1.9">${items.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        <nav aria-label="Najważniejsze strony" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:28px">
          <a href="/uslugi">Usługi</a><a href="/kontakt">Kontakt</a><a href="/blog">Blog</a><a href="/rezerwacja">Umów wizytę</a>
        </nav>
        <address style="margin-top:34px;font-style:normal;line-height:1.7">Mordarka 505, 34-600 Mordarka · <a href="tel:+48532128227">+48 532 128 227</a></address>
      </main>`;

const spaTemplate = template
  .replace(/\s*<(?:meta|link)[^>]*data-rh="true"[^>]*>/g, '')
  .replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"></div>');

const renderPage = (page) => {
  const canonical = `${DOMAIN}${page.path === '/' ? '/' : page.path}`;
  const schema = page.schema || {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'BeskidStudio Wiktoria Ćwik', url: DOMAIN },
  };
  const serializedSchema = JSON.stringify(schema).replaceAll('<', '\\u003c');
  const robots = page.noIndex ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large';

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(page.description)}" data-rh="true" />`)
    .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${robots}" data-rh="true" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(page.title)}" data-rh="true" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(page.description)}" data-rh="true" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" data-rh="true" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" data-rh="true" />`)
    .replace('</head>', `    <script type="application/ld+json" data-generated-seo>${serializedSchema}</script>\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${staticContent(page)}\n    </div>`);
};

const writePage = async (page) => {
  const html = renderPage(page);
  if (page.path === '/') {
    await writeFile(path.join(DIST_DIR, 'index.html'), html);
    return;
  }
  const relativePath = page.path.slice(1);
  const directory = path.join(DIST_DIR, relativePath);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(DIST_DIR, `${relativePath}.html`), html);
  await writeFile(path.join(directory, 'index.html'), html);
};

const dynamicPages = await loadDynamicPages();
const pages = [...corePages, ...localPages, ...unavailablePages, ...dynamicPages];

await writeFile(path.join(DIST_DIR, 'spa.html'), spaTemplate);
await writeFile(path.join(DIST_DIR, 'private-spa.html'), spaTemplate);

const notFoundPage = {
  path: '/404',
  title: 'Nie znaleziono strony | BeskidStudio',
  description: 'Podany adres nie istnieje. Wróć do strony głównej BeskidStudio Wiktoria Ćwik.',
  heading: 'Nie znaleziono strony',
  lead: 'Sprawdź adres lub przejdź do aktualnej oferty zabiegów.',
  items: ['Strona główna', 'Usługi', 'Kontakt'],
  noIndex: true,
};
await writeFile(path.join(DIST_DIR, '404.html'), renderPage(notFoundPage));

for (const page of pages) await writePage(page);

console.log(`Generated ${pages.length} crawlable SEO entry pages (${dynamicPages.length} dynamic).`);

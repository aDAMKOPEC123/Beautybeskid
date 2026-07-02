import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DOMAIN = 'https://kosmetologwiktoriacwik.pl';
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
    description: 'Usługi kosmetyczne koło Limanowej: konsultacje, pielęgnacja skóry, laminacja brwi i rzęs oraz podologia zgodnie z aktualną dostępnością. Sprawdź ofertę.',
    heading: 'Usługi kosmetyczne – Limanowa i Mordarka',
    lead: 'Sprawdź aktualne zabiegi BeskidStudio Wiktoria Ćwik, ich czas, ceny oraz najbliższe terminy.',
    items: ['Konsultacja kosmetologiczna', 'Zabiegi pielęgnacyjne twarzy', 'Laminacja brwi', 'Laminacja rzęs', 'Podologia – aktualna dostępność'],
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
    description: 'Porady kosmetologa z Limanowej o pielęgnacji skóry, zabiegach, brwiach, rzęsach i podologii. Przeczytaj artykuły Wiktorii Ćwik.',
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

const localServices = [
  ['kosmetolog', 'Kosmetolog', 'konsultacje kosmetologiczne i indywidualnie dobrane zabiegi'],
  ['kosmetyczka', 'Kosmetyczka', 'zabiegi pielęgnacyjne, konsultacje oraz stylizacja brwi i rzęs'],
  ['laminacja-brwi', 'Laminacja brwi', 'stylizacja i laminacja brwi dopasowana do rysów twarzy'],
  ['laminacja-rzes', 'Laminacja rzęs', 'lifting i laminacja rzęs z zaleceniami pielęgnacyjnymi'],
  ['oprawa-oka', 'Oprawa oka', 'stylizacja brwi i rzęs dobrana do oczekiwanego efektu'],
  ['podolog', 'Podolog', 'konsultacje stóp i podologia zgodnie z aktualną dostępnością'],
  ['wrastajace-paznokcie', 'Wrastające paznokcie', 'konsultacja podologiczna i ocena problemu paznokci'],
];

const localPages = localServices.flatMap(([slug, label, offer]) =>
  [['limanowa', 'Limanowa'], ['mordarka', 'Mordarka']].map(([citySlug, city]) => ({
    path: `/${slug}-${citySlug}`,
    title: `${label} ${city} | Wiktoria Ćwik`,
    description: `${label} ${city}: ${offer} w BeskidStudio Wiktoria Ćwik. Sprawdź aktualną ofertę i umów wizytę online.`,
    heading: `${label} ${city} – BeskidStudio Wiktoria Ćwik`,
    lead: `${offer[0].toUpperCase()}${offer.slice(1)} dla klientek z Limanowej, Mordarki i okolic.`,
    items: ['Mordarka 505, 34-600 Mordarka', 'Rezerwacja online', 'Telefon: +48 532 128 227'],
  })),
);

const pages = [...corePages, ...localPages];

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const staticContent = ({ heading, lead, items }) => `
      <main data-seo-static-content style="max-width:960px;margin:0 auto;padding:48px 24px;font-family:Arial,sans-serif;color:#173b2a">
        <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9b6d3f">BeskidStudio Wiktoria Ćwik</p>
        <h1 style="font-size:clamp(32px,6vw,58px);line-height:1.08;margin:12px 0 18px">${escapeHtml(heading)}</h1>
        <p style="max-width:720px;font-size:18px;line-height:1.65;color:#496255">${escapeHtml(lead)}</p>
        <ul style="margin:28px 0;padding-left:22px;line-height:1.9">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        <nav aria-label="Najważniejsze strony" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:28px">
          <a href="/uslugi">Usługi</a><a href="/kontakt">Kontakt</a><a href="/blog">Blog</a><a href="/rezerwacja">Umów wizytę</a>
        </nav>
        <address style="margin-top:34px;font-style:normal;line-height:1.7">Mordarka 505, 34-600 Mordarka · <a href="tel:+48532128227">+48 532 128 227</a></address>
      </main>`;

const spaTemplate = template
  .replace(/\s*<(?:meta|link)[^>]*data-rh="true"[^>]*>/g, '')
  .replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"></div>');

await writeFile(path.join(DIST_DIR, 'spa.html'), spaTemplate);
await writeFile(path.join(DIST_DIR, 'private-spa.html'), spaTemplate);

const renderPage = (page) => {
  const canonical = `${DOMAIN}${page.path === '/' ? '/' : page.path}`;
  const webpageSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'BeskidStudio Wiktoria Ćwik', url: DOMAIN },
  }).replaceAll('<', '\\u003c');

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(page.description)}" data-rh="true" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(page.title)}" data-rh="true" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(page.description)}" data-rh="true" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" data-rh="true" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" data-rh="true" />`)
    .replace('</head>', `    <script type="application/ld+json" data-generated-seo>${webpageSchema}</script>\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${staticContent(page)}\n    </div>`);
};

for (const page of pages) {
  const html = renderPage(page);
  if (page.path === '/') {
    await writeFile(path.join(DIST_DIR, 'index.html'), html);
    continue;
  }

  const directory = path.join(DIST_DIR, page.path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(DIST_DIR, `${page.path.slice(1)}.html`), html);
  await writeFile(path.join(directory, 'index.html'), html);
}

console.log(`Generated ${pages.length} crawlable SEO entry pages.`);

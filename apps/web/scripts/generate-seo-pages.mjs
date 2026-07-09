import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DOMAIN = process.env.SEO_DOMAIN || 'https://kosmetologwiktoriacwik.pl';
const API_ORIGIN = process.env.SEO_API_ORIGIN || DOMAIN;
const API_TIMEOUT_MS = Number(process.env.SEO_API_TIMEOUT_MS || 15000);
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const template = (await readFile(path.join(DIST_DIR, 'index.html'), 'utf8'))
  .replace(/\s*<script type="application\/ld\+json" data-generated-seo>[\s\S]*?<\/script>/g, '');

const corePages = [
  {
    path: '/',
    title: 'Kosmetolog Limanowa | Wiktoria Ćwik – BeskidStudio',
    description: 'Kosmetolog Wiktoria Ćwik koło Limanowej. Konsultacje, laminacja brwi i rzęs, pielęgnacja skóry. Rezerwacja online.',
    heading: 'Kosmetolog Limanowa – Wiktoria Ćwik',
    lead: 'BeskidStudio w Mordarce koło Limanowej. Konsultacje, zabiegi kosmetologiczne, stylizacja brwi i rzęs oraz wygodna rezerwacja online.',
    items: ['Konsultacje kosmetologiczne', 'Laminacja brwi i rzęs', 'Pielęgnacja skóry', 'Rezerwacja online'],
    bodyText: 'Każdą wizytę zaczynamy od rozmowy o potrzebach skóry lub oczekiwanym efekcie stylizacji. Dzięki temu zabieg jest dopasowany do konkretnej osoby, a nie wybierany przypadkowo. W serwisie sprawdzisz aktualną ofertę, ceny, czas zabiegów i wolne terminy. Salon znajduje się w Mordarce 505, kilka minut od Limanowej, i obsługuje klientki z całego powiatu limanowskiego.',
  },
  {
    path: '/uslugi',
    title: 'Usługi kosmetyczne Limanowa | Wiktoria Ćwik',
    description: 'Usługi kosmetyczne koło Limanowej: konsultacje, pielęgnacja skóry, laminacja brwi i rzęs oraz stylizacja oprawy oka. Sprawdź ceny i terminy.',
    heading: 'Usługi kosmetyczne – Limanowa i Mordarka',
    lead: 'Sprawdź aktualne zabiegi BeskidStudio Wiktoria Ćwik, ich czas, ceny oraz najbliższe terminy.',
    items: ['Konsultacja kosmetologiczna', 'Laminacja brwi', 'Lifting rzęs', 'Henna i regulacja brwi'],
    bodyText: 'Oferta jest połączona bezpośrednio z systemem rezerwacji, dlatego pokazuje aktywne usługi i aktualne ceny. Na stronie każdego zabiegu znajdziesz opis efektu, czas wykonania, wskazania oraz informacje potrzebne przed wizytą. Jeśli nie wiesz, którą usługę wybrać, zacznij od konsultacji lub skontaktuj się z salonem.',
  },
  {
    path: '/kontakt',
    title: 'Kontakt i dojazd – salon kosmetyczny Mordarka',
    description: 'BeskidStudio Wiktoria Ćwik, Mordarka 505 koło Limanowej. Telefon 532 128 227, mapa dojazdu, godziny otwarcia i rezerwacja wizyty online.',
    heading: 'Kontakt i dojazd do BeskidStudio',
    lead: 'Salon mieści się pod adresem Mordarka 505, 34-600 Mordarka, kilka minut od Limanowej.',
    items: ['Telefon: +48 532 128 227', 'E-mail: kontakt@kosmetologwiktoriacwik.pl', 'Poniedziałek–piątek: 09:00–18:00', 'Sobota: 09:00–14:00'],
    bodyText: 'Do BeskidStudio przyjeżdżają klientki z Limanowej, Mordarki, Laskowej, Słopnic, Tymbarku, Dobrej i pobliskich miejscowości. Termin możesz sprawdzić online, a pytania dotyczące dojazdu, przygotowania do zabiegu lub wyboru usługi zadać telefonicznie albo przez czat po zalogowaniu.',
  },
  {
    path: '/blog',
    title: 'Blog kosmetologiczny | Wiktoria Ćwik Limanowa',
    description: 'Porady kosmetologa z Limanowej o pielęgnacji skóry, zabiegach, brwiach i rzęsach. Przeczytaj artykuły Wiktorii Ćwik.',
    heading: 'Blog kosmetologiczny Wiktorii Ćwik',
    lead: 'Praktyczne wskazówki o świadomej pielęgnacji skóry, przygotowaniu do zabiegów oraz opiece po wizycie.',
    items: ['Pielęgnacja skóry', 'Kosmetologia', 'Brwi i rzęsy', 'Zalecenia po zabiegach'],
    bodyText: 'Artykuły przygotowuje Wiktoria Ćwik, dyplomowany kosmetolog i właścicielka BeskidStudio. Znajdziesz tu odpowiedzi na pytania o przebieg zabiegów, trwałość efektów, pielęgnację domową i przeciwwskazania. Informacje mają pomóc w świadomym przygotowaniu do wizyty, ale nie zastępują indywidualnej konsultacji.',
  },
  {
    path: '/o-nas',
    title: 'O salonie BeskidStudio – poznaj Wiktorię Ćwik',
    description: 'Poznaj Wiktorię Ćwik i BeskidStudio w Mordarce koło Limanowej. Indywidualne konsultacje, spokojna atmosfera i świadoma pielęgnacja.',
    heading: 'Wiktoria Ćwik – kosmetolog koło Limanowej',
    lead: 'BeskidStudio łączy profesjonalną konsultację, indywidualny plan pielęgnacji i opiekę także po wizycie.',
    items: ['Indywidualne konsultacje', 'Jasny plan pielęgnacji', 'Bezpieczne procedury', 'Kontakt po zabiegu'],
    bodyText: 'Salon prowadzi Wiktoria Ćwik, dyplomowany kosmetolog. W pracy stawia na spokojną konsultację, realistyczne omówienie efektów oraz czytelne zalecenia po zabiegu. Klientki mogą wrócić do historii wizyt, zaleceń i kontaktu z salonem w swoim panelu online.',
  },
  {
    path: '/metamorfozy',
    title: 'Efekty zabiegów i metamorfozy | Limanowa',
    description: 'Zobacz efekty zabiegów wykonanych w BeskidStudio Wiktoria Ćwik koło Limanowej. Galeria metamorfoz przed i po.',
    heading: 'Efekty zabiegów – metamorfozy',
    lead: 'Galeria efektów pracy BeskidStudio Wiktoria Ćwik dla klientek z Limanowej, Mordarki i okolic.',
    items: ['Efekty przed i po', 'Naturalne rezultaty', 'Indywidualnie dobrane zabiegi'],
    bodyText: 'Zdjęcia pokazują rzeczywiste rezultaty zabiegów wykonanych w salonie. Efekt zawsze zależy od stanu wyjściowego, indywidualnych cech i prawidłowej pielęgnacji po wizycie, dlatego fotografie są przykładem, a nie obietnicą identycznego rezultatu u każdej osoby.',
  },
  {
    path: '/program-lojalnosciowy',
    title: 'Program lojalnościowy | BeskidStudio Limanowa',
    description: 'Zbieraj punkty za wizyty w BeskidStudio Wiktoria Ćwik koło Limanowej i wymieniaj je na dostępne nagrody. Sprawdź zasady programu.',
    heading: 'Program lojalnościowy BeskidStudio',
    lead: 'Punkty za wizyty, polecenia i aktywność możesz wymieniać na nagrody dostępne w panelu klienta.',
    items: ['Punkty za wizyty', 'Nagrody w panelu klienta', 'Historia punktów online'],
    bodyText: 'Po zalogowaniu sprawdzisz saldo punktów, historię transakcji i dostępne nagrody. Program jest częścią panelu klienta BeskidStudio i pomaga planować kolejne wizyty bez papierowych kart. Aktualne zasady oraz wartość nagród są zawsze widoczne w aplikacji.',
  },
  {
    path: '/regulamin',
    title: 'Regulamin i polityka prywatności | BeskidStudio',
    description: 'Regulamin serwisu, zasady rezerwacji oraz polityka prywatności BeskidStudio Wiktoria Ćwik.',
    heading: 'Regulamin i polityka prywatności',
    lead: 'Zasady korzystania z serwisu, rezerwacji wizyt oraz informacje dotyczące przetwarzania danych.',
    items: ['Zasady rezerwacji', 'Płatności i odwołanie wizyty', 'Prywatność i dane osobowe'],
    bodyText: 'Dokument opisuje zasady umawiania i odwoływania wizyt, korzystania z konta klienta, płatności oraz przetwarzania danych osobowych. Data i numer aktualnej wersji są publikowane bezpośrednio na stronie regulaminu.',
  },
];

const localPages = [
  ['kosmetolog-mordarka', 'Kosmetolog Mordarka', 'Konsultacje kosmetologiczne i indywidualnie dobrane zabiegi blisko Limanowej.', 'BeskidStudio znajduje się w Mordarce 505 i zapewnia lokalny dostęp do konsultacji kosmetologicznych bez dojazdu do większego miasta. Podczas pierwszej rozmowy omawiamy potrzeby skóry, dotychczasową pielęgnację, oczekiwania i przeciwwskazania. Następnie wybieramy aktualnie dostępny zabieg oraz realny plan dalszej pielęgnacji.'],
  ['kosmetyczka-limanowa', 'Kosmetyczka Limanowa', 'Aktualne zabiegi beauty, konsultacje oraz stylizacja brwi i rzęs.', 'Klientki z Limanowej mogą sprawdzić ofertę, ceny i terminy BeskidStudio online. Salon w pobliskiej Mordarce wykonuje aktualnie dostępne zabiegi beauty, laminację i stylizację brwi, lifting rzęs, hennę oraz depilację twarzy woskiem. Każda usługa ma osobną stronę z czasem, ceną i opisem.'],
  ['laminacja-brwi-limanowa', 'Laminacja brwi w Limanowej — dojazd i FAQ', 'Lokalny przewodnik po laminacji brwi: przebieg, dojazd z Limanowej, przygotowanie i rezerwacja.', 'Ten lokalny przewodnik wyjaśnia, jak wygląda wizyta na laminację brwi w BeskidStudio, jak dojechać z Limanowej i gdzie sprawdzić wolne terminy. Sam cennik, czas zabiegu oraz szczegółowy opis aktualnej usługi znajdują się na stronie zabiegu. Efekt dobieramy do naturalnego kierunku włosków, rysów twarzy i oczekiwanego sposobu codziennej stylizacji.'],
  ['laminacja-rzes-limanowa', 'Laminacja rzęs Limanowa', 'Naturalny lifting i laminacja rzęs z zaleceniami pielęgnacyjnymi.', 'Laminacja rzęs podkreśla naturalne włoski przez ich uniesienie, ułożenie i pielęgnację. Przed zabiegiem oceniamy kondycję rzęs oraz omawiamy oczekiwany efekt i przeciwwskazania. Po wizycie klientka otrzymuje jasne zalecenia, które pomagają utrzymać rezultat. Terminy dla Limanowej i okolic są widoczne online.'],
  ['oprawa-oka-limanowa', 'Oprawa oka Limanowa', 'Laminacja, lifting, henna i regulacja dopasowane do oczekiwanego efektu.', 'Oprawa oka może obejmować laminację brwi, lifting rzęs, koloryzację, hennę lub regulację. Zakres dobieramy do naturalnego kształtu brwi i rzęs oraz rezultatu, jaki chcesz osiągnąć. Aktualne zestawy, ceny i czas wykonania są publikowane w ofercie BeskidStudio dla klientek z Limanowej i powiatu limanowskiego.'],
].map(([slug, label, offer, bodyText]) => ({
  path: `/${slug}`,
  title: `${label} | Wiktoria Ćwik`,
  description: `${label}: ${offer} BeskidStudio koło Limanowej. Sprawdź terminy online.`,
  heading: `${label} – BeskidStudio Wiktoria Ćwik`,
  lead: offer,
  bodyText,
  items: ['Mordarka 505, 34-600 Mordarka', 'Rezerwacja online', 'Telefon: +48 532 128 227'],
  faq: [
    { question: `Gdzie znajduje się ${label}?`, answer: 'Zabiegi wykonujemy w BeskidStudio przy Mordarka 505, 34-600 Mordarka, kilka minut od Limanowej.' },
    { question: 'Jak sprawdzić aktualną cenę i termin?', answer: 'Aktualna cena, czas zabiegu i wolne godziny są publikowane na stronie usług oraz w systemie rezerwacji online.' },
    { question: 'Czy przed pierwszą wizytą można skonsultować wybór zabiegu?', answer: 'Tak. Jeśli nie wiesz, co wybrać, skontaktuj się z salonem lub umów konsultację przed rezerwacją właściwego zabiegu.' },
  ],
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

const safeHref = (value) => {
  const href = String(value ?? '').trim();
  return /^(https?:\/\/|\/|mailto:|tel:)/i.test(href) ? href : '';
};

const renderRichTextNode = (node) => {
  if (!node || typeof node !== 'object') return '';

  if (node.type === 'text') {
    let html = escapeHtml(node.text ?? '');
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') html = `<strong>${html}</strong>`;
      if (mark.type === 'italic') html = `<em>${html}</em>`;
      if (mark.type === 'link') {
        const href = safeHref(mark.attrs?.href);
        if (href) html = `<a href="${escapeHtml(href)}">${html}</a>`;
      }
    }
    return html;
  }

  if (node.type === 'hardBreak') return '<br />';

  const children = (node.content ?? []).map(renderRichTextNode).join('');
  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return children ? `<p>${children}</p>` : '';
    case 'heading': {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      return `<h${level}>${children}</h${level}>`;
    }
    case 'bulletList': return `<ul>${children}</ul>`;
    case 'orderedList': return `<ol>${children}</ol>`;
    case 'listItem': return `<li>${children}</li>`;
    case 'blockquote': return `<blockquote>${children}</blockquote>`;
    case 'image': {
      const src = safeHref(node.attrs?.src);
      if (!src) return '';
      const alt = escapeHtml(node.attrs?.alt || 'Zdjęcie ilustrujące artykuł');
      return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" /></figure>`;
    }
    default: return children;
  }
};

const richTextToHtml = (value) => {
  if (!value) return '';
  try {
    const document = typeof value === 'string' ? JSON.parse(value) : value;
    return renderRichTextNode(document);
  } catch {
    return `<p>${escapeHtml(cleanText(value))}</p>`;
  }
};

const fetchApi = async (pathname) => {
  const response = await fetch(`${API_ORIGIN}${pathname}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'BeskidStudio-SEO-Builder/1.0' },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`SEO API ${pathname} returned ${response.status}`);
  return response.json();
};

const loadDynamicPages = async () => {
  const [servicesResult, postsResult] = await Promise.allSettled([
    fetchApi('/api/services'),
    fetchApi('/api/blog'),
  ]);

  const readPayload = (result, pathname) => {
    if (result.status === 'fulfilled') return result.value;

    console.warn(`SEO API ${pathname} unavailable, skipping dynamic pages: ${result.reason?.message ?? result.reason}`);
    return null;
  };

  const servicesPayload = readPayload(servicesResult, '/api/services');
  const postsPayload = readPayload(postsResult, '/api/blog');
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
        title: service.slug === 'laminacja-brwi'
          ? 'Laminacja brwi — cena, czas i rezerwacja | BeskidStudio'
          : `${service.name} Limanowa | BeskidStudio`,
        description,
        heading: `${service.name} – Limanowa i okolice`,
        lead: description,
        bodyText: truncate(richTextToText(service.detailedContent), 2400),
        bodyHtml: richTextToHtml(service.detailedContent),
        ogImage: service.imagePath,
        imageAlt: `${service.name} w BeskidStudio koło Limanowej`,
        noIndex: service.slug === 'inne',
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
        bodyHtml: richTextToHtml(post.content),
        ogImage: post.coverImage,
        imageAlt: post.title,
        ogType: 'article',
        author: post.author?.name || 'Wiktoria Ćwik',
        publishedAt: post.createdAt,
        modifiedAt: post.updatedAt,
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
              author: {
                '@type': 'Person',
                '@id': `${DOMAIN}/o-nas#person`,
                name: post.author?.name || 'Wiktoria Ćwik',
                url: `${DOMAIN}/o-nas`,
                jobTitle: 'Dyplomowany kosmetolog',
                sameAs: [
                  'https://www.facebook.com/kosmetologwiktoriacwik/',
                  'https://www.instagram.com/kosmetolog__wiktoria_cwik/',
                  'https://www.tiktok.com/@wiktoriabeauty_brows',
                ],
              },
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

const staticPageStyles = `<script data-seo-app-shell>document.documentElement.classList.add('seo-js')</script>
<style data-seo-static-styles>
  .seo-js [data-seo-static-content]{display:none}
  [data-seo-static-content]{box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;padding:48px 24px;font-family:Arial,sans-serif;color:#173b2a}
  [data-seo-static-content] *{box-sizing:border-box}
  [data-seo-static-content] a{color:#245f3b;text-decoration-thickness:2px;text-underline-offset:3px}
  [data-seo-static-content] nav a{display:inline-flex;min-height:44px;align-items:center;border:1px solid #bfd1c4;border-radius:8px;padding:10px 14px;font-size:16px;font-weight:700}
  [data-seo-static-content] address a{display:inline-flex;min-height:44px;align-items:center;padding:8px 2px}
  [data-seo-static-content] article img{display:block;max-width:100%;height:auto}
  @media(max-width:640px){
    [data-seo-static-content]{padding:32px 20px;font-size:16px;overflow-wrap:anywhere}
    [data-seo-static-content] header>p:first-child{font-size:14px!important;line-height:1.5}
    [data-seo-static-content] article{font-size:17px!important;line-height:1.75!important}
    [data-seo-static-content] nav{gap:8px!important}
    [data-seo-static-content] nav a{width:100%;min-height:48px}
    [data-seo-static-content] address{display:flex;flex-direction:column;gap:2px}
  }
</style>`;

const staticContent = ({
  heading,
  lead,
  items = [],
  bodyText,
  bodyHtml,
  faq = [],
  author,
  publishedAt,
  modifiedAt,
  noIndex = false,
}) => {
  const textParagraphs = bodyText
    ? cleanText(bodyText).split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
    : '';
  const articleBody = bodyHtml || textParagraphs;
  const dateLine = publishedAt
    ? `<p style="font-size:14px;color:#496255">Opublikowano: <time datetime="${escapeHtml(publishedAt)}">${escapeHtml(new Date(publishedAt).toLocaleDateString('pl-PL'))}</time>${modifiedAt ? ` · Aktualizacja: <time datetime="${escapeHtml(modifiedAt)}">${escapeHtml(new Date(modifiedAt).toLocaleDateString('pl-PL'))}</time>` : ''}</p>`
    : '';

  return `
      <main data-seo-static-content>
        <header>
          <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#76502f">BeskidStudio Wiktoria Ćwik</p>
          <h1 style="font-size:clamp(32px,6vw,58px);line-height:1.08;margin:12px 0 18px">${escapeHtml(heading)}</h1>
          <p style="max-width:760px;font-size:18px;line-height:1.65;color:#3d594a">${escapeHtml(lead)}</p>
          ${author ? `<p style="font-size:15px"><strong>Autor:</strong> <a href="/o-nas">${escapeHtml(author)}, dyplomowany kosmetolog</a></p>` : ''}
          ${dateLine}
        </header>
        ${articleBody ? `<article style="max-width:780px;font-size:16px;line-height:1.75;color:#294438">${articleBody}</article>` : ''}
        <section aria-labelledby="seo-key-facts">
          <h2 id="seo-key-facts" style="margin-top:34px">Najważniejsze informacje</h2>
          <ul style="margin:18px 0;padding-left:22px;line-height:1.9">${items.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <p style="max-width:780px;line-height:1.75">BeskidStudio mieści się przy Mordarka 505, 34-600 Mordarka, kilka minut od Limanowej. Aktualne ceny, czas usług i wolne terminy są publikowane w systemie rezerwacji.</p>
        </section>
        ${!noIndex ? `<section aria-labelledby="seo-how-to-use">
          <h2 id="seo-how-to-use">Jak korzystać ze strony BeskidStudio</h2>
          <p>Przed wyborem terminu sprawdź aktualną ofertę usług, opis zabiegu, czas trwania oraz cenę. Informacje na stronach usług są połączone z systemem salonu, dlatego pomagają porównać dostępne możliwości bez zgadywania. Jeżeli nie masz pewności, który zabieg odpowiada potrzebom Twojej skóry, brwi lub rzęs, zacznij od kontaktu z salonem albo konsultacji. Podczas rozmowy można omówić oczekiwany efekt, dotychczasową pielęgnację i najważniejsze przeciwwskazania.</p>
          <h2>Rezerwacja i przygotowanie do wizyty</h2>
          <p>Wolne godziny sprawdzisz online. Konto klienta jest potrzebne dopiero do potwierdzenia rezerwacji i późniejszego dostępu do historii wizyt oraz zaleceń. Przed spotkaniem przeczytaj opis wybranej usługi i przygotuj informacje o stosowanej pielęgnacji, wcześniejszych zabiegach oraz ewentualnych reakcjach skóry. Jeśli termin trzeba zmienić lub potrzebujesz wskazówek dotyczących przygotowania, zadzwoń pod numer +48 532 128 227 albo napisz na adres kontakt@kosmetologwiktoriacwik.pl.</p>
          <h2>Salon blisko Limanowej</h2>
          <p>BeskidStudio znajduje się w Mordarce 505, 34-600 Mordarka, kilka minut od Limanowej. Z salonu korzystają klientki z Limanowej, Mordarki, Laskowej, Słopnic, Tymbarku, Dobrej i innych miejscowości powiatu limanowskiego. Na stronie kontaktowej znajdziesz mapę dojazdu, godziny pracy oraz bezpośrednie przyciski do telefonu i wiadomości e-mail. Dzięki temu wszystkie informacje potrzebne przed wizytą są dostępne w jednym miejscu także na telefonie.</p>
        </section>` : ''}
        ${faq.length ? `<section aria-labelledby="seo-faq"><h2 id="seo-faq">Najczęstsze pytania</h2>${faq.map(({ question, answer }) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join('')}</section>` : ''}
        <nav aria-label="Najważniejsze strony" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:28px">
          <a href="/">Strona główna</a><a href="/uslugi">Usługi i ceny</a><a href="/kontakt">Kontakt i dojazd</a><a href="/blog">Poradniki</a><a href="/rezerwacja">Umów wizytę</a><!--email_off--><a href="mailto:kontakt@kosmetologwiktoriacwik.pl">Napisz e-mail</a><!--/email_off-->
        </nav>
        <address style="margin-top:34px;font-style:normal;line-height:1.7">Mordarka 505, 34-600 Mordarka · <a href="tel:+48532128227">+48 532 128 227</a> · <!--email_off--><a href="mailto:kontakt@kosmetologwiktoriacwik.pl">kontakt@kosmetologwiktoriacwik.pl</a><!--/email_off--></address>
      </main>`;
};

const spaTemplate = template
  .replace(/\s*<(?:meta|link)[^>]*data-rh="true"[^>]*>/g, '')
  .replace('</head>', '    <meta name="robots" content="noindex,nofollow,noarchive" />\n  </head>')
  .replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"></div>');

const renderPage = (page) => {
  const canonical = `${DOMAIN}${page.path === '/' ? '/' : page.path}`;
  const socialImage = absoluteUrl(page.ogImage) || `${DOMAIN}/images/beautybeskid-hero-premium.webp`;
  const imageAlt = page.imageAlt || `${page.title} — BeskidStudio`;
  const ogType = page.ogType || 'business.business';
  const imageType = /\.png(?:\?|$)/i.test(socialImage)
    ? 'image/png'
    : /\.jpe?g(?:\?|$)/i.test(socialImage)
      ? 'image/jpeg'
      : 'image/webp';
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
    .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${ogType}" data-rh="true" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(page.title)}" data-rh="true" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(page.description)}" data-rh="true" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" data-rh="true" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(socialImage)}" data-rh="true" />`)
    .replace(/<meta property="og:site_name"[^>]*>/, '<meta property="og:site_name" content="BeskidStudio By Wiktoria Ćwik" data-rh="true" />')
    .replace(/<meta property="og:locale"[^>]*>/, '<meta property="og:locale" content="pl_PL" data-rh="true" />')
    .replace(/<meta property="og:image:alt"[^>]*>/, `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" data-rh="true" />`)
    .replace(/<meta property="og:image:type"[^>]*>/, `<meta property="og:image:type" content="${imageType}" data-rh="true" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" data-rh="true" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" data-rh="true" />`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeHtml(socialImage)}" data-rh="true" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" data-rh="true" />`)
    .replace(/<link rel="alternate" hreflang="pl"[^>]*>/, `<link rel="alternate" hreflang="pl" href="${canonical}" data-rh="true" />`)
    .replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, `<link rel="alternate" hreflang="x-default" href="${canonical}" data-rh="true" />`)
    .replace('</head>', `${page.author ? `    <meta name="author" content="${escapeHtml(page.author)}" />\n` : ''}${page.publishedAt ? `    <meta property="article:published_time" content="${escapeHtml(page.publishedAt)}" />\n` : ''}${page.modifiedAt ? `    <meta property="article:modified_time" content="${escapeHtml(page.modifiedAt)}" />\n` : ''}    <meta property="og:image:secure_url" content="${escapeHtml(socialImage)}" />\n    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />\n    ${staticPageStyles}\n    <script type="application/ld+json" data-generated-seo>${serializedSchema}</script>\n  </head>`)
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

console.log(`Generated ${pages.length} SEO entry pages (${dynamicPages.length} dynamic).`);

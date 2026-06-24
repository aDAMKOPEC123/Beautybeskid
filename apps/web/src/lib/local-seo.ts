import { SEO } from '@/lib/seo-config';

export type LocalSeoPageKey =
  | 'kosmetolog-limanowa'
  | 'kosmetolog-mordarka'
  | 'podolog-limanowa'
  | 'podolog-mordarka'
  | 'kosmetyczka-limanowa'
  | 'kosmetyczka-mordarka'
  | 'laminacja-brwi-limanowa'
  | 'laminacja-brwi-mordarka'
  | 'laminacja-rzes-limanowa'
  | 'laminacja-rzes-mordarka';

type LocalSeoFaq = {
  question: string;
  answer: string;
};

export type LocalSeoPageConfig = {
  slug: string;
  shortLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  serviceName: string;
  serviceType: string;
  location: string;
  nearbyContext: string;
  statusNote?: string;
  heroPoints: string[];
  benefits: string[];
  visitSteps: string[];
  localCopy: string;
  faq: LocalSeoFaq[];
  related: LocalSeoPageKey[];
};

export const localAreas = [
  'Limanowa',
  'Mordarka',
  'Sowliny',
  'Łososina Górna',
  'Pisarzowa',
  'Stara Wieś',
  'Laskowa',
  'Słopnice',
  'Tymbark',
  'Dobra',
  'Mszana Dolna',
  'Jodłownik',
  'Nowy Sącz',
];

const limanowaContext =
  'Salon przyjmuje klientki z Limanowej oraz okolicznych miejscowości: Mordarki, Sowlin, Łososiny Górnej, Pisarzowej, Starej Wsi, Laskowej, Słopnic, Tymbarku i Dobrej.';

const mordarkaContext =
  'Dla klientek z Mordarki ważny jest szybki kontakt, jasne terminy i dojazd do gabinetu w rejonie Limanowej bez szukania salonu w większym mieście.';

const beautyFaq = (service: string, place: string): LocalSeoFaq[] => [
  {
    question: `Czy BeautyBeskid obsługuje klientki z ${place}?`,
    answer: `Tak. BeautyBeskid działa lokalnie dla Limanowej, Mordarki i okolic powiatu limanowskiego. Przed wizytą możesz sprawdzić aktualne terminy online albo skontaktować się telefonicznie.`,
  },
  {
    question: `Jak umówić ${service} w BeautyBeskid?`,
    answer:
      'Najprościej przejść do rezerwacji online, wybrać usługę z aktualnej oferty i sprawdzić dostępne godziny. Jeśli nie wiesz, co wybrać, możesz zacząć od konsultacji.',
  },
  {
    question: 'Czy przed pierwszą wizytą potrzebna jest konsultacja?',
    answer:
      'Przy pierwszej wizycie konsultacja jest bardzo pomocna, bo pozwala dobrać zabieg do potrzeb skóry, brwi, rzęs, paznokci lub stóp oraz omówić przeciwwskazania.',
  },
];

const podologyFaq = (place: string): LocalSeoFaq[] => [
  {
    question: `Czy podolog w BeautyBeskid przyjmuje klientki z ${place}?`,
    answer:
      'Podologia w BeautyBeskid jest rozwijana jako osobna ścieżka usług. Na stronie jasno pokazujemy aktualną dostępność i możliwość zostawienia kontaktu, gdy zapisy zostaną uruchomione.',
  },
  {
    question: 'Kiedy warto skonsultować stopy?',
    answer:
      'Warto reagować przy bolesnych zrogowaceniach, odciskach, problemach z paznokciami, pękających piętach albo dyskomforcie podczas chodzenia. W razie wątpliwości najlepiej zacząć od rozmowy i oceny problemu.',
  },
  {
    question: 'Czy można sprawdzić aktualną dostępność podologii online?',
    answer:
      'Tak. Aktualne usługi i wolne terminy są widoczne w rezerwacji online. Jeśli podologia nie jest jeszcze aktywna w grafiku, możesz zostawić kontakt przez formularz konsultacyjny.',
  },
];

export const localSeoPages: Record<LocalSeoPageKey, LocalSeoPageConfig> = {
  'kosmetolog-limanowa': {
    slug: 'kosmetolog-limanowa',
    shortLabel: 'Kosmetolog Limanowa',
    title: 'Kosmetolog Limanowa — konsultacje i zabiegi',
    description:
      'Kosmetolog Limanowa: BeautyBeskid Wiktoria Ćwik. Konsultacje, indywidualny plan zabiegowy, rezerwacja online i opieka dla klientek z Limanowej, Mordarki i okolic.',
    eyebrow: 'Kosmetolog Limanowa',
    h1: 'Kosmetolog w Limanowej dla świadomej pielęgnacji skóry',
    lead:
      'Szukasz kosmetologa w Limanowej, który dobierze zabieg spokojnie, bez presji i z jasnym planem? BeautyBeskid łączy konsultację, aktualną ofertę zabiegów i wygodną rezerwację online.',
    serviceName: 'Konsultacja kosmetologiczna i zabiegi kosmetologiczne',
    serviceType: 'Kosmetologia',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'indywidualna analiza potrzeb skóry',
      'plan zabiegowy zamiast przypadkowych decyzji',
      'terminy online dla Limanowej i okolic',
    ],
    benefits: [
      'Dobór zabiegu do kondycji skóry, sezonu i Twoich oczekiwań.',
      'Spokojne omówienie przeciwwskazań, pielęgnacji domowej i efektów.',
      'Stały kontakt po wizycie przez panel klienta i czat salonu.',
    ],
    visitSteps: [
      'Rozmawiamy o potrzebach skóry i wcześniejszej pielęgnacji.',
      'Dobieramy kierunek zabiegowy oraz realny rytm kolejnych wizyt.',
      'Po zabiegu dostajesz jasne zalecenia i możliwość powrotu do historii wizyt.',
    ],
    localCopy:
      'Frazy takie jak kosmetolog Limanowa, salon kosmetologiczny Limanowa czy konsultacja kosmetologiczna Limanowa prowadzą do tej samej intencji: klientka chce znaleźć specjalistkę blisko siebie, z aktualnym grafikiem i konkretną ofertą.',
    faq: beautyFaq('konsultację kosmetologiczną', 'Limanowej'),
    related: ['kosmetyczka-limanowa', 'laminacja-brwi-limanowa', 'podolog-limanowa'],
  },
  'kosmetolog-mordarka': {
    slug: 'kosmetolog-mordarka',
    shortLabel: 'Kosmetolog Mordarka',
    title: 'Kosmetolog Mordarka — BeautyBeskid Limanowa',
    description:
      'Kosmetolog dla klientek z Mordarki i okolic Limanowej. BeautyBeskid: konsultacje, aktualne zabiegi, wygodne terminy i rezerwacja online.',
    eyebrow: 'Kosmetolog Mordarka',
    h1: 'Kosmetolog dla klientek z Mordarki i okolic Limanowej',
    lead:
      'Jeśli mieszkasz w Mordarce i szukasz kosmetologa blisko Limanowej, BeautyBeskid pomaga dobrać zabieg do potrzeb skóry, harmonogramu i oczekiwanego efektu.',
    serviceName: 'Konsultacja kosmetologiczna dla klientek z Mordarki',
    serviceType: 'Kosmetologia',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    heroPoints: [
      'dojazd z Mordarki bez planowania całego dnia',
      'konsultacja i aktualna oferta w jednym miejscu',
      'kontakt telefoniczny, online i przez panel klienta',
    ],
    benefits: [
      'Wybierasz termin dopasowany do codziennego rytmu.',
      'Dostajesz konkretny plan pielęgnacji zamiast ogólnej porady.',
      'Możesz wracać do zaleceń i historii wizyt w panelu klienta.',
    ],
    visitSteps: [
      'Najpierw ustalamy cel wizyty i możliwe przeciwwskazania.',
      'Następnie wybieramy aktywną usługę albo konsultację wstępną.',
      'Po wizycie otrzymujesz zalecenia i propozycję dalszej opieki.',
    ],
    localCopy:
      'Strona odpowiada na lokalne wyszukiwania kosmetolog Mordarka, kosmetolog koło Mordarki oraz kosmetolog Limanowa dla osób, które chcą szybko znaleźć gabinet w najbliższej okolicy.',
    faq: beautyFaq('konsultację kosmetologiczną', 'Mordarki'),
    related: ['kosmetolog-limanowa', 'kosmetyczka-mordarka', 'laminacja-brwi-mordarka'],
  },
  'podolog-limanowa': {
    slug: 'podolog-limanowa',
    shortLabel: 'Podolog Limanowa',
    title: 'Podolog Limanowa — pielęgnacja stóp i konsultacje',
    description:
      'Podolog Limanowa: BeautyBeskid rozwija podologiczną ścieżkę usług. Sprawdź aktualną dostępność, zostaw kontakt i umów konsultację w rejonie Limanowej.',
    eyebrow: 'Podolog Limanowa',
    h1: 'Podolog w Limanowej — aktualna dostępność i konsultacje stóp',
    lead:
      'Problemy ze stopami warto omówić szybko i bez wstydu. BeautyBeskid przygotowuje podologiczną ścieżkę usług, a strona pokazuje aktualne możliwości kontaktu i rezerwacji.',
    serviceName: 'Konsultacja podologiczna i pielęgnacja stóp',
    serviceType: 'Podologia',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    statusNote:
      'Podologia jest oznaczana zgodnie z aktualną dostępnością w systemie. Jeśli zapisy nie są jeszcze aktywne, zostaw kontakt przez konsultację.',
    heroPoints: [
      'jasna informacja o dostępności usługi',
      'kontakt dla osób z Limanowej i okolic',
      'spokojne omówienie problemu przed wizytą',
    ],
    benefits: [
      'Wsparcie przy problemach z paznokciami, zrogowaceniami i dyskomfortem stóp.',
      'Czytelna ścieżka kontaktu bez zgadywania, czy usługa jest już dostępna.',
      'Możliwość dołączenia do listy zainteresowanych startem zapisów.',
    ],
    visitSteps: [
      'Opisujesz problem i oczekiwany efekt wizyty.',
      'Sprawdzamy, czy usługa jest aktywna w grafiku i kiedy można wrócić z terminem.',
      'Jeśli potrzebna jest konsultacja, przechodzisz przez prostą ścieżkę kontaktu.',
    ],
    localCopy:
      'W wynikach Google dla podolog Limanowa mocno widoczne są katalogi i pojedyncze gabinety. Ta podstrona wzmacnia lokalną trafność BeautyBeskid bez ukrywania aktualnego statusu usługi.',
    faq: podologyFaq('Limanowej'),
    related: ['podolog-mordarka', 'kosmetolog-limanowa', 'kosmetyczka-limanowa'],
  },
  'podolog-mordarka': {
    slug: 'podolog-mordarka',
    shortLabel: 'Podolog Mordarka',
    title: 'Podolog Mordarka — konsultacje stóp koło Limanowej',
    description:
      'Podolog dla Mordarki i okolic Limanowej. BeautyBeskid: aktualna dostępność usług podologicznych, kontakt i rezerwacja online.',
    eyebrow: 'Podolog Mordarka',
    h1: 'Podolog dla klientek z Mordarki i najbliższych okolic',
    lead:
      'Szukasz podologa w Mordarce lub blisko Limanowej? BeautyBeskid buduje przejrzystą ścieżkę kontaktu dla osób, które chcą skonsultować stopy lokalnie.',
    serviceName: 'Konsultacja podologiczna dla klientek z Mordarki',
    serviceType: 'Podologia',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    statusNote:
      'Jeżeli podologia nie jest jeszcze widoczna w rezerwacji, najlepiej zostawić kontakt i wrócić do zapisu po uruchomieniu grafiku.',
    heroPoints: [
      'lokalna strona dla zapytań z Mordarki',
      'jasny status dostępności podologii',
      'kontakt bez szukania wielu kanałów naraz',
    ],
    benefits: [
      'Wygodna informacja dla osób z Mordarki, Sowlin i okolicy.',
      'Możliwość rozmowy o problemie zanim wybierzesz konkretny zabieg.',
      'Spójne dane kontaktowe, telefon i rezerwacja w jednym miejscu.',
    ],
    visitSteps: [
      'Zgłaszasz problem przez kontakt lub konsultację.',
      'Salon potwierdza aktualną możliwość zapisu.',
      'Po uruchomieniu terminów wybierasz dogodną godzinę online.',
    ],
    localCopy:
      'Podstrona wzmacnia widoczność na frazy podolog Mordarka, podologia Mordarka i podolog Limanowa, czyli zapytania osób szukających pomocy blisko domu.',
    faq: podologyFaq('Mordarki'),
    related: ['podolog-limanowa', 'kosmetolog-mordarka', 'kosmetyczka-mordarka'],
  },
  'kosmetyczka-limanowa': {
    slug: 'kosmetyczka-limanowa',
    shortLabel: 'Kosmetyczka Limanowa',
    title: 'Kosmetyczka Limanowa — BeautyBeskid',
    description:
      'Kosmetyczka Limanowa: BeautyBeskid to salon beauty i kosmetologiczny z aktualnymi zabiegami, konsultacją i rezerwacją online dla Limanowej i okolic.',
    eyebrow: 'Kosmetyczka Limanowa',
    h1: 'Kosmetyczka w Limanowej — zabiegi beauty z planem i spokojem',
    lead:
      'Wiele klientek wpisuje w Google kosmetyczka Limanowa, choć szuka po prostu zaufanego gabinetu beauty. BeautyBeskid łączy estetykę, konsultację i wygodny zapis online.',
    serviceName: 'Zabiegi kosmetyczne i konsultacje beauty',
    serviceType: 'Usługi kosmetyczne',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'aktualna oferta zabiegów w jednym miejscu',
      'konsultacja dla nowych klientek',
      'rezerwacja online i kontakt telefoniczny',
    ],
    benefits: [
      'Zabiegi dobierane do oczekiwań, okazji i realnego efektu.',
      'Przyjazna atmosfera bez presji sprzedażowej.',
      'Możliwość sprawdzenia najbliższych terminów przed założeniem konta.',
    ],
    visitSteps: [
      'Wybierasz usługę z aktualnej oferty albo zaczynasz od konsultacji.',
      'Sprawdzasz termin i potwierdzasz wizytę online.',
      'Po wizycie masz dostęp do historii i zaleceń w panelu klienta.',
    ],
    localCopy:
      'Ta podstrona odpowiada na popularne lokalne zapytania: kosmetyczka Limanowa, salon kosmetyczny Limanowa, zabiegi kosmetyczne Limanowa oraz kosmetyczka okolice Limanowej.',
    faq: beautyFaq('zabieg kosmetyczny', 'Limanowej'),
    related: ['kosmetolog-limanowa', 'laminacja-brwi-limanowa', 'laminacja-rzes-limanowa'],
  },
  'kosmetyczka-mordarka': {
    slug: 'kosmetyczka-mordarka',
    shortLabel: 'Kosmetyczka Mordarka',
    title: 'Kosmetyczka Mordarka — salon beauty koło Limanowej',
    description:
      'Kosmetyczka dla klientek z Mordarki. BeautyBeskid Limanowa: zabiegi beauty, konsultacje, wolne terminy i rezerwacja online.',
    eyebrow: 'Kosmetyczka Mordarka',
    h1: 'Kosmetyczka dla klientek z Mordarki — blisko Limanowej',
    lead:
      'Jeśli szukasz kosmetyczki w Mordarce lub najbliższej okolicy, BeautyBeskid daje wygodny dostęp do aktualnej oferty, kontaktu i terminów online.',
    serviceName: 'Zabiegi kosmetyczne dla klientek z Mordarki',
    serviceType: 'Usługi kosmetyczne',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    heroPoints: [
      'lokalny gabinet beauty w rejonie Limanowej',
      'sprawdzenie terminów online',
      'oferta dopasowana do aktualnego grafiku salonu',
    ],
    benefits: [
      'Nie musisz szukać salonu w Nowym Sączu, jeśli zależy Ci na czymś blisko.',
      'W jednym miejscu masz usługi, kontakt i rezerwację.',
      'Konsultacja pomaga wybrać zabieg bez zgadywania.',
    ],
    visitSteps: [
      'Sprawdzasz ofertę albo przechodzisz do konsultacji.',
      'Wybierasz termin pasujący do grafiku.',
      'Po wizycie salon może zapisać zalecenia i kolejne kroki.',
    ],
    localCopy:
      'Strona wzmacnia lokalne wyszukiwania kosmetyczka Mordarka, salon kosmetyczny Mordarka oraz kosmetyczka Limanowa dla osób z pobliskich miejscowości.',
    faq: beautyFaq('zabieg kosmetyczny', 'Mordarki'),
    related: ['kosmetyczka-limanowa', 'kosmetolog-mordarka', 'laminacja-rzes-mordarka'],
  },
  'laminacja-brwi-limanowa': {
    slug: 'laminacja-brwi-limanowa',
    shortLabel: 'Laminacja brwi Limanowa',
    title: 'Laminacja brwi Limanowa — stylizacja brwi',
    description:
      'Laminacja brwi Limanowa: naturalnie ułożone brwi, konsultacja, aktualne terminy i rezerwacja online w BeautyBeskid dla Limanowej, Mordarki i okolic.',
    eyebrow: 'Laminacja brwi Limanowa',
    h1: 'Laminacja brwi w Limanowej — naturalny efekt i wygodna rezerwacja',
    lead:
      'Laminacja brwi porządkuje kierunek włosków i pomaga uzyskać bardziej zadbany, pełniejszy wygląd bez codziennego układania od zera.',
    serviceName: 'Laminacja brwi',
    serviceType: 'Stylizacja brwi',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'naturalne ułożenie brwi',
      'możliwość połączenia z koloryzacją lub regulacją, jeśli jest dostępna',
      'terminy online dla Limanowej i okolic',
    ],
    benefits: [
      'Efekt zadbanych, bardziej uporządkowanych brwi.',
      'Dobór stylizacji do rysów twarzy i oczekiwań.',
      'Wskazówki pielęgnacyjne, które pomagają utrzymać efekt po zabiegu.',
    ],
    visitSteps: [
      'Omawiamy oczekiwany efekt i stan włosków.',
      'Dobieramy stylizację tak, aby brwi wyglądały naturalnie.',
      'Po zabiegu dostajesz krótkie zalecenia pielęgnacyjne.',
    ],
    localCopy:
      'Wyszukiwania laminacja brwi Limanowa i stylizacja brwi Limanowa często prowadzą do katalogów. Własna podstrona pozwala pokazać klientce konkretny gabinet, kontakt i rezerwację bez pośredników.',
    faq: beautyFaq('laminację brwi', 'Limanowej'),
    related: ['laminacja-rzes-limanowa', 'kosmetyczka-limanowa', 'kosmetolog-limanowa'],
  },
  'laminacja-brwi-mordarka': {
    slug: 'laminacja-brwi-mordarka',
    shortLabel: 'Laminacja brwi Mordarka',
    title: 'Laminacja brwi Mordarka — BeautyBeskid',
    description:
      'Laminacja brwi dla klientek z Mordarki i okolic Limanowej. BeautyBeskid: naturalna stylizacja brwi, kontakt i rezerwacja online.',
    eyebrow: 'Laminacja brwi Mordarka',
    h1: 'Laminacja brwi dla klientek z Mordarki',
    lead:
      'Dla klientek z Mordarki laminacja brwi w rejonie Limanowej to wygodny sposób na zadbane, naturalnie ułożone brwi bez dojazdu do dużego miasta.',
    serviceName: 'Laminacja brwi dla klientek z Mordarki',
    serviceType: 'Stylizacja brwi',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    heroPoints: [
      'lokalna stylizacja brwi blisko Mordarki',
      'sprawdzenie terminów online',
      'naturalny efekt dopasowany do twarzy',
    ],
    benefits: [
      'Brwi wyglądają bardziej uporządkowanie na co dzień.',
      'Stylizacja może skrócić poranną rutynę.',
      'Masz jasną ścieżkę kontaktu i rezerwacji.',
    ],
    visitSteps: [
      'Sprawdzamy kondycję brwi i oczekiwany efekt.',
      'Wybieramy zakres stylizacji dostępny w aktualnej ofercie.',
      'Omawiamy pielęgnację po laminacji.',
    ],
    localCopy:
      'Podstrona odpowiada na frazy laminacja brwi Mordarka, brwi Mordarka i laminacja brwi Limanowa dla osób szukających usługi w najbliższym otoczeniu.',
    faq: beautyFaq('laminację brwi', 'Mordarki'),
    related: ['laminacja-brwi-limanowa', 'laminacja-rzes-mordarka', 'kosmetyczka-mordarka'],
  },
  'laminacja-rzes-limanowa': {
    slug: 'laminacja-rzes-limanowa',
    shortLabel: 'Laminacja rzęs Limanowa',
    title: 'Laminacja rzęs Limanowa — lifting i odżywienie',
    description:
      'Laminacja rzęs Limanowa: naturalne podkreślenie rzęs, konsultacja, aktualne terminy i rezerwacja online w BeautyBeskid.',
    eyebrow: 'Laminacja rzęs Limanowa',
    h1: 'Laminacja rzęs w Limanowej — naturalne podkreślenie spojrzenia',
    lead:
      'Laminacja rzęs pomaga unieść i podkreślić naturalne rzęsy, kiedy chcesz efektu zadbanego spojrzenia bez codziennego mocnego makijażu.',
    serviceName: 'Laminacja rzęs',
    serviceType: 'Stylizacja rzęs',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'naturalne podkreślenie rzęs',
      'spokojna konsultacja przed zabiegiem',
      'aktualne terminy online',
    ],
    benefits: [
      'Efekt bardziej otwartego, świeżego spojrzenia.',
      'Opcja dla osób, które lubią naturalny wygląd bez przedłużania.',
      'Zalecenia po zabiegu pomagające utrzymać efekt.',
    ],
    visitSteps: [
      'Omawiamy oczekiwany skręt i kondycję naturalnych rzęs.',
      'Dobieramy zabieg zgodnie z aktualną ofertą salonu.',
      'Po wizycie dostajesz proste zalecenia pielęgnacyjne.',
    ],
    localCopy:
      'Osoby wpisujące laminacja rzęs Limanowa, lifting rzęs Limanowa albo rzęsy Limanowa szukają konkretnej usługi i szybkiej możliwości zapisu. Ta strona skraca drogę od wyszukania do rezerwacji.',
    faq: beautyFaq('laminację rzęs', 'Limanowej'),
    related: ['laminacja-brwi-limanowa', 'kosmetyczka-limanowa', 'kosmetolog-limanowa'],
  },
  'laminacja-rzes-mordarka': {
    slug: 'laminacja-rzes-mordarka',
    shortLabel: 'Laminacja rzęs Mordarka',
    title: 'Laminacja rzęs Mordarka — salon koło Limanowej',
    description:
      'Laminacja rzęs dla klientek z Mordarki. BeautyBeskid Limanowa: naturalny lifting rzęs, kontakt, terminy i rezerwacja online.',
    eyebrow: 'Laminacja rzęs Mordarka',
    h1: 'Laminacja rzęs dla klientek z Mordarki i okolic',
    lead:
      'Jeśli szukasz laminacji rzęs w Mordarce, sprawdź BeautyBeskid w rejonie Limanowej: aktualne usługi, wygodne terminy i kontakt w jednym miejscu.',
    serviceName: 'Laminacja rzęs dla klientek z Mordarki',
    serviceType: 'Stylizacja rzęs',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    heroPoints: [
      'lokalna strona dla klientek z Mordarki',
      'naturalny efekt bez mocnego makijażu',
      'łatwe przejście do rezerwacji',
    ],
    benefits: [
      'Wygodny wybór terminu w rejonie Limanowej.',
      'Stylizacja dopasowana do naturalnych rzęs.',
      'Kontakt i zalecenia po zabiegu bez rozproszenia po różnych kanałach.',
    ],
    visitSteps: [
      'Sprawdzamy kondycję rzęs i preferowany efekt.',
      'Wybieramy dostępny zabieg z aktualnej oferty.',
      'Po wizycie omawiamy pielęgnację i trwałość efektu.',
    ],
    localCopy:
      'Podstrona jest przygotowana pod zapytania laminacja rzęs Mordarka, lifting rzęs Mordarka i laminacja rzęs Limanowa, czyli lokalne frazy o wysokiej intencji rezerwacji.',
    faq: beautyFaq('laminację rzęs', 'Mordarki'),
    related: ['laminacja-rzes-limanowa', 'laminacja-brwi-mordarka', 'kosmetyczka-mordarka'],
  },
};

export const localSeoLinks = Object.values(localSeoPages).map(({ slug, shortLabel }) => ({
  to: `/${slug}`,
  label: shortLabel,
}));

export const buildLocalSeoSchema = (page: LocalSeoPageConfig) => {
  const pageUrl = `${SEO.domain}/${page.slug}`;
  const salonId = `${SEO.domain}/#beautysalon`;
  const serviceId = `${pageUrl}#service`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BeautySalon',
        '@id': salonId,
        name: SEO.siteName,
        alternateName: ['BeautyBeskid', 'Wiktoria Ćwik BeautyBeskid'],
        url: SEO.domain,
        telephone: SEO.phone,
        email: SEO.email,
        image: `${SEO.domain}/images/beautybeskid-hero-premium.webp`,
        address: {
          '@type': 'PostalAddress',
          ...(SEO.address.street ? { streetAddress: SEO.address.street } : {}),
          addressLocality: SEO.address.city,
          postalCode: SEO.address.postalCode,
          addressRegion: SEO.address.region,
          addressCountry: 'PL',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: SEO.lat,
          longitude: SEO.lon,
        },
        founder: {
          '@type': 'Person',
          name: SEO.owner.name,
          jobTitle: SEO.owner.role,
        },
        areaServed: localAreas.map((name) => ({ '@type': 'Place', name })),
        knowsAbout: [
          'kosmetolog Limanowa',
          'kosmetyczka Limanowa',
          'podolog Limanowa',
          'laminacja brwi Limanowa',
          'laminacja rzęs Limanowa',
          'kosmetolog Mordarka',
          'kosmetyczka Mordarka',
        ],
        sameAs: [SEO.fbProfile, SEO.igProfile, SEO.ttProfile],
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: page.title,
        description: page.description,
        inLanguage: 'pl-PL',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SEO.domain}/#website`,
          name: SEO.siteName,
          url: SEO.domain,
        },
        about: { '@id': serviceId },
        primaryImageOfPage: `${SEO.domain}/images/beautybeskid-hero-premium.webp`,
      },
      {
        '@type': 'Service',
        '@id': serviceId,
        name: page.serviceName,
        serviceType: page.serviceType,
        description: page.lead,
        provider: { '@id': salonId },
        areaServed: page.location,
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SEO.domain}/rezerwacja`,
          servicePhone: SEO.phone,
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Strona główna',
            item: SEO.domain,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Usługi',
            item: `${SEO.domain}/uslugi`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: page.shortLabel,
            item: pageUrl,
          },
        ],
      },
    ],
  };
};

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
  | 'laminacja-rzes-mordarka'
  | 'oprawa-oka-limanowa'
  | 'oprawa-oka-mordarka'
  | 'wrastajace-paznokcie-limanowa'
  | 'wrastajace-paznokcie-mordarka';

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
  indexable?: boolean;
  redirectTo?: string;
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
    question: `Czy BeskidStudio By Wiktoria Ćwik obsługuje klientki z ${place}?`,
    answer: `Tak. BeskidStudio By Wiktoria Ćwik działa lokalnie dla Limanowej, Mordarki i okolic powiatu limanowskiego. Przed wizytą możesz sprawdzić aktualne terminy online albo skontaktować się telefonicznie.`,
  },
  {
    question: `Jak umówić ${service} w BeskidStudio By Wiktoria Ćwik?`,
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
    question: `Czy podolog w BeskidStudio By Wiktoria Ćwik przyjmuje klientki z ${place}?`,
    answer:
      'Podologia w BeskidStudio By Wiktoria Ćwik jest rozwijana jako osobna ścieżka usług. Na stronie jasno pokazujemy aktualną dostępność i możliwość zostawienia kontaktu, gdy zapisy zostaną uruchomione.',
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


const ingrowingNailsFaq = (place: string): LocalSeoFaq[] => [
  {
    question: `Czy BeskidStudio By Wiktoria Ćwik pomaga z wrastającymi paznokciami w ${place}?`,
    answer:
      `Korekcja wrastających paznokci to element podologii, którą BeskidStudio By Wiktoria Ćwik rozbudowuje jako osobną ścieżkę usług. Na stronie znajdziesz aktualny status dostępności i możliwość zostawienia kontaktu przed uruchomieniem zapisów.`,
  },
  {
    question: 'Kiedy warto skonsultować wrastający paznokieć ze specjalistą?',
    answer:
      'Warto reagować przy bólu, zaczerwienieniu lub obrzęku wokół paznokcia, nawracającym problemie oraz gdy domowe metody nie pomagają. Im wcześniej, tym prościej i mniej inwazyjnie.',
  },
  {
    question: 'Czy korekcja wrastającego paznokcia boli?',
    answer:
      'Profesjonalna korekcja nie powinna boleć — specjalista dobiera metodę do etapu problemu i ocenia stan paznokcia przed zabiegiem.',
  },
];

const eyeFramingFaq = (place: string): LocalSeoFaq[] => [
  {
    question: `Co obejmuje oprawa oka w BeskidStudio By Wiktoria Ćwik?`,
    answer:
      `Oprawa oka w BeskidStudio By Wiktoria Ćwik łączy laminację brwi, stylizację brwi, laminację rzęs i pielęgnację okolicy oka jako zabieg lub dobierany zestaw. Zakres dobieramy do kształtu twarzy i oczekiwanego efektu.`,
  },
  {
    question: `Czy mogę umówić oprawę oka z ${place}?`,
    answer:
      'Tak. Salon obsługuje klientki z Limanowej, Mordarki i okolic powiatu limanowskiego. Sprawdź aktualne usługi i dostępne godziny w rezerwacji online.',
  },
  {
    question: 'Jak długo utrzymuje się efekt oprawa oka?',
    answer:
      'Laminacja brwi i rzęs utrzymuje się ok. 4–6 tygodni. Po zabiegu dostaniesz wskazówki, jak przedłużyć efekt bez codziennego stylizowania.',
  },
];

export const localSeoPages: Record<LocalSeoPageKey, LocalSeoPageConfig> = {
  'kosmetolog-limanowa': {
    slug: 'kosmetolog-limanowa',
    shortLabel: 'Kosmetolog Limanowa',
    title: 'Kosmetolog Limanowa — konsultacje i zabiegi',
    description:
      'Kosmetolog Limanowa: BeskidStudio Wiktoria Ćwik. Konsultacje, indywidualny plan zabiegowy, rezerwacja online i opieka dla klientek z Limanowej, Mordarki i okolic.',
    eyebrow: 'Kosmetolog Limanowa',
    h1: 'Kosmetolog w Limanowej dla świadomej pielęgnacji skóry',
    lead:
      'Szukasz kosmetologa w Limanowej, który dobierze zabieg spokojnie, bez presji i z jasnym planem? BeskidStudio By Wiktoria Ćwik łączy konsultację, aktualną ofertę zabiegów i wygodną rezerwację online.',
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
      'Jako salon kosmetologiczny w Mordarce 505 obsługujemy klientki z Limanowej i całego powiatu limanowskiego. Niezależnie czy szukasz konsultacji, planu zabiegowego, czy regularnej opieki nad skórą — w BeskidStudio By Wiktoria Ćwik znajdziesz konkretne terminy i aktualną ofertę.',
    faq: beautyFaq('konsultację kosmetologiczną', 'Limanowej'),
    related: ['kosmetyczka-limanowa', 'laminacja-brwi-limanowa', 'podolog-limanowa'],
    indexable: false,
    redirectTo: '/',
  },
  'kosmetolog-mordarka': {
    slug: 'kosmetolog-mordarka',
    shortLabel: 'Kosmetolog Mordarka',
    title: 'Kosmetolog Mordarka — BeskidStudio By Wiktoria Ćwik Limanowa',
    description:
      'Kosmetolog dla klientek z Mordarki i okolic Limanowej. BeskidStudio By Wiktoria Ćwik: konsultacje, aktualne zabiegi, wygodne terminy i rezerwacja online.',
    eyebrow: 'Kosmetolog Mordarka',
    h1: 'Kosmetolog dla klientek z Mordarki i okolic Limanowej',
    lead:
      'Jeśli mieszkasz w Mordarce i szukasz kosmetologa blisko Limanowej, BeskidStudio By Wiktoria Ćwik pomaga dobrać zabieg do potrzeb skóry, harmonogramu i oczekiwanego efektu.',
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
      'Mordarka leży w centrum powiatu limanowskiego, a salon BeskidStudio By Wiktoria Ćwik jest dostępny bez długiego dojazdu. Dla klientek z Mordarki i okolicznych miejscowości oferujemy wygodne terminy, kontakt telefoniczny i rezerwację online.',
    faq: beautyFaq('konsultację kosmetologiczną', 'Mordarki'),
    related: ['kosmetolog-limanowa', 'kosmetyczka-mordarka', 'laminacja-brwi-mordarka'],
  },
  'podolog-limanowa': {
    slug: 'podolog-limanowa',
    shortLabel: 'Podolog Limanowa',
    title: 'Podolog Limanowa — pielęgnacja stóp i konsultacje',
    description:
      'Podolog Limanowa: BeskidStudio By Wiktoria Ćwik rozwija podologiczną ścieżkę usług. Sprawdź aktualną dostępność, zostaw kontakt i umów konsultację w rejonie Limanowej.',
    eyebrow: 'Podolog Limanowa',
    h1: 'Podolog w Limanowej — aktualna dostępność i konsultacje stóp',
    lead:
      'Problemy ze stopami warto omówić szybko i bez wstydu. BeskidStudio By Wiktoria Ćwik przygotowuje podologiczną ścieżkę usług, a strona pokazuje aktualne możliwości kontaktu i rezerwacji.',
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
      'Problemy ze stopami — wrastające paznokcie, zrogowacenia, odciski — warto omówić ze specjalistą zamiast rozwiązywać samodzielnie. BeskidStudio By Wiktoria Ćwik rozwija podologiczną ścieżkę usług, aby klientki z Limanowej i okolic miały dostęp do profesjonalnej pomocy blisko domu.',
    faq: podologyFaq('Limanowej'),
    related: ['podolog-mordarka', 'kosmetolog-limanowa', 'kosmetyczka-limanowa'],
    indexable: false,
  },
  'podolog-mordarka': {
    slug: 'podolog-mordarka',
    shortLabel: 'Podolog Mordarka',
    title: 'Podolog Mordarka — konsultacje stóp koło Limanowej',
    description:
      'Podolog dla Mordarki i okolic Limanowej. BeskidStudio By Wiktoria Ćwik: aktualna dostępność usług podologicznych, kontakt i rezerwacja online.',
    eyebrow: 'Podolog Mordarka',
    h1: 'Podolog dla klientek z Mordarki i najbliższych okolic',
    lead:
      'Szukasz podologa w Mordarce lub blisko Limanowej? BeskidStudio By Wiktoria Ćwik buduje przejrzystą ścieżkę kontaktu dla osób, które chcą skonsultować stopy lokalnie.',
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
      'Dla klientek z Mordarki i pobliskich wsi BeskidStudio By Wiktoria Ćwik to wygodna opcja bez konieczności dojazdu do centrum Limanowej lub Nowego Sącza. Podologia jest rozwijana jako osobna ścieżka, z jasną informacją o dostępności i możliwością wcześniejszego kontaktu.',
    faq: podologyFaq('Mordarki'),
    related: ['podolog-limanowa', 'kosmetolog-mordarka', 'kosmetyczka-mordarka'],
    indexable: false,
  },
  'kosmetyczka-limanowa': {
    slug: 'kosmetyczka-limanowa',
    shortLabel: 'Kosmetyczka Limanowa',
    title: 'Kosmetyczka Limanowa — BeskidStudio By Wiktoria Ćwik',
    description:
      'Kosmetyczka Limanowa: BeskidStudio By Wiktoria Ćwik to salon beauty i kosmetologiczny z aktualnymi zabiegami, konsultacją i rezerwacją online dla Limanowej i okolic.',
    eyebrow: 'Kosmetyczka Limanowa',
    h1: 'Kosmetyczka w Limanowej — zabiegi beauty z planem i spokojem',
    lead:
      'Wiele klientek wpisuje w Google kosmetyczka Limanowa, choć szuka po prostu zaufanego gabinetu beauty. BeskidStudio By Wiktoria Ćwik łączy estetykę, konsultację i wygodny zapis online.',
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
      'W BeskidStudio By Wiktoria Ćwik podchodzimy do każdej klientki indywidualnie — czy szukasz zabiegu na wyjątkową okazję, regularnej pielęgnacji, czy po prostu chcesz sprawdzić aktualną ofertę. Obsługujemy klientki z Limanowej, Mordarki i całego powiatu limanowskiego.',
    faq: beautyFaq('zabieg kosmetyczny', 'Limanowej'),
    related: ['kosmetolog-limanowa', 'laminacja-brwi-limanowa', 'laminacja-rzes-limanowa'],
  },
  'kosmetyczka-mordarka': {
    slug: 'kosmetyczka-mordarka',
    shortLabel: 'Kosmetyczka Mordarka',
    title: 'Kosmetyczka Mordarka — salon beauty koło Limanowej',
    description:
      'Kosmetyczka dla klientek z Mordarki. BeskidStudio By Wiktoria Ćwik Limanowa: zabiegi beauty, konsultacje, wolne terminy i rezerwacja online.',
    eyebrow: 'Kosmetyczka Mordarka',
    h1: 'Kosmetyczka dla klientek z Mordarki — blisko Limanowej',
    lead:
      'Jeśli szukasz kosmetyczki w Mordarce lub najbliższej okolicy, BeskidStudio By Wiktoria Ćwik daje wygodny dostęp do aktualnej oferty, kontaktu i terminów online.',
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
      'Salon BeskidStudio By Wiktoria Ćwik jest w zasięgu bez potrzeby planowania wyjazdu do większego miasta. Dla klientek z Mordarki i okolicznych wsi oferujemy czytelny grafik, kontakt i pełną ofertę zabiegową z możliwością rezerwacji online.',
    faq: beautyFaq('zabieg kosmetyczny', 'Mordarki'),
    related: ['kosmetyczka-limanowa', 'kosmetolog-mordarka', 'laminacja-rzes-mordarka'],
    indexable: false,
    redirectTo: '/kosmetyczka-limanowa',
  },
  'laminacja-brwi-limanowa': {
    slug: 'laminacja-brwi-limanowa',
    shortLabel: 'Laminacja brwi Limanowa',
    title: 'Laminacja brwi Limanowa — stylizacja brwi',
    description:
      'Laminacja brwi Limanowa: naturalnie ułożone brwi, konsultacja, aktualne terminy i rezerwacja online w BeskidStudio By Wiktoria Ćwik dla Limanowej, Mordarki i okolic.',
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
      'Laminacja brwi to jeden z najchętniej wybieranych zabiegów w naszym salonie — naturalnie ułożone brwi, które wyglądają zadbanie bez codziennego stylizowania. Obsługujemy klientki z Limanowej, Mordarki, Sowlin i całego powiatu limanowskiego.',
    faq: beautyFaq('laminację brwi', 'Limanowej'),
    related: ['laminacja-rzes-limanowa', 'kosmetyczka-limanowa', 'kosmetolog-limanowa'],
  },
  'laminacja-brwi-mordarka': {
    slug: 'laminacja-brwi-mordarka',
    shortLabel: 'Laminacja brwi Mordarka',
    title: 'Laminacja brwi Mordarka — BeskidStudio By Wiktoria Ćwik',
    description:
      'Laminacja brwi dla klientek z Mordarki i okolic Limanowej. BeskidStudio By Wiktoria Ćwik: naturalna stylizacja brwi, kontakt i rezerwacja online.',
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
      'Dla klientek z Mordarki laminacja brwi w BeskidStudio By Wiktoria Ćwik to bliski dojazd i konkretny efekt — bez szukania salonu w większym mieście. Gabinet mieści się w Mordarce 505, w sercu powiatu limanowskiego.',
    faq: beautyFaq('laminację brwi', 'Mordarki'),
    related: ['laminacja-brwi-limanowa', 'laminacja-rzes-mordarka', 'kosmetyczka-mordarka'],
    indexable: false,
    redirectTo: '/laminacja-brwi-limanowa',
  },
  'laminacja-rzes-limanowa': {
    slug: 'laminacja-rzes-limanowa',
    shortLabel: 'Laminacja rzęs Limanowa',
    title: 'Laminacja rzęs Limanowa — lifting i odżywienie',
    description:
      'Laminacja rzęs Limanowa: naturalne podkreślenie rzęs, konsultacja, aktualne terminy i rezerwacja online w BeskidStudio By Wiktoria Ćwik.',
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
      'Laminacja rzęs sprawia, że spojrzenie wygląda bardziej otwarcie i świeżo — bez przedłużania ani codziennego tuszowania. W BeskidStudio By Wiktoria Ćwik dobieramy skręt do naturalnych rzęs i oczekiwanego efektu, z aktualnym grafikiem dla klientek z Limanowej i okolic.',
    faq: beautyFaq('laminację rzęs', 'Limanowej'),
    related: ['laminacja-brwi-limanowa', 'kosmetyczka-limanowa', 'kosmetolog-limanowa'],
  },

  'oprawa-oka-limanowa': {
    slug: 'oprawa-oka-limanowa',
    shortLabel: 'Oprawa oka Limanowa',
    title: 'Oprawa oka Limanowa — laminacja brwi i rzęs BeskidStudio By Wiktoria Ćwik',
    description:
      'Oprawa oka Limanowa: BeskidStudio By Wiktoria Ćwik — laminacja brwi, stylizacja brwi, laminacja rzęs i pielęgnacja okolicy oka. Konsultacja, terminy online i rezerwacja.',
    eyebrow: 'Oprawa oka Limanowa',
    h1: 'Oprawa oka w Limanowej — laminacja brwi i rzęs',
    lead:
      'Oprawa oka to jeden z najprostszych sposobów na zadbany, świeży wygląd bez codziennego makijażu. BeskidStudio By Wiktoria Ćwik łączy laminację brwi, stylizację i laminację rzęs w jednym miejscu.',
    serviceName: 'Oprawa oka — stylizacja brwi i rzęs',
    serviceType: 'Stylizacja brwi i rzęs',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'laminacja brwi i rzęs w jednym miejscu',
      'naturalny efekt dopasowany do rysów twarzy',
      'aktualne terminy i rezerwacja online',
    ],
    benefits: [
      'Zadbane brwi i rzęsy bez codziennego stylizowania od zera.',
      'Dobór zabiegu do kształtu twarzy i naturalnych włosków.',
      'Zalecenia pielęgnacyjne po wizycie, które przedłużają efekt.',
    ],
    visitSteps: [
      'Omawiamy stan brwi i rzęs oraz oczekiwany efekt.',
      'Dobieramy zakres stylizacji dostępny w aktualnej ofercie.',
      'Po zabiegu dostajesz zalecenia i możliwość zapisu na kolejną wizytę.',
    ],
    localCopy:
      'Klientki z Limanowej szukają oprawa oka, mając na myśli naturalnie zadbane brwi i rzęsy bez widocznego makijażu. W BeskidStudio By Wiktoria Ćwik w Mordarce 505 dobieramy laminację brwi, stylizację i laminację rzęs do realnych potrzeb każdej klientki.',
    faq: eyeFramingFaq('Limanowej'),
    related: ['laminacja-brwi-limanowa', 'laminacja-rzes-limanowa', 'kosmetyczka-limanowa'],
  },
  'oprawa-oka-mordarka': {
    slug: 'oprawa-oka-mordarka',
    shortLabel: 'Oprawa oka Mordarka',
    title: 'Oprawa oka Mordarka — BeskidStudio By Wiktoria Ćwik koło Limanowej',
    description:
      'Oprawa oka dla klientek z Mordarki. BeskidStudio By Wiktoria Ćwik: laminacja brwi, stylizacja brwi i rzęs, konsultacja i rezerwacja online w rejonie Limanowej.',
    eyebrow: 'Oprawa oka Mordarka',
    h1: 'Oprawa oka dla klientek z Mordarki i okolic',
    lead:
      'Jeśli szukasz oprawa oka w Mordarce, BeskidStudio By Wiktoria Ćwik w Mordarce 505 to wygodna opcja bez dojazdu do centrum — aktualna oferta, kontakt i terminy online.',
    serviceName: 'Oprawa oka dla klientek z Mordarki',
    serviceType: 'Stylizacja brwi i rzęs',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    heroPoints: [
      'lokalny salon beauty blisko Mordarki',
      'naturalny efekt bez codziennego makijażu',
      'łatwe przejście do rezerwacji',
    ],
    benefits: [
      'Brwi i rzęsy wyglądają zadbanie na co dzień.',
      'Stały kontakt i historia wizyt w panelu klienta.',
      'Wygodny dojazd bez szukania salonu w większym mieście.',
    ],
    visitSteps: [
      'Sprawdzamy kondycję brwi i rzęs oraz preferowany efekt.',
      'Wybieramy dostępne usługi z aktualnego grafiku salonu.',
      'Omawiamy pielęgnację i termin kolejnej wizyty.',
    ],
    localCopy:
      'Salon BeskidStudio By Wiktoria Ćwik mieści się w Mordarce 505 — dla klientek z Mordarki i okolicznych wsi to wygodny wybór oprawa oka blisko domu. Laminacja brwi i rzęs, stylizacja okolicy oka i pełna oferta w jednym miejscu.',
    faq: eyeFramingFaq('Mordarki'),
    related: ['oprawa-oka-limanowa', 'laminacja-brwi-mordarka', 'laminacja-rzes-mordarka'],
    indexable: false,
    redirectTo: '/oprawa-oka-limanowa',
  },
  'wrastajace-paznokcie-limanowa': {
    slug: 'wrastajace-paznokcie-limanowa',
    shortLabel: 'Wrastające paznokcie Limanowa',
    title: 'Wrastające paznokcie Limanowa — podolog BeskidStudio By Wiktoria Ćwik',
    description:
      'Wrastające paznokcie Limanowa: BeskidStudio By Wiktoria Ćwik rozwija podologię jako osobną ścieżkę usług. Sprawdź dostępność i umów konsultację dla klientek z Limanowej i okolic.',
    eyebrow: 'Wrastające paznokcie Limanowa',
    h1: 'Wrastające paznokcie w Limanowej — konsultacja i korekcja',
    lead:
      'Wrastający paznokieć warto rozwiązać profesjonalnie zamiast odkładać. BeskidStudio By Wiktoria Ćwik przygotowuje podologiczną ścieżkę usług z jasną informacją o dostępności dla klientek z Limanowej.',
    serviceName: 'Korekcja wrastających paznokci',
    serviceType: 'Podologia',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    statusNote:
      'Podologia, w tym korekcja wrastających paznokci, jest rozwijana jako osobna ścieżka usług. Jeśli zapisów nie ma jeszcze w grafiku, zostaw kontakt przez formularz konsultacyjny.',
    heroPoints: [
      'jasna informacja o dostępności podologii',
      'korekcja bez długiego szukania specjalisty',
      'kontakt dla klientek z Limanowej i powiatu limanowskiego',
    ],
    benefits: [
      'Profesjonalna ocena problemu zamiast domowych metod.',
      'Kontakt i konsultacja dostępne online lub telefonicznie.',
      'Czytelna ścieżka do zapisu w momencie uruchomienia grafiku.',
    ],
    visitSteps: [
      'Opisujesz problem i pytasz o aktualną dostępność.',
      'Salon potwierdza możliwość zapisu lub dołącza do listy kontaktowej.',
      'Przy aktywnym grafiku umawiasz konkretną godzinę online.',
    ],
    localCopy:
      'Wrastające paznokcie to jeden z najczęstszych problemów podologicznych — i jeden z tych, które warto omówić ze specjalistą jak najwcześniej. BeskidStudio By Wiktoria Ćwik w Mordarce 505 buduje podologiczną ścieżkę usług dla klientek z Limanowej i całego powiatu limanowskiego.',
    faq: ingrowingNailsFaq('Limanowej'),
    related: ['podolog-limanowa', 'wrastajace-paznokcie-mordarka', 'kosmetyczka-limanowa'],
    indexable: false,
  },
  'wrastajace-paznokcie-mordarka': {
    slug: 'wrastajace-paznokcie-mordarka',
    shortLabel: 'Wrastające paznokcie Mordarka',
    title: 'Wrastające paznokcie Mordarka — podolog koło Limanowej',
    description:
      'Wrastające paznokcie dla klientek z Mordarki. BeskidStudio By Wiktoria Ćwik: dostępność podologii, korekcja wrastających paznokci i rezerwacja online.',
    eyebrow: 'Wrastające paznokcie Mordarka',
    h1: 'Wrastające paznokcie dla klientek z Mordarki i okolic',
    lead:
      'Szukasz specjalisty od wrastających paznokci blisko Mordarki? BeskidStudio By Wiktoria Ćwik w Mordarce 505 rozbudowuje podologię z jasną informacją o dostępności i wygodnym kontaktem.',
    serviceName: 'Korekcja wrastających paznokci dla klientek z Mordarki',
    serviceType: 'Podologia',
    location: 'Mordarka',
    nearbyContext: mordarkaContext,
    statusNote:
      'Korekcja wrastających paznokci wchodzi w skład podologii, którą BeskidStudio By Wiktoria Ćwik aktywuje jako osobną ścieżkę. Sprawdź dostępność lub zostaw kontakt przez formularz.',
    heroPoints: [
      'lokalny specjalista blisko Mordarki',
      'jasny status dostępności korekcji paznokci',
      'kontakt bez szukania kilku numerów naraz',
    ],
    benefits: [
      'Nie musisz jechać do Nowego Sącza po profesjonalną pomoc.',
      'Wygodna ścieżka kontaktu i info o starcie zapisów.',
      'Korekcja dobrana do etapu problemu, nie jednego szablonu.',
    ],
    visitSteps: [
      'Zgłaszasz problem przez formularz lub telefon.',
      'Salon ocenia dostępność i możliwość szybkiego zapisu.',
      'Umawiasz wizytę online po uruchomieniu grafiku.',
    ],
    localCopy:
      'Dla klientek z Mordarki i pobliskich miejscowości BeskidStudio By Wiktoria Ćwik to wygodna opcja bez planowania dojazdu do centrum. Korekcja wrastających paznokci jest częścią podologicznej ścieżki usług — aktualna dostępność i kontakt zawsze widoczne na stronie.',
    faq: ingrowingNailsFaq('Mordarki'),
    related: ['wrastajace-paznokcie-limanowa', 'podolog-mordarka', 'kosmetyczka-mordarka'],
    indexable: false,
  },

  'laminacja-rzes-mordarka': {
    slug: 'laminacja-rzes-mordarka',
    shortLabel: 'Laminacja rzęs Mordarka',
    title: 'Laminacja rzęs Mordarka — salon koło Limanowej',
    description:
      'Laminacja rzęs dla klientek z Mordarki. BeskidStudio By Wiktoria Ćwik Limanowa: naturalny lifting rzęs, kontakt, terminy i rezerwacja online.',
    eyebrow: 'Laminacja rzęs Mordarka',
    h1: 'Laminacja rzęs dla klientek z Mordarki i okolic',
    lead:
      'Jeśli szukasz laminacji rzęs w Mordarce, sprawdź BeskidStudio By Wiktoria Ćwik w rejonie Limanowej: aktualne usługi, wygodne terminy i kontakt w jednym miejscu.',
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
      'Salon BeskidStudio By Wiktoria Ćwik w Mordarce 505 to wygodna opcja dla klientek z całego powiatu limanowskiego. Laminacja rzęs jest dostępna w aktualnym grafiku — sprawdź terminy online lub zadzwoń, żeby omówić szczegóły.',
    faq: beautyFaq('laminację rzęs', 'Mordarki'),
    related: ['laminacja-rzes-limanowa', 'laminacja-brwi-mordarka', 'kosmetyczka-mordarka'],
    indexable: false,
    redirectTo: '/laminacja-rzes-limanowa',
  },
};

export const localSeoLinks = Object.values(localSeoPages)
  .filter((page) => page.indexable !== false && !page.redirectTo)
  .map(({ slug, shortLabel }) => ({
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
        alternateName: ['BeskidStudio By Wiktoria Ćwik', 'Wiktoria Ćwik BeskidStudio By Wiktoria Ćwik'],
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

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
  | 'wrastajace-paznokcie-mordarka'
  | 'spa-stop-limanowa'
  | 'podologia-limanowa';

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
  extendedSections?: { heading: string; content: string }[];
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

const spaStopFaq = (place: string): LocalSeoFaq[] => [
  {
    question: `Czy BeskidStudio By Wiktoria Ćwik oferuje SPA stóp dla klientek z ${place}?`,
    answer:
      'Tak. Zabieg SPA stóp obejmuje kąpiel, peeling, nawilżanie i masaż stóp. Sprawdź aktualną ofertę i wolne terminy w rezerwacji online lub skontaktuj się telefonicznie.',
  },
  {
    question: 'Czym różni się SPA stóp od pedicure podologicznego?',
    answer:
      'SPA stóp to zabieg relaksacyjno-pielęgnacyjny nastawiony na nawilżenie, regenerację i odprężenie. Pedicure podologiczny to zabieg leczniczy — skupia się na usuwaniu zrogowaceń, odcisków i problemach z paznokciami. Oba zabiegi mogą się uzupełniać.',
  },
  {
    question: 'Jak często warto korzystać z SPA stóp?',
    answer:
      'Optymalna częstotliwość to co 3–4 tygodnie, zwłaszcza w sezonie letnim, gdy stopy są bardziej eksponowane. Regularne zabiegi pomagają utrzymać skórę stóp w dobrej kondycji i zapobiegają pękaniu pięt.',
  },
  {
    question: 'Ile trwa zabieg SPA stóp?',
    answer:
      'Zabieg SPA stóp trwa zazwyczaj od 45 do 60 minut. Obejmuje kąpiel, peeling, maskę nawilżającą i masaż. Dokładny czas zależy od wybranego wariantu — szczegóły znajdziesz w aktualnej ofercie.',
  },
  {
    question: 'Czy SPA stóp jest odpowiednie dla osób z wrażliwą skórą?',
    answer:
      'Tak — dobieramy kosmetyki i intensywność zabiegu do stanu skóry. Jeśli masz alergię lub skórę atopową, wspomnij o tym przy rezerwacji, żebyśmy mogli przygotować odpowiednie produkty.',
  },
];

const podologiaFaq = (place: string): LocalSeoFaq[] => [
  {
    question: `Czy w BeskidStudio By Wiktoria Ćwik przyjmuje podolog dla klientek z ${place}?`,
    answer:
      'Tak. Oferujemy zabiegi podologiczne obejmujące pedicure leczniczy, pielęgnację problematycznych paznokci, usuwanie zrogowaceń i odcisków oraz konsultacje stóp. Sprawdź dostępność w rezerwacji online.',
  },
  {
    question: 'Czym się różni podolog od kosmetyczki robiącej pedicure?',
    answer:
      'Podolog specjalizuje się w zdrowiu stóp — diagnozuje i leczy problemy takie jak wrastające paznokcie, grzybica, zrogowacenia, pękające pięty i modzele. Pedicure kosmetyczny skupia się na estetyce — malowaniu, kształtowaniu paznokci i nawilżaniu.',
  },
  {
    question: 'Jakie problemy ze stopami wymagają wizyty u podologa?',
    answer:
      'Do podologa warto udać się z wrastającymi paznokciami, bolesnymi odciskami i zrogowaceniami, grzybicą paznokci, pękającymi piętami, nadmierną potliwością stóp oraz przy problemach z chodzeniem związanych z kondycją stóp.',
  },
  {
    question: 'Czy pedicure podologiczny boli?',
    answer:
      'Profesjonalny pedicure podologiczny nie powinien boleć. Specjalista dobiera narzędzia i technikę do problemu. Przy wrastającym paznokciu pierwsza wizyta może wiązać się z lekkim dyskomfortem, ale korekcja jest prowadzona delikatnie i stopniowo.',
  },
  {
    question: 'Ile kosztuje wizyta u podologa w okolicach Limanowej?',
    answer:
      'Ceny zabiegów podologicznych zależą od zakresu — pedicure leczniczy, korekcja paznokci czy usuwanie zrogowaceń mają różne stawki. Aktualny cennik znajdziesz w naszej ofercie usług lub zadzwoń, żeby dopytać o konkretny zabieg.',
  },
  {
    question: 'Jak przygotować się do wizyty u podologa?',
    answer:
      'Nie nakładaj lakieru na paznokcie przed wizytą — podolog musi ocenić stan paznokci. Jeśli to pierwsza wizyta, przygotuj się na rozmowę o problemie, jego historii i dotychczasowych metodach radzenia sobie.',
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
  },
  'kosmetolog-mordarka': {
    slug: 'kosmetolog-mordarka',
    shortLabel: 'Kosmetolog Mordarka',
    title: 'Kosmetolog Mordarka — gabinet kosmetologiczny Wiktoria Ćwik',
    description:
      'Gabinet kosmetologiczny w Mordarce 505. Kosmetolog Wiktoria Ćwik: laminacja brwi i rzęs, pedicure podologiczny, pielęgnacja skóry. ✔ Rezerwacja online ☎ 532 128 227.',
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
    related: ['kosmetyczka-limanowa', 'laminacja-brwi-limanowa', 'laminacja-rzes-limanowa'],
  },
  'podolog-limanowa': {
    slug: 'podolog-limanowa',
    shortLabel: 'Podolog Limanowa',
    title: 'Podolog Limanowa — pedicure podologiczny ✔ Umów wizytę',
    description:
      'Podolog koło Limanowej — wrastające paznokcie, zrogowacenia, pękające pięty. Pedicure podologiczny w sterylnym gabinecie. ☎ 532 128 227. Rezerwacja online, Mordarka 505.',
    eyebrow: 'Podolog Limanowa',
    h1: 'Podolog w Limanowej — profesjonalna pielęgnacja stóp',
    lead:
      'Szukasz podologa w okolicach Limanowej? W BeskidStudio By Wiktoria Ćwik zajmujemy się pielęgnacją stóp, pedicure podologicznym i konsultacjami. Wygodna rezerwacja online i gabinet 5 minut od Limanowej.',
    serviceName: 'Podologia i pedicure podologiczny',
    serviceType: 'Podologia',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'pedicure podologiczny i pielęgnacja stóp',
      'konsultacja stanu stóp przed zabiegiem',
      'rezerwacja online dla Limanowej i okolic',
    ],
    benefits: [
      'Profesjonalna pomoc przy problemach z paznokciami, zrogowaceniami i pękającymi piętami.',
      'Indywidualne podejście — ocena stóp i dobór zabiegu do konkretnego problemu.',
      'Wygodny dojazd z Limanowej i okolic, parking pod gabinetem.',
    ],
    visitSteps: [
      'Opisujesz problem ze stopami i omawiamy historię dolegliwości.',
      'Oceniamy stan stóp i dobieramy odpowiedni zabieg podologiczny.',
      'Po zabiegu otrzymujesz zalecenia pielęgnacyjne i propozycję kolejnej wizyty.',
    ],
    localCopy:
      'Problemy ze stopami — wrastające paznokcie, zrogowacenia, odciski, pękające pięty — warto rozwiązać z profesjonalistą. BeskidStudio By Wiktoria Ćwik w Mordarce 505 oferuje zabiegi podologiczne dla klientek z Limanowej, Mordarki, Sowlin i całego powiatu limanowskiego. Gabinet znajduje się zaledwie 5 minut jazdy z centrum Limanowej.',
    faq: podologiaFaq('Limanowej'),
    related: ['spa-stop-limanowa', 'kosmetyczka-limanowa', 'podologia-limanowa'],
    extendedSections: [
      {
        heading: 'Czym zajmuje się podolog?',
        content:
          'Podolog to specjalista zajmujący się zdrowiem i pielęgnacją stóp. W odróżnieniu od kosmetycznego pedicure, podologia koncentruje się na rozwiązywaniu problemów medyczno-estetycznych: wrastających paznokciach, zrogowaceniach, odciskach, modzeli, pękających piętach, nadmiernej potliwości i zmianach grzybiczych paznokci.\n\nPodolog ocenia stan stóp, identyfikuje problem i dobiera odpowiednią metodę leczenia. Regularny pedicure podologiczny pomaga utrzymać stopy w zdrowiu i zapobiega nawracaniu problemów.',
      },
      {
        heading: 'Kiedy warto udać się do podologa w Limanowej?',
        content:
          'Wizyta u podologa jest wskazana przy: bolesnych zrogowaceniach i odciskach, które utrudniają chodzenie; wrastających paznokciach z bólem lub stanem zapalnym; pękających, suchych piętach; pogrubiałych lub zniekształconych paznokciach; podejrzeniu grzybicy paznokci; nadmiernym rogowaceniu skóry stóp.\n\nNie czekaj, aż problem się pogłębi. Im wcześniej skonsultujesz stopy ze specjalistą, tym prostsza i mniej inwazyjna będzie interwencja. W BeskidStudio możesz umówić się na konsultację, podczas której ocenimy stan stóp i zaproponujemy odpowiednie postępowanie.',
      },
      {
        heading: 'Pedicure podologiczny vs kosmetyczny — jakie są różnice?',
        content:
          'Pedicure kosmetyczny skupia się na estetyce — malowaniu paznokci, kształtowaniu, nawilżaniu skóry. To zabieg pielęgnacyjny dla zdrowych stóp. Pedicure podologiczny to zabieg leczniczy: specjalista usuwa zrogowacenia, odciski i modzele za pomocą profesjonalnych frezów, zajmuje się problematycznymi paznokciami i ocenia kondycję stóp.\n\nW BeskidStudio łączymy profesjonalizm podologiczny z komfortem gabinetu kosmetologicznego. Zabieg odbywa się w czystym, sterylnym otoczeniu, z użyciem specjalistycznych narzędzi jednorazowych lub sterylizowanych w autoklawie.',
      },
      {
        heading: 'Jak wygląda wizyta u podologa w BeskidStudio?',
        content:
          'Pierwsza wizyta zaczyna się od wywiadu — pytamy o charakter problemu, jego historię, stosowane leki i dotychczasowe metody leczenia. Następnie dokładnie oceniamy stopy: paznokcie, skórę, zrogowacenia, ewentualne zmiany chorobowe.\n\nNa podstawie oceny dobieramy zabieg — może to być pedicure podologiczny, usunięcie zrogowaceń frezem, korekcja wrastającego paznokcia lub pielęgnacja pękających pięt. Po zabiegu omawiamy zalecenia domowe i proponujemy termin kontrolny. Cała wizyta trwa zazwyczaj 45–75 minut.',
      },
      {
        heading: 'Profilaktyka zdrowia stóp — porady podologa',
        content:
          'Zdrowe stopy to kwestia codziennych nawyków. Noś wygodne buty z odpowiednim wsparciem łuku stopy. Regularnie nawilżaj skórę stóp kremem z mocznikiem. Obcinaj paznokcie prosto, nie zaokrąglając rogów — to zapobiega wrastaniu. Codziennie myj stopy i dokładnie osuszaj przestrzenie między palcami.\n\nRegularny pedicure podologiczny co 4–6 tygodni pomaga utrzymać stopy w dobrej kondycji i pozwala wcześnie wychwycić potencjalne problemy. Szczególnie ważna jest profilaktyka u osób z cukrzycą, chorobami naczyniowymi i u seniorów.',
      },
    ],
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
    related: ['podolog-limanowa', 'kosmetolog-mordarka', 'kosmetyczka-limanowa'],
    redirectTo: '/podolog-limanowa',
  },
  'kosmetyczka-limanowa': {
    slug: 'kosmetyczka-limanowa',
    shortLabel: 'Kosmetyczka Limanowa',
    title: 'Kosmetyczka Limanowa — salon kosmetyczny ✔ Rezerwacja online',
    description:
      'Szukasz dobrej kosmetyczki w Limanowej? Laminacja brwi i rzęs, henna pudrowa, pedicure, depilacja. Gabinet 5 min od centrum. ☎ 532 128 227. Umów wizytę online.',
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
    faq: [
      ...beautyFaq('zabieg kosmetyczny', 'Limanowej'),
      {
        question: 'Ile kosztują zabiegi u kosmetyczki w okolicach Limanowej?',
        answer:
          'Ceny zależą od rodzaju zabiegu — konsultacja kosmetologiczna, laminacja brwi, laminacja rzęs i pielęgnacja twarzy mają różne stawki. Aktualny cennik z konkretnymi kwotami znajdziesz na naszej stronie z usługami lub w systemie rezerwacji online.',
      },
      {
        question: 'Czy kosmetyczka w BeskidStudio przyjmuje bez wcześniejszej rezerwacji?',
        answer:
          'Preferujemy rezerwację online lub telefoniczną, żeby zagwarantować Ci komfort i odpowiednią ilość czasu na zabieg. W wyjątkowych sytuacjach możesz zadzwonić i sprawdzić dostępność w danym dniu.',
      },
      {
        question: 'Jak dojechać do kosmetyczki w Mordarce z Limanowej?',
        answer:
          'Gabinet BeskidStudio mieści się w Mordarce 505, około 5 minut jazdy z centrum Limanowej. Dojazd jest wygodny zarówno samochodem (parking pod gabinetem), jak i autobusem — przystanek w pobliżu. Dokładną lokalizację znajdziesz na stronie kontaktowej z mapą.',
      },
    ],
    related: ['kosmetolog-mordarka', 'laminacja-brwi-limanowa', 'laminacja-rzes-limanowa'],
    extendedSections: [
      {
        heading: 'Co oferuje kosmetyczka w okolicach Limanowej?',
        content:
          'Dobra kosmetyczka w okolicy Limanowej to nie tylko osoba wykonująca zabiegi — to specjalistka, która rozumie potrzeby skóry i potrafi dobrać pielęgnację do indywidualnych oczekiwań. W BeskidStudio By Wiktoria Ćwik każda wizyta zaczyna się od rozmowy o stanie skóry, dotychczasowej pielęgnacji i celu wizyty.\n\nOferujemy pełen zakres usług kosmetycznych: konsultację kosmetologiczną, laminację brwi i rzęs, hennę brwi, oprawę oka, peelingi oraz zaawansowane zabiegi pielęgnacyjne na twarz. Niezależnie czy szukasz zabiegu na specjalną okazję, czy regularnej opieki — znajdziesz u nas aktualną ofertę z przejrzystymi cenami i wygodną rezerwacją online.',
      },
      {
        heading: 'Jak wybrać dobrą kosmetyczkę w Limanowej?',
        content:
          'Wybierając kosmetyczkę w Limanowej, zwróć uwagę na kilka kluczowych aspektów. Po pierwsze — kwalifikacje. Kosmetolog to osoba z wykształceniem wyższym, która posiada pogłębioną wiedzę o budowie skóry, przeciwwskazaniach i nowoczesnych metodach pielęgnacji.\n\nPo drugie — podejście do klientki. Dobra kosmetyczka nie sprzedaje zabiegów na siłę, ale najpierw słucha i ocenia potrzeby. W BeskidStudio stawiamy na konsultację przed pierwszym zabiegiem, co pozwala uniknąć rozczarowań i dobrać pielęgnację precyzyjnie.\n\nPo trzecie — przejrzystość oferty. Cennik, dostępne terminy i zakres usług powinny być jasne jeszcze przed wizytą. Dlatego udostępniamy rezerwację online z aktualnym grafikiem i widocznymi cenami.',
      },
      {
        heading: 'Najpopularniejsze zabiegi kosmetyczne w naszym gabinecie',
        content:
          'Klientki z Limanowej i okolic najczęściej wybierają laminację brwi — zabieg porządkujący kierunek włosków, nadający brwiom pełniejszy, naturalny wygląd na 4–6 tygodni. Równie popularna jest laminacja rzęs i lifting rzęs, który podkreśla spojrzenie bez potrzeby codziennego makijażu.\n\nOprawa oka to kompleksowy zabieg łączący stylizację brwi i rzęs — idealny dla osób, które chcą jednorazowo zadbać o całą okolicę oczu. Dla osób z problemami skórnymi polecamy konsultację kosmetologiczną, podczas której analizujemy stan skóry i proponujemy odpowiednią ścieżkę zabiegową.',
      },
      {
        heading: 'Czego spodziewać się podczas pierwszej wizyty?',
        content:
          'Pierwsza wizyta w BeskidStudio to przede wszystkim rozmowa. Nie zaczynamy od razu od zabiegu — chcemy zrozumieć Twoje potrzeby, ewentualne alergie, stosowane kosmetyki i wcześniejsze doświadczenia.\n\nNa podstawie tej rozmowy proponujemy konkretny zabieg lub plan zabiegowy. Omawiamy oczekiwane efekty, czas trwania, ewentualne przeciwwskazania i pielęgnację domową po zabiegu. Gabinet mieści się w Mordarce 505, zaledwie 5 minut jazdy z centrum Limanowej, z wygodnym parkingiem.',
      },
      {
        heading: 'Pielęgnacja między wizytami u kosmetyczki',
        content:
          'Regularna pielęgnacja domowa to podstawa utrzymania efektów zabiegów gabinetowych. Po każdej wizycie w BeskidStudio otrzymujesz konkretne zalecenia — jakich kosmetyków używać, czego unikać i kiedy wrócić na kolejny zabieg.\n\nW panelu klienta masz dostęp do historii wizyt i zaleceń, dzięki czemu zawsze możesz wrócić do rekomendacji. To nasza metoda na ciągłość opieki — nie tylko jednorazowy zabieg, ale budowanie świadomej pielęgnacji krok po kroku.',
      },
    ],
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
    related: ['kosmetyczka-limanowa', 'kosmetolog-mordarka', 'laminacja-rzes-limanowa'],
    indexable: false,
    redirectTo: '/kosmetyczka-limanowa',
  },
  'laminacja-brwi-limanowa': {
    slug: 'laminacja-brwi-limanowa',
    shortLabel: 'Laminacja brwi Limanowa',
    title: 'Laminacja brwi w Limanowej — dojazd, przygotowanie i FAQ',
    description:
      'Laminacja brwi w Limanowej: dojazd do BeskidStudio, przygotowanie, przebieg, FAQ oraz przejście do aktualnej ceny i rezerwacji online.',
    eyebrow: 'Laminacja brwi Limanowa',
    h1: 'Laminacja brwi w Limanowej — dojazd, przygotowanie i odpowiedzi',
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
    related: ['laminacja-rzes-limanowa', 'kosmetyczka-limanowa', 'kosmetolog-mordarka'],
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
    related: ['laminacja-brwi-limanowa', 'laminacja-rzes-limanowa', 'kosmetyczka-limanowa'],
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
    faq: [
      ...beautyFaq('laminację rzęs', 'Limanowej'),
      {
        question: 'Ile trwa laminacja rzęs i jak długo utrzymuje się efekt?',
        answer:
          'Zabieg laminacji rzęs trwa około 45–60 minut. Efekt — podkręcone, ciemniejsze i optycznie dłuższe rzęsy — utrzymuje się przez 6–8 tygodni, w zależności od naturalnego cyklu wzrostu rzęs i pielęgnacji po zabiegu.',
      },
      {
        question: 'Czy laminacja rzęs jest bezpieczna?',
        answer:
          'Tak, laminacja rzęs wykonywana przez wykwalifikowanego kosmetologa jest zabiegiem bezpiecznym. Używamy certyfikowanych preparatów i dobieramy skręt do naturalnych rzęs. Jedynym przeciwwskazaniem są aktywne infekcje oczu, alergie na składniki preparatu oraz ciąża.',
      },
      {
        question: 'Czym różni się laminacja rzęs od przedłużania?',
        answer:
          'Laminacja pracuje z Twoimi naturalnymi rzęsami — podkręca je, odżywia i przyciemnia. Przedłużanie dodaje sztuczne włókna do naturalnych rzęs. Laminacja daje efekt naturalniejszy, nie obciąża rzęs i nie wymaga regularnych uzupełnień co 2–3 tygodnie.',
      },
      {
        question: 'Jak pielęgnować rzęsy po laminacji?',
        answer:
          'Przez pierwsze 24 godziny po zabiegu nie moczymy rzęs, nie nakładamy makijażu na oczy i nie pocieramy powiek. Potem wystarczy delikatnie czesać rzęsy szczoteczką i unikać tłustych demakijaży olejowych, które mogą osłabić efekt laminacji.',
      },
    ],
    related: ['laminacja-brwi-limanowa', 'kosmetyczka-limanowa', 'oprawa-oka-limanowa'],
    extendedSections: [
      {
        heading: 'Czym jest laminacja rzęs?',
        content:
          'Laminacja rzęs to zabieg kosmetyczny, który nadaje naturalnym rzęsom piękny skręt, przyciemnia je i odżywia keratyną. Efekt przypomina użycie zalotki i tuszu jednocześnie — ale utrzymuje się przez kilka tygodni bez codziennego nakładania makijażu.\n\nZabieg polega na nałożeniu specjalnych preparatów, które modelują kształt rzęs, utrwalają skręt, a następnie odżywiają włoski keratyną i botoksem. Rzęsy wyglądają dłuższe, grubsze i bardziej podkręcone, zachowując przy tym naturalny wygląd.',
      },
      {
        heading: 'Jak przebiega zabieg laminacji rzęs w BeskidStudio?',
        content:
          'Zabieg zaczynamy od rozmowy — oceniamy stan naturalnych rzęs, omawiamy oczekiwany skręt i dobieramy odpowiedni rozmiar wałeczka laminacyjnego. Cały proces trwa około 45–60 minut i jest bezbolesny.\n\nEtapy zabiegu: oczyszczenie rzęs i okolicy oka, nałożenie rzęs na silikonowy wałeczek, aplikacja preparatu liftingującego, utrwalenie kształtu, koloryzacja (opcjonalnie) oraz odżywienie keratyną. Po zabiegu rzęsy są od razu gotowe — nie trzeba czekać na efekt.',
      },
      {
        heading: 'Laminacja rzęs a przedłużanie — co wybrać?',
        content:
          'To częste pytanie klientek w Limanowej. Laminacja rzęs pracuje wyłącznie z naturalnymi rzęsami — podkręca je, przyciemnia i wzmacnia. Nie dodaje sztucznych włókien, więc efekt jest naturalny i nie obciąża rzęs. Utrzymuje się 6–8 tygodni bez potrzeby uzupełnień.\n\nPrzedłużanie rzęs polega na doklejaniu sztucznych włosków do naturalnych. Daje bardziej dramatyczny efekt, ale wymaga regularnych uzupełnień co 2–3 tygodnie i może osłabiać naturalne rzęsy przy długotrwałym stosowaniu. Laminacja jest idealnym wyborem dla osób ceniących naturalny look i minimalną pielęgnację.',
      },
      {
        heading: 'Dla kogo jest laminacja rzęs?',
        content:
          'Laminacja rzęs sprawdzi się u osób z prostymi, opadającymi lub niewidocznymi rzęsami, które chcą podkreślić spojrzenie bez codziennego makijażu. To doskonały zabieg na wakacje, wyjazdy i dla osób z aktywnym trybem życia.\n\nZabieg jest odpowiedni praktycznie dla każdego — jedynymi przeciwwskazaniami są aktywne infekcje oczu, alergie na składniki preparatu, ciąża i okres karmienia piersią. Jeśli nosisz soczewki kontaktowe, zdejmij je przed zabiegiem.',
      },
      {
        heading: 'Efekty laminacji rzęs — czego się spodziewać?',
        content:
          'Po laminacji rzęsy wyglądają na dłuższe o 30–40%, bardziej podkręcone i ciemniejsze. Efekt jest widoczny natychmiast po zabiegu i utrzymuje się przez 6–8 tygodni, stopniowo zanikając wraz z naturalnym cyklem wzrostu rzęs.\n\nNajlepsze efekty osiąga się przy regularnych zabiegach — po kilku laminacjach rzęsy stają się grubsze i zdrowsze dzięki odżywieniu keratyną. Między zabiegami wystarczy delikatne czesanie szczoteczką i unikanie tłustych demakijaży.',
      },
    ],
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
    related: ['oprawa-oka-limanowa', 'laminacja-brwi-limanowa', 'laminacja-rzes-limanowa'],
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
    related: ['wrastajace-paznokcie-limanowa', 'podolog-mordarka', 'kosmetyczka-limanowa'],
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
    related: ['laminacja-rzes-limanowa', 'laminacja-brwi-limanowa', 'kosmetyczka-limanowa'],
    indexable: false,
    redirectTo: '/laminacja-rzes-limanowa',
  },

  'spa-stop-limanowa': {
    slug: 'spa-stop-limanowa',
    shortLabel: 'SPA stóp Limanowa',
    title: 'SPA stóp Limanowa — pielęgnacja i relaks dla stóp',
    description:
      'SPA stóp w okolicach Limanowej: BeskidStudio By Wiktoria Ćwik. Kąpiel, peeling, nawilżanie i masaż stóp. Relaks i pielęgnacja w jednym. Rezerwacja online.',
    eyebrow: 'SPA stóp Limanowa',
    h1: 'SPA stóp w Limanowej — relaks i regeneracja dla zmęczonych stóp',
    lead:
      'Zabieg SPA stóp to połączenie pielęgnacji i relaksu — kąpiel aromatyczna, peeling złuszczający, maska nawilżająca i masaż. Idealne rozwiązanie dla zmęczonych, suchych stóp po całym dniu na nogach.',
    serviceName: 'SPA stóp — pielęgnacja i masaż',
    serviceType: 'Pielęgnacja stóp',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'kąpiel, peeling, masaż i nawilżanie stóp',
      'relaks i regeneracja w jednym zabiegu',
      'rezerwacja online — gabinet 5 min od Limanowej',
    ],
    benefits: [
      'Gładka, nawilżona skóra stóp i ulga dla zmęczonych nóg.',
      'Zabieg idealny na prezent, przed wakacjami lub po intensywnym tygodniu.',
      'Spokojne warunki w kameralnym gabinecie, bez pośpiechu.',
    ],
    visitSteps: [
      'Omawiamy stan stóp i wybieramy wariant zabiegu SPA.',
      'Kąpiel, peeling, maska nawilżająca i masaż stóp w komfortowych warunkach.',
      'Po zabiegu otrzymujesz zalecenia pielęgnacyjne na dom.',
    ],
    localCopy:
      'SPA stóp to jeden z najprzyjemniejszych zabiegów pielęgnacyjnych — łączy regenerację skóry z głębokim relaksem. W BeskidStudio By Wiktoria Ćwik w Mordarce 505 oferujemy zabiegi SPA stóp dla klientek z Limanowej i całego powiatu limanowskiego. Gabinet mieści się 5 minut jazdy z centrum Limanowej.',
    faq: spaStopFaq('Limanowej'),
    related: ['podolog-limanowa', 'kosmetyczka-limanowa', 'podologia-limanowa'],
    extendedSections: [
      {
        heading: 'Na czym polega zabieg SPA stóp?',
        content:
          'SPA stóp to kompleksowy zabieg pielęgnacyjno-relaksacyjny obejmujący kilka etapów. Zaczynamy od aromatycznej kąpieli stóp, która zmiękcza skórę i przygotowuje ją do dalszej pielęgnacji. Następnie wykonujemy peeling — złuszczamy martwy naskórek, wygładzamy szorstkie miejsca i usuwamy drobne zrogowacenia.\n\nKolejny etap to maska nawilżająca — bogata w składniki odżywcze formuła, która regeneruje skórę stóp, zmiękcza pięty i przywraca komfort. Zabieg kończy masaż stóp — relaksujący, poprawiający krążenie i łagodzący napięcie po całym dniu na nogach.',
      },
      {
        heading: 'Dla kogo jest SPA stóp?',
        content:
          'SPA stóp to zabieg dla każdego, kto chce zadbać o kondycję stóp i jednocześnie się zrelaksować. Szczególnie polecamy go osobom spędzającym dużo czasu na nogach, noszącym buty na obcasie, aktywnym fizycznie oraz tym, którzy borykają się z suchą, szorstką skórą stóp.\n\nTo również doskonały pomysł na prezent — voucher na SPA stóp to oryginalny upominek na urodziny, Dzień Matki czy po prostu jako gest uwagi. Zabieg nie ma szczególnych przeciwwskazań i jest odpowiedni dla większości osób.',
      },
      {
        heading: 'SPA stóp a pedicure — czym się różnią?',
        content:
          'Pedicure koncentruje się na estetyce paznokci — obcinaniu, kształtowaniu, malowaniu. SPA stóp to zabieg nastawiony na całą skórę stóp: nawilżenie, regenerację, złuszczenie i relaks. W ramach SPA stóp nie malujemy paznokci, ale dbamy o ich kondycję i otaczającą skórę.\n\nOba zabiegi mogą się doskonale uzupełniać — SPA stóp jako regularna pielęgnacja, a pedicure jako wykończenie estetyczne. W BeskidStudio możesz połączyć oba zabiegi podczas jednej wizyty, oszczędzając czas i ciesząc się kompleksowym efektem.',
      },
      {
        heading: 'Kiedy najlepiej korzystać z SPA stóp?',
        content:
          'Sezon letni to czas, gdy stopy są szczególnie wyeksponowane — sandały, klapki i buty otwarte wymagają zadbanych stóp. SPA stóp przed wakacjami lub po sezonie plażowym to popularny wybór naszych klientek.\n\nAle SPA stóp sprawdza się przez cały rok: zimą pomaga walczyć z suchością i pękającymi piętami, jesienią regeneruje stopy po lecie, a wiosną przygotowuje je na cieplejsze miesiące. Optymalnie warto korzystać z zabiegu co 3–4 tygodnie, żeby utrzymać skórę stóp w najlepszej kondycji.',
      },
      {
        heading: 'Korzyści z regularnej pielęgnacji stóp',
        content:
          'Regularna pielęgnacja stóp to nie tylko kwestia estetyczna — to inwestycja w zdrowie i komfort codziennego funkcjonowania. Zadbane stopy to mniej odcisków, brak pękających pięt, zdrowe paznokcie i lepsze krążenie.\n\nW BeskidStudio łączymy pielęgnację stóp z wiedzą kosmetologiczną. Po zabiegu SPA stóp otrzymujesz konkretne zalecenia dotyczące pielęgnacji domowej: jaki krem stosować, jak dbać o paznokcie i kiedy wrócić na kolejny zabieg. Dzięki temu efekty utrzymują się dłużej, a stopy wyglądają i czują się znakomicie.',
      },
    ],
  },

  'podologia-limanowa': {
    slug: 'podologia-limanowa',
    shortLabel: 'Podologia Limanowa',
    title: 'Podologia Limanowa — zabiegi podologiczne i pedicure leczniczy',
    description:
      'Podologia w okolicach Limanowej: BeskidStudio By Wiktoria Ćwik. Pedicure podologiczny, usuwanie zrogowaceń, pielęgnacja problematycznych paznokci. Gabinet w Mordarce.',
    eyebrow: 'Podologia Limanowa',
    h1: 'Podologia w Limanowej — zabiegi podologiczne w BeskidStudio',
    lead:
      'Profesjonalna podologia w zasięgu Limanowej. W BeskidStudio By Wiktoria Ćwik oferujemy zabiegi podologiczne: pedicure leczniczy, usuwanie zrogowaceń i odcisków, pielęgnację problematycznych paznokci i kompleksową opiekę nad stopami.',
    serviceName: 'Zabiegi podologiczne i pedicure leczniczy',
    serviceType: 'Podologia',
    location: 'Limanowa',
    nearbyContext: limanowaContext,
    heroPoints: [
      'pedicure podologiczny i leczniczy',
      'usuwanie zrogowaceń, odcisków i modzeli',
      'rezerwacja online dla klientek z Limanowej i okolic',
    ],
    benefits: [
      'Profesjonalna diagnoza i leczenie problemów stóp zamiast domowych metod.',
      'Sterylne narzędzia i bezpieczne warunki zabiegu.',
      'Indywidualne zalecenia pielęgnacyjne po każdej wizycie.',
    ],
    visitSteps: [
      'Wywiad i ocena stanu stóp — identyfikacja problemu i planu działania.',
      'Zabieg podologiczny dobrany do konkretnej dolegliwości.',
      'Zalecenia domowe i propozycja terminu wizyty kontrolnej.',
    ],
    localCopy:
      'Podologia w BeskidStudio By Wiktoria Ćwik to profesjonalna opieka nad stopami w kameralnym gabinecie. Przyjmujemy klientki z Limanowej, Mordarki, Sowlin, Łososiny Górnej i całego powiatu limanowskiego. Gabinet w Mordarce 505 jest łatwo dostępny — 5 minut jazdy z Limanowej, z parkingiem przy budynku.',
    faq: podologiaFaq('Limanowej'),
    related: ['podolog-limanowa', 'spa-stop-limanowa', 'kosmetyczka-limanowa'],
    extendedSections: [
      {
        heading: 'Czym jest podologia?',
        content:
          'Podologia to dziedzina zajmująca się diagnostyką, leczeniem i profilaktyką schorzeń stóp. Podolog to specjalista, który pomaga rozwiązać problemy, z którymi kosmetyczny pedicure sobie nie radzi: wrastające paznokcie, bolesne zrogowacenia, modzele, grzybicę paznokci, pękające pięty i nadmierne rogowacenie.\n\nW odróżnieniu od podiatry (lekarza stóp), podolog skupia się na nieinwazyjnych metodach pielęgnacji i korekcji. To łącznik między kosmetyką a medycyną — profesjonalna pomoc dla stóp, która nie wymaga skierowania ani wizyty u lekarza.',
      },
      {
        heading: 'Jakie zabiegi podologiczne oferujemy w Limanowej?',
        content:
          'W BeskidStudio wykonujemy pełen zakres zabiegów podologicznych: pedicure leczniczy z użyciem profesjonalnych frezów, usuwanie zrogowaceń i odcisków, pielęgnację pogrubiałych i zniekształconych paznokci, pielęgnację pękających pięt oraz konsultacje stanu stóp.\n\nKażdy zabieg zaczynamy od oceny stóp i wywiadu zdrowotnego. Używamy sterylnych narzędzi jednorazowych lub sterylizowanych w autoklawie. Dobieramy metody do konkretnego problemu — nie stosujemy szablonowego podejścia.',
      },
      {
        heading: 'Najczęstsze problemy podologiczne klientek z Limanowej',
        content:
          'Wrastające paznokcie to jeden z najczęstszych powodów wizyty u podologa. Problem wynika najczęściej z nieprawidłowego obcinania paznokci lub noszenia za ciasnych butów. Zrogowacenia i odciski pojawiają się w miejscach nadmiernego nacisku — na piętach, palcach i śródstopiu.\n\nPękające pięty to problem kosmetyczny i zdrowotny jednocześnie — głębokie pęknięcia mogą boleć i stanowić wrotę infekcji. Pogrubiałe, zniekształcone paznokcie często wynikają z urazów, grzybicy lub zaburzeń krążenia. Każdy z tych problemów wymaga indywidualnej oceny i odpowiedniej interwencji podologicznej.',
      },
      {
        heading: 'Jak często korzystać z zabiegów podologicznych?',
        content:
          'Dla osób z nawracającymi problemami stóp optymalny odstęp między wizytami to 4–6 tygodni. Regularny pedicure podologiczny pozwala kontrolować zrogowacenia, monitorować stan paznokci i wychwycić ewentualne problemy na wczesnym etapie.\n\nOsoby bez aktywnych problemów mogą korzystać z zabiegów podologicznych co 6–8 tygodni w ramach profilaktyki. Szczególnie zalecamy regularne wizyty osobom z cukrzycą, chorobami naczyniowymi, seniorom oraz osobom aktywnym fizycznie.',
      },
      {
        heading: 'Podologia w Limanowej — dlaczego warto wybrać BeskidStudio?',
        content:
          'W BeskidStudio łączymy wiedzę podologiczną z komfortem kameralnego gabinetu kosmetologicznego. Każda klientka otrzymuje indywidualną uwagę — nie pracujemy w pośpiechu. Gabinet w Mordarce 505 jest łatwo dostępny z Limanowej i okolicznych miejscowości.\n\nOferujemy przejrzysty cennik, wygodną rezerwację online z aktualnym grafikiem, panel klienta z historią wizyt i zaleceniami oraz możliwość kontaktu telefonicznego i przez czat. Chcemy, żeby pielęgnacja stóp była prosta, dostępna i pozbawiona stresu.',
      },
    ],
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
        alternateName: ['BeskidStudio', 'BeskidStudio By Wiktoria Ćwik'],
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
          '@id': `${SEO.domain}/o-nas#person`,
          name: SEO.owner.name,
          jobTitle: SEO.owner.role,
          url: `${SEO.domain}/o-nas`,
          sameAs: [SEO.fbProfile, SEO.igProfile, SEO.ttProfile],
        },
        priceRange: '$$',
        areaServed: localAreas.map((name) => ({ '@type': 'Place', name })),
        knowsAbout: [
          'kosmetologia',
          'laminacja brwi',
          'laminacja rzęs',
          'pielęgnacja skóry',
          'stylizacja oprawy oka',
          'henna brwi',
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

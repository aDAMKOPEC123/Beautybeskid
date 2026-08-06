/**
 * Cała treść lejka w jednym miejscu. Strony są tylko szkieletem — copy zmienia się
 * tutaj, bez dotykania komponentów.
 *
 * `audience` odpowiada enumowi `AcademyAudience` z bazy. Kursy filtrujemy po nim
 * po stronie klienta: katalog ma kilkanaście pozycji, więc jedno pobranie
 * `/public/courses` obsługuje hub, wszystkie landingi i pełny katalog.
 */

export type PersonaKey = 'starter' | 'practitioner' | 'salon';
export type Audience = 'STARTER' | 'PRACTITIONER' | 'SALON_OWNER';

export type Persona = {
  key: PersonaKey;
  audience: Audience;
  path: string;
  /** Brama na stronie głównej — użytkowniczka wybiera siebie, nie poziom kursu. */
  gate: { label: string; sub: string; cta: string };
  /** Problem → Agitacja → Rozwiązanie. Kolejność sekcji landingu. */
  hero: { kicker: string; h1: string; lead: string; cta: string };
  problem: { title: string; bullets: string[] };
  agitation: { title: string; body: string };
  solution: { title: string; body: string; outcomes: string[] };
  objections: { q: string; a: string }[];
  close: { title: string; body: string; cta: string };
  /**
   * Lead magnet. `fileUrl: null` = pliku jeszcze nie ma. Sekcja wtedy się NIE
   * renderuje — nie zbieramy adresów pod obietnicę, której nie dowozimy.
   */
  leadMagnet: { title: string; promise: string; bullets: string[]; fileUrl: string | null };
};

export const PERSONAS: Record<PersonaKey, Persona> = {
  starter: {
    key: 'starter',
    audience: 'STARTER',
    path: '/dla-poczatkujacych',
    gate: {
      label: 'Dopiero zaczynam',
      sub: 'Uczę się albo właśnie wchodzę do branży',
      cta: 'Zbuduj fundament',
    },
    hero: {
      kicker: 'Ścieżka dla początkujących',
      h1: 'Zacznij od decyzji,\nnie od produktu.',
      lead: 'Zabieg wykonasz po kilku powtórzeniach. Trudniejsze jest coś innego: rozpoznać, kiedy go nie wykonywać. Od tego zaczynamy.',
      cta: 'Zobacz ścieżkę startową',
    },
    problem: {
      title: 'Znasz to uczucie',
      bullets: [
        'Umiesz wykonać zabieg, ale nie wiesz, czy akurat ta skóra go udźwignie.',
        'Kursy pokazują technikę i pomijają przeciwwskazania — najważniejszą część.',
        'Pierwsza klientka z problemem, którego nie było w materiałach, blokuje na tygodnie.',
      ],
    },
    agitation: {
      title: 'To nie jest kwestia wprawy',
      body: 'Najdroższy błąd w gabinecie to nie nieporadny ruch dłoni — ten poprawisz w miesiąc. To dobrze wykonany zabieg na niewłaściwej skórze. Kosztuje zaufanie klientki, czasem jej zdrowie, a odbudowa opinii trwa dużo dłużej niż nauka techniki.',
    },
    solution: {
      title: 'Uczymy w odwrotnej kolejności',
      body: 'Najpierw wywiad, przeciwwskazania i decyzja. Dopiero potem procedura. Dzięki temu od pierwszej klientki wiesz nie tylko co robić, ale też kiedy odmówić i jak to powiedzieć.',
      outcomes: [
        'Prowadzisz wywiad, który wyłapuje przeciwwskazania, zanim dotkniesz skóry.',
        'Rozpoznajesz, kiedy odesłać do lekarza — i mówisz to bez utraty klientki.',
        'Wykonujesz podstawowe procedury krok po kroku, z uzasadnieniem każdego kroku.',
        'Układasz pielęgnację domową, dzięki której efekt się utrzymuje.',
      ],
    },
    objections: [
      { q: 'Nie mam jeszcze klientek. To nie za wcześnie?', a: 'Przeciwnie — nawyki wywiadu i dokumentacji najłatwiej zbudować, zanim utrwalisz skróty. Później się je oducza.' },
      { q: 'Skończyłam szkołę. Nie powtórzę tego samego?', a: 'Szkoła daje teorię i egzamin. Tutaj pracujesz na decyzjach przy konkretnych przypadkach — tym, czego brakuje między dyplomem a pierwszym fotelem.' },
      { q: 'Ile czasu to zajmuje?', a: 'Lekcje są krótkie i domknięte tematycznie. Uczysz się we własnym tempie, dostęp nie wygasa w trakcie kursu.' },
    ],
    close: {
      title: 'Zacznij od fundamentu',
      body: 'Technikę dobudujesz. Decyzji nie da się nadrobić po fakcie.',
      cta: 'Wybierz pierwszy kurs',
    },
    leadMagnet: {
      title: 'Karta wywiadu z klientką',
      promise: 'Gotowy formularz, który przeprowadzi Cię przez wywiad tak, żeby nic nie umknęło.',
      bullets: ['Pytania w kolejności, która wyłapuje przeciwwskazania', 'Miejsce na cel zabiegowy i punkt wyjścia', 'Sekcja zaleceń domowych do wydruku'],
      fileUrl: null,
    },
  },

  practitioner: {
    key: 'practitioner',
    audience: 'PRACTITIONER',
    path: '/dla-praktykow',
    gate: {
      label: 'Pracuję w gabinecie',
      sub: 'Mam klientki i chcę robić trudniejsze rzeczy',
      cta: 'Podnieś poziom',
    },
    hero: {
      kicker: 'Ścieżka dla praktyków',
      h1: 'Przestań odsyłać\ntrudne przypadki.',
      lead: 'Podstawy masz opanowane. Sufit to nie technika — to przypadki, przy których nie masz pewności i wolisz nie ryzykować.',
      cta: 'Zobacz kursy zaawansowane',
    },
    problem: {
      title: 'Gdzie kończy się Twój zakres',
      bullets: [
        'Klientka przychodzi z problemem spoza Twojej strefy komfortu — odsyłasz.',
        'Widzisz, że coś nie działa, ale nie umiesz nazwać przyczyny.',
        'Konkurencja robi zabiegi, których nie masz w cenniku, i przejmuje klientki.',
      ],
    },
    agitation: {
      title: 'Każde odesłanie to nie tylko utracona wizyta',
      body: 'Klientka, która musiała pójść gdzie indziej z trudniejszym problemem, często już nie wraca z łatwym. Zakres usług nie jest tylko pozycją w cenniku — jest powodem, dla którego ktoś zostaje na lata albo odchodzi po jednej wizycie.',
    },
    solution: {
      title: 'Rozszerzamy zakres, nie listę certyfikatów',
      body: 'Pracujemy na przypadkach, przy których zwykle się waha: skóra reaktywna, powikłania, obszary pomijane przez większość gabinetów. Do każdego procedura, granice bezpieczeństwa i plan na to, co pójdzie nie tak.',
      outcomes: [
        'Diagnozujesz przyczynę, zamiast leczyć objaw kolejnym zabiegiem.',
        'Prowadzisz przypadki, które dziś odsyłasz — świadomie i bezpiecznie.',
        'Znasz granicę własnych kompetencji i potrafisz ją obronić przy kliencie.',
        'Wchodzisz w podologię: obszar, który większość gabinetów omija, bo wymaga wiedzy, nie sprzętu.',
      ],
    },
    objections: [
      { q: 'Mam już kilka kursów za sobą.', a: 'Ten nie uczy kolejnej techniki. Uczy decydowania w sytuacjach, w których dwie techniki są poprawne, a tylko jedna właściwa dla tej skóry.' },
      { q: 'Nie mam czasu między klientkami.', a: 'Lekcje są krótkie i domknięte. Jedna przerwa między wizytami to jeden temat zamknięty.' },
      { q: 'Skąd mam wiedzieć, czy poziom mi odpowiada?', a: 'Każdy kurs ma bezpłatny fragment. Obejrzysz go przed zakupem i ocenisz sama.' },
    ],
    close: {
      title: 'Podnieś sufit swojego gabinetu',
      body: 'Nie kolejny certyfikat na ścianę. Przypadki, których dziś nie przyjmujesz.',
      cta: 'Zobacz kursy dla praktyków',
    },
    leadMagnet: {
      title: 'Mapa przeciwwskazań',
      promise: 'Zestawienie: kiedy zabieg, kiedy modyfikacja, kiedy stop i skierowanie.',
      bullets: ['Podzielone wg typów zabiegów', 'Sygnały alarmowe wymagające konsultacji lekarskiej', 'Gotowe zdania, którymi tłumaczysz odmowę klientce'],
      fileUrl: null,
    },
  },

  salon: {
    key: 'salon',
    audience: 'SALON_OWNER',
    path: '/dla-salonow',
    gate: {
      label: 'Prowadzę salon',
      sub: 'Odpowiadam za zespół, klientki i wynik',
      cta: 'Rozwiń biznes',
    },
    hero: {
      kicker: 'Ścieżka dla właścicielek',
      h1: 'Twój salon nie może zależeć\nwyłącznie od Twoich rąk.',
      lead: 'Dopóki wszystko przechodzi przez Ciebie, sufit przychodu wyznacza liczba godzin, które jesteś w stanie przepracować.',
      cta: 'Zapisz się na listę',
    },
    problem: {
      title: 'Sufit, o który się obijasz',
      bullets: [
        'Grafik pełny, a wynik stoi w miejscu — bo doba się nie rozciąga.',
        'Zespół pracuje inaczej niż Ty i każda reklamacja wraca na Twoje biurko.',
        'Marketing to publikowanie zdjęć „przed i po” z nadzieją, że coś z tego będzie.',
      ],
    },
    agitation: {
      title: 'Salon bez procedur to Ty na etacie u siebie',
      body: 'Kiedy standard siedzi tylko w Twojej głowie, nie da się go przekazać ani wyegzekwować. Każda nowa osoba w zespole zaczyna od zera, a Ty zostajesz jedynym punktem kontroli jakości — i wąskim gardłem całego biznesu.',
    },
    solution: {
      title: 'Standard, zespół, komunikacja',
      body: 'Program dla właścicielek buduje to, czego nie da się kupić ze sprzętem: powtarzalną jakość niezależną od osoby przy fotelu i komunikację, która przyciąga właściwe klientki, nie przypadkowe.',
      outcomes: [
        'Spisany standard zabiegu, który da się przekazać nowej osobie.',
        'Wdrożenie i ocena pracy zespołu na konkretnych kryteriach, nie na wyczucie.',
        'Komunikacja gabinetu oparta na kompetencji zamiast na promocjach.',
        'Ceny liczone od kosztu i czasu, nie od cennika konkurencji zza rogu.',
        'Ścieżka klientki od pierwszej wizyty do planu na cały rok.',
        'Wskaźniki, które faktycznie mówią, co dzieje się w salonie.',
      ],
    },
    objections: [
      { q: 'Nie mam czasu na kolejne szkolenie.', a: 'Dlatego program jest ułożony w moduły wdrożeniowe: każdy kończy się jednym dokumentem, który od razu trafia do salonu.' },
      { q: 'Mam mały zespół, to chyba nie dla mnie.', a: 'Przy dwóch osobach brak standardu boli mocniej niż przy dziesięciu — nie ma kim zastąpić kogoś, kto robi po swojemu.' },
      { q: 'Kiedy startujecie?', a: 'Program jest w przygotowaniu. Zapisani decydują o kolejności tematów i wchodzą pierwsi, w cenie przedpremierowej.' },
    ],
    close: {
      title: 'Zbuduj salon, który działa bez Ciebie',
      body: 'Program powstaje teraz. Zapisz się, żeby mieć wpływ na jego zakres.',
      cta: 'Zapisz się na listę',
    },
    leadMagnet: {
      title: 'Szablon standardu zabiegu',
      promise: 'Dokument, na podstawie którego nowa osoba wykona zabieg tak jak Ty.',
      bullets: ['Struktura krok po kroku do wypełnienia', 'Kryteria oceny jakości wykonania', 'Lista kontrolna przed wypuszczeniem osoby do klientek'],
      fileUrl: null,
    },
  },
};

export const PERSONA_LIST = [PERSONAS.starter, PERSONAS.practitioner, PERSONAS.salon];

export const personaByPath = (path: string) => PERSONA_LIST.find((persona) => persona.path === path) ?? null;

/** Kurs bez person nie trafia na żaden landing — świadomie, żeby nic nie wyciekło do złej grupy. */
export const coursesForAudience = <T extends { audiences?: string[] }>(courses: T[], audience: Audience) =>
  courses.filter((course) => (course.audiences ?? []).includes(audience));

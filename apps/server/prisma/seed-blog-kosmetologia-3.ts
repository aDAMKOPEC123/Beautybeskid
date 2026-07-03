import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── TipTap helpers ────────────────────────────────────────────────────────────

const h2 = (text: string) => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
});

const h3 = (text: string) => ({
  type: 'heading',
  attrs: { level: 3 },
  content: [{ type: 'text', text }],
});

const p = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const pb = (...parts: Array<{ t: string; b?: boolean }>) => ({
  type: 'paragraph',
  content: parts.map(({ t, b }) => ({
    type: 'text',
    text: t,
    ...(b ? { marks: [{ type: 'bold' }] } : {}),
  })),
});

const ul = (...items: string[]) => ({
  type: 'bulletList',
  content: items.map((item) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
  })),
});

const ol = (...items: string[]) => ({
  type: 'orderedList',
  content: items.map((item) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
  })),
});

const quote = (text: string) => ({
  type: 'blockquote',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const img = (description: string) => ({
  type: 'paragraph',
  content: [
    {
      type: 'text',
      text: `[ TUTAJ MA BYĆ ZDJĘCIE: ${description} ]`,
      marks: [{ type: 'italic' }],
    },
  ],
});

const doc = (...content: object[]) =>
  JSON.stringify({ type: 'doc', content });

// ─────────────────────────────────────────────────────────────────────────────

const articles = [

  // ── 21. LAMINACJA BRWI I RZĘS ────────────────────────────────────────────
  {
    slug: 'laminacja-brwi-rzes-lash-lift-limanowa',
    category: 'Brwi i rzęsy',
    title: 'Laminacja brwi i rzęs — jak działa, ile trwa efekt i dla kogo to zabieg?',
    metaTitle: 'Laminacja brwi i rzęs Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Lash lift, brow lifting',
    metaDescription:
      'Laminacja brwi i rzęs w Limanowej — efekt uniesionych, wyraźnych rzęs i idealnie ułożonych brwi bez codziennego makijażu. Salon BeskidStudio By Wiktoria Ćwik przyjmuje klientki z powiatu limanowskiego.',
    excerpt:
      'Budzisz się rano i Twoje rzęsy już wyglądają jak po tuszy, a brwi jak po precyzyjnym uczesaniu. Laminacja brwi i rzęs to jeden z tych zabiegów, które zmieniają poranną rutynę na zawsze.',
    readingTime: 5,
    tags: ['laminacja brwi', 'laminacja rzęs', 'lash lift', 'brow lamination', 'brwi limanowa', 'rzęsy limanowa'],
    content: doc(
      p(
        'Laminacja brwi i rzęs to zabiegi, które w ciągu ostatnich kilku lat z kosmetycznej ciekawostki stały się absolutnym standardem w najlepszych gabinetach. Dlaczego? Bo dają coś bardzo konkretnego: wyraźniejsze rzęsy i ułożone brwi — bez codziennego nakładania tuszy, bez żelów do brwi, bez kombinowania przy lustrze.',
      ),
      img('Zbliżenie na oczy kobiety po laminacji — uniesione, rozdzielone rzęsy i gładko ułożone brwi; widoczna różnica między lewym i prawym okiem w trakcie zabiegu'),

      h2('Czym właściwie jest laminacja rzęs (lash lift)?'),
      pb(
        { t: 'Lash lift to trwałe unoszenie rzęs od nasady. Specjalna ' },
        { t: 'szylkretka (silikonowa poduszeczka)', b: true },
        { t: ' przyklejona do powieki unosi rzęsy, a następnie nakładana jest odżywka rekonstruująca strukturę włosa. Efekt: rzęsy są uniesione, pogrubione wizualnie i odgięte łukiem — bez użycia eyelash curler i bez doklejanych rzęs.' },
      ),
      quote('Lash lift to jakbyś zawsze miała podkręcone rzęsy, ale za to że nie musisz nic robić — wychodzisz z gabinetu i po prostu tak wyglądasz.'),

      h2('Laminacja brwi — co ją wyróżnia?'),
      p(
        'Brwi laminuje się inaczej niż rzęsy. Tutaj celem nie jest uniesienie, ale ułożenie — i utrwalenie tego ułożenia. Włoski zostają "rozczesane" do góry lub w bok, odżywione i utrwalone w wybranym kierunku. Efekt to nowoczesne, gęste brwi w stylu "brushed up", które wyglądają jak po stylizacji żelem — tylko że przez 6–8 tygodni, bez żadnego produktu.',
      ),
      img('Twarz kobiety po laminacji brwi — wyraźnie gęste, uniesione brwi w stylu brushed up; delikatny makijaż, naturalne światło'),

      h2('Jak wygląda zabieg krok po kroku?'),
      h3('Laminacja rzęs'),
      ol(
        'Oczyszczenie i odtłuszczenie rzęs',
        'Dobór szylkretki do kształtu oka i długości rzęs',
        'Naklejenie szylkretki na powiekę, uniesienie rzęs i przyklejenie ich do szylkretki',
        'Nałożenie odżywki nr 1 (rozmiękczanie struktury włosa) — ok. 8–12 minut',
        'Nałożenie odżywki nr 2 (utrwalanie nowej formy) — ok. 8–12 minut',
        'Opcjonalnie: nałożenie tyntu lub keratin booster do rzęs',
        'Zdjęcie szylkretki, delikatne rozczesanie rzęs',
      ),
      h3('Laminacja brwi'),
      ol(
        'Oczyszczenie i rozczesanie brwi',
        'Ustalenie kierunku układania włosków',
        'Nałożenie preparatu rozmiękczającego — ok. 10 minut',
        'Nałożenie preparatu utrwalającego — ok. 10 minut',
        'Opcjonalnie: henna lub tint do zabarwienia brwi',
        'Regulacja kształtu (woskowanie lub pęseta) i utrwalenie efektu',
      ),
      quote('Czas zabiegu to ok. 45–60 minut dla samych rzęs lub brwi, ok. 90 minut jeśli robimy oba razem. Większość klientek zasypia — to zupełnie normalny zabieg.'),

      h2('Ile trwa efekt i jak dbać po zabiegu?'),
      ul(
        'Lash lift: efekt utrzymuje się 6–10 tygodni (rzęsy rosną i opadają naturalnie)',
        'Laminacja brwi: 5–7 tygodni, zależnie od tempa wzrostu włosków',
        'Przez 24–48h po zabiegu: unikać mokrych okolic oczu, sauny i basenu',
        'Nie trzeć oczu, nie nakładać tłustych kremów w okolice rzęs przez pierwszą dobę',
        'Po tym czasie — normalny makijaż, tusz, zmywanie — bez żadnych ograniczeń',
      ),

      h2('Dla kogo laminacja, a dla kogo raczej nie?'),
      pb(
        { t: 'Zabieg jest ' },
        { t: 'idealny dla osób z prostymi, opadającymi rzęsami', b: true },
        { t: ', rzadkimi lub nieuporządkowanymi brwiami, oraz dla tych, które chcą skrócić poranną rutynę. ' },
        { t: 'Nie wykonuje się laminacji', b: true },
        { t: ' przy aktywnych infekcjach oka, zapaleniu spojówek, w ciąży (ostrożność), przy bardzo zniszczonych rzęsach wymagających przerwy oraz przy alergii na składniki preparatów (test płatkowy na 24h).' },
      ),

      h2('Laminacja rzęs vs. przedłużanie rzęs — co wybrać?'),
      pb(
        { t: 'Lash lift to ' },
        { t: 'praca na własnych rzęsach', b: true },
        { t: '. Przedłużanie dokłada włoski z zewnątrz. Laminacja jest szybsza, tańsza w utrzymaniu, nie wymaga uzupełnień co 2–3 tygodnie i nie osłabia własnych rzęs (przy prawidłowym wykonaniu). Przedłużanie daje bardziej dramatyczny efekt — ale wymaga regularnej konserwacji.' },
      ),

      h2('Laminacja w salonie BeskidStudio By Wiktoria Ćwik w Limanowej'),
      p(
        'Wykonujemy laminację rzęs i brwi, możesz umówić oba zabiegi w jednej wizycie. Przyjmujemy klientki z Limanowej, Dobrej, Laskowej, Mszany Dolnej i całego powiatu. Rezerwacja online — bez kolejek, z punktualną obsługą.',
      ),
    ),
  },

  // ── 22. REGULACJA BRWI ───────────────────────────────────────────────────
  {
    slug: 'regulacja-brwi-modelowanie-ksztalt-limanowa',
    category: 'Brwi i rzęsy',
    title: 'Regulacja brwi — jak znaleźć idealny kształt i dlaczego warto oddać to specjaliście?',
    metaTitle: 'Regulacja brwi Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Modelowanie brwi, woskowanie, pęseta',
    metaDescription:
      'Profesjonalna regulacja i modelowanie brwi w Limanowej. Salon BeskidStudio By Wiktoria Ćwik dobiera kształt do rysów twarzy. Woskowanie, pęseta, nici. Klientki z Mordarki, Laskowej, Nowego Sącza i okolic.',
    excerpt:
      'Brwi to jedyna część twarzy, którą możesz celowo zmieniać i kształtować. Jeden milimetr w złą stronę — i twarz wygląda zupełnie inaczej. Oto wszystko, co musisz wiedzieć o regulacji brwi.',
    readingTime: 4,
    tags: ['regulacja brwi', 'modelowanie brwi', 'woskowanie brwi', 'kształt brwi', 'brwi limanowa'],
    content: doc(
      p(
        'Brwi ramują twarz bardziej, niż większość osób zdaje sobie sprawę. Odpowiedni kształt podnosi spojrzenie, dodaje energii, a nawet sprawia, że twarz wydaje się szczuplejsza. Złe wyskubanie — i przez kilka tygodni trudno to naprawić. Dlatego regulacja brwi to jeden z tych zabiegów, gdzie naprawdę warto zaufać specjaliście.',
      ),
      img('Kosmetolog mierzący symetrię brwi klientki kredką kartograficzną — widoczny punkt w kąciku oka, łuku brwi i początku brwi'),

      h2('Jak dobieramy kształt brwi do twarzy?'),
      p(
        'Nie istnieje jeden idealny kształt brwi dla każdej. To, co działa na twarz owalną, może zupełnie nie pasować do kwadratowej lub sercowej. W dobrym gabinecie przed każdą regulacją wykonuje się pomiar — trzy punkty, które definiują optymalną szerokość i łuk:',
      ),
      ol(
        'Początek brwi — linia pionowa od wewnętrznego kącika oka',
        'Najwyższy punkt łuku — linia biegnąca przez środek tęczówki (lub nieco na zewnątrz)',
        'Koniec brwi — linia od skrzydełka nosa przez zewnętrzny kącik oka',
      ),
      quote('Brwi nie muszą być bliźniaczkami — mają być siostrami. Idealna symetria na twarzy po prostu nie istnieje i nie powinna.'),

      h2('Metody regulacji — którą wybrać?'),
      h3('Woskowanie'),
      pb(
        { t: 'Najszybsza i najdokładniejsza metoda. Wosk ciepły lub zimny usuwa włoski od nasady — efekt utrzymuje się ' },
        { t: '3–4 tygodnie', b: true },
        { t: '. Idealne dla osób z wyraźnym owłosieniem wokół brwi i jasno zarysowanym kształtem do zachowania.' },
      ),
      h3('Pęseta (tweezers)'),
      p(
        'Precyzyjna praca włosek po włosku. Trwa dłużej, ale daje największą kontrolę — idealna dla osób z delikatnym owłosieniem, subtelnych korekcji i przy pracy w trudnych miejscach (blisko oka, pod łukiem).',
      ),
      h3('Nici (threading)'),
      p(
        'Technika ze Wschodu — nić bawełniana skręcona i przesuwana chwyta kilka włosków jednocześnie. Bardzo precyzyjna, usuwa całe rzędy włosków naraz. Popularna w salonach orientalnych, sprawdzona przy gęstych brwiach i rzęsach.',
      ),
      img('Zbliżenie na zabieg regulacji brwi — specjalistka pracuje pęsetą przy łuku brwi; widoczna precyzja i symetria efektu końcowego'),

      h2('Jak często regulować brwi?'),
      pb(
        { t: 'To zależy od tempa wzrostu włosków — ale średnio ' },
        { t: 'co 3–4 tygodnie', b: true },
        { t: '. Jeśli robisz regulację po raz pierwszy lub odrastasz po zbyt mocnym skubaniu — specjalista może zaproponować plan regeneracji: kilka wizyt z minimalną korekcją, pozwalając brwiom odrosnąć do pełnej gęstości.' },
      ),
      quote('Najczęstszy błąd? Samodzielne "poprawianie" w domu między wizytami. Jedno nieudane pociągnięcie pęsety może wymusić asymetrię, której nie da się szybko ukryć.'),

      h2('Regulacja a makijaż permanentny — razem czy osobno?'),
      p(
        'Regulacja i makijaż permanentny (ombre, microblading) świetnie się uzupełniają — kształt ustalamy regulacją, kolor i wypełnienie daje pigment. Ważne: regulację wykonujemy zawsze przed zabiegiem permanentnym, nie po. Po zabiegu pigmentacyjnym unikamy woskowania przez co najmniej 4 tygodnie.',
      ),

      h2('Brwi po zbyt agresywnym skubaniu — czy da się odrosnąć?'),
      ul(
        'Tak — jeśli mieszkek włosowy nie jest trwale uszkodzony',
        'Odrastanie pełnych brwi trwa 6–12 miesięcy — wymaga cierpliwości',
        'Serum do brwi (z peptydami i biotyną) może przyspieszyć wzrost i zagęścić włoski',
        'Przez czas odrastania kształt można maskować henna, cieniem do brwi lub makijażem permanentnym',
      ),

      h2('Regulacja brwi w salonie BeskidStudio By Wiktoria Ćwik w Limanowej'),
      p(
        'Modelujemy brwi woskiem lub pęsetą, dobieramy kształt do rysów twarzy. Możesz łączyć regulację z henna, laminacją lub makijażem permanentnym w jednej wizycie. Przyjmujemy klientki z Limanowej, Mordarki, Laskowej i Nowego Sącza. Rezerwacja online.',
      ),
    ),
  },

  // ── 23. KOREAŃSKA LAMINACJA BRWI ─────────────────────────────────────────
  {
    slug: 'koreanska-laminacja-brwi-roznica-limanowa',
    category: 'Brwi i rzęsy',
    title: 'Koreańska laminacja brwi — czym różni się od zwykłej i dlaczego cały świat o niej mówi?',
    metaTitle: 'Koreańska laminacja brwi Limanowa — Salon BeskidStudio By Wiktoria Ćwik | K-beauty brow lamination',
    metaDescription:
      'Koreańska laminacja brwi w Limanowej — co wyróżnia ją spośród zwykłej laminacji? Salon BeskidStudio By Wiktoria Ćwik wyjaśnia różnice i wykonuje zabieg dla klientek z powiatu limanowskiego.',
    excerpt:
      'Zwykła laminacja brwi jest świetna. Koreańska wersja jest inna — i nie chodzi tylko o kraj pochodzenia. To inny protokół, inna filozofia efektu i inaczej przygotowana skóra. Sprawdzamy, co naprawdę różni te dwa zabiegi.',
    readingTime: 5,
    tags: ['koreańska laminacja brwi', 'brow lamination', 'K-beauty', 'brushed up brows', 'brwi limanowa', 'pielęgnacja brwi'],
    content: doc(
      p(
        'K-beauty — koreańska kultura pielęgnacji — zmieniła podejście do kosmetologii na całym świecie. Wieloetapowe rytuały, pielęgnacja skóry pod brwiami, obsesja na punkcie nawilżenia i "efekt skóry jak szkło" to tylko kilka przykładów. Kiedy Korea Południowa wzięła się za laminację brwi, wyszedł z tego zabieg, który wygląda podobnie jak europejski odpowiednik — ale pod spodem to zupełnie inna historia.',
      ),
      img('Zbliżenie na brwi kobiety po koreańskiej laminacji — gęste, lśniące, uniesione włoski z wyraźnym, zdrowym połyskiem; widoczna odżywiona skóra pod brwiami'),

      h2('Co wspólnego ma zwykła i koreańska laminacja brwi?'),
      ul(
        'Obie wykorzystują preparaty do trwałej zmiany struktury włosa',
        'Obie układają włoski w kierunku "brushed up" (do góry i na zewnątrz)',
        'Obie dają efekt gęstszych, wyraźniejszych brwi bez codziennej stylizacji',
        'Czas trwania efektu jest porównywalny: 5–8 tygodni',
      ),
      quote('Zwykła laminacja zmienia kierunek włosków. Koreańska zmienia kierunek włosków — i jednocześnie intensywnie pielęgnuje ich strukturę oraz skórę pod nimi.'),

      h2('Kluczowe różnice — protokół koreański'),
      h3('1. Wieloetapowa pielęgnacja skóry pod brwiami'),
      pb(
        { t: 'W protokole koreańskim skóra pod brwiami dostaje ' },
        { t: 'serum nawilżające, ampułkę odżywczą lub maskę', b: true },
        { t: ' jako część zabiegu — nie tylko jako opcja. W zwykłej laminacji fokus jest na włosku. W koreańskiej — na włosku i skórze razem.' },
      ),
      h3('2. Preparaty bogatsze w składniki pielęgnacyjne'),
      p(
        'Koreańskie preparaty do laminacji często zawierają ceramidy, aminokwasy, keratynę i ekstrakty roślinne, które podczas zabiegu wbudowują się w strukturę włosa. Efekt: włoski po koreańskiej laminacji mają intensywny połysk i są miękkie w dotyku — nie suche ani sztywne jak po agresywnym ondulowaniu.',
      ),
      h3('3. Nawilżenie jako priorytet'),
      pb(
        { t: 'Standardowa laminacja może lekko przesuszyć włoski przy długim czasie ekspozycji lub złym doborze preparatu. Protokół koreański ma wbudowany krok rewitalizacji — ' },
        { t: 'odżywka keratin booster lub maska są obowiązkowe', b: true },
        { t: ', nie opcjonalne.' },
      ),
      h3('4. Efekt "wet look" vs. "natural lift"'),
      p(
        'Koreańska laminacja często daje efekt lekko glossy — włoski wyglądają jakby były świeżo ułożone serum do brwi i lekko wilgotne (naturalny połysk). Europejska wersja zazwyczaj daje bardziej matowy, naturalny efekt uniesienia.',
      ),
      img('Porównanie brwi: po lewej zwykła laminacja — naturalne uniesienie, po prawej koreańska laminacja — intensywniejszy połysk, bardziej zdefiniowane włoski'),

      h2('Która jest lepsza?'),
      pb(
        { t: 'To zależy od efektu, którego szukasz. Jeśli chcesz ' },
        { t: 'intensywnie odżywionych, lśniących brwi z połyskiem', b: true },
        { t: ' i masz włoski, które są suche lub słabe — koreańska laminacja daje lepsze rezultaty długoterminowe. Jeśli chcesz ' },
        { t: 'naturalnego uniesienia bez efektu "mokrych" brwi', b: true },
        { t: ' — europejska wersja może być bardziej odpowiednia.' },
      ),

      h2('Dla kogo koreańska laminacja brwi jest idealna?'),
      ul(
        'Osoby z suchymi, łamliwymi lub słabymi włoskami brwiowymi',
        'Te, które po poprzednich laminacjach miały efekt "szorstkich" brwi',
        'Wszystkie, które chcą intensywnej pielęgnacji połączonej z efektem stylizacji',
        'Osoby z rzadkimi brwiami — odżywienie stymuluje wzrost i poprawia gęstość',
        'Miłośniczki K-beauty i wieloetapowej pielęgnacji',
      ),
      quote('Myślę o koreańskiej laminacji jak o maseczce nawilżającej dla brwi — z efektem stylizacji w gratisie.'),

      h2('Jak wybrać salon i co zapytać przed zabiegiem?'),
      ol(
        'Zapytaj jakiej marki preparatów używa salon i co zawierają',
        'Sprawdź czy protokół obejmuje krok odżywiania / keratin booster',
        'Poproś o portfolio efektów — szczególnie zdjęcia "po" przy naturalnym świetle',
        'Zapytaj o test alergiczny — szczególnie jeśli masz wrażliwą skórę',
        'Dowiedz się, czy zabieg obejmuje regulację kształtu brwi i henna/tint',
      ),

      h2('Koreańska laminacja brwi w salonie BeskidStudio By Wiktoria Ćwik w Limanowej'),
      p(
        'Wykonujemy laminację brwi w protokole wzbogaconym o etap intensywnej odżywki i keratyny. Efekt: błyszczące, ułożone brwi z realnie odżywionymi włoskami. Przyjmujemy klientki z Limanowej, Nowego Sącza, Mszany Dolnej i okolic. Zarezerwuj online.',
      ),
    ),
  },

  // ── 24. PEDICURE ─────────────────────────────────────────────────────────
  {
    slug: 'pedicure-rodzaje-efekty-pielegnacja-stop-limanowa',
    category: 'Zabiegi na stopy',
    title: 'Pedicure — rodzaje, efekty i dlaczego warto dbać o stopy przez cały rok',
    metaTitle: 'Pedicure Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Pedicure klasyczny, SPA, hybrydowy',
    metaDescription:
      'Pedicure w Limanowej — klasyczny, SPA i hybrydowy. Salon BeskidStudio By Wiktoria Ćwik kompleksowo pielęgnuje stopy dla klientek z Mordarki, Dobrej, Laskowej i całego powiatu limanowskiego.',
    excerpt:
      'Stopy pracują ciężej niż jakikolwiek inny fragment ciała — i są najczęściej zaniedbywane. Regularny pedicure to nie tylko kwestia estetyki. To zdrowie paznokci, skóry i komfort każdego kroku.',
    readingTime: 5,
    tags: ['pedicure', 'pedicure limanowa', 'pedicure hybrydowy', 'pielęgnacja stóp', 'pedicure SPA'],
    content: doc(
      p(
        'Latem eksponujemy stopy w sandałach i chcemy, żeby wyglądały. Zimą chowamy je w butach i zapominamy o pielęgnacji. A stopy potrzebują uwagi przez cały rok — bo skóra na stopach nie regeneruje się sama tak sprawnie jak na twarzy, a zaniedbane zmiany (modzele, wrastające paznokcie, suchość) mogą zamienić się w poważny dyskomfort.',
      ),
      img('Stopy kobiety podczas zabiegu pedicure SPA — nogi zanurzone w musującej wannce z solami i płatkami kwiatów, ciepłe oświetlenie gabinetu'),

      h2('Rodzaje pedicure — który jest dla Ciebie?'),
      h3('Pedicure klasyczny'),
      pb(
        { t: 'Podstawa każdej pielęgnacji. Obejmuje ' },
        { t: 'moczenie, opracowanie skóry (pilnik, frez lub pumeks), opracowanie paznokci (kształt, skórki), masaż stóp i malowanie lakierem', b: true },
        { t: '. Trwa ok. 60–75 minut. Idealne jako regularna pielęgnacja co 4–6 tygodni.' },
      ),
      h3('Pedicure SPA'),
      p(
        'Rozszerzony rytuał pielęgnacyjny — klasyczny pedicure wzbogacony o peeling cukrowy lub solny, maskę nawilżającą lub rozgrzewającą na stopy, dłuższy masaż, czasem parafina. Efekt: intensywnie nawilżona, miękka skóra. Polecane szczególnie po sezonie letnim i zimowym.',
      ),
      h3('Pedicure hybrydowy'),
      pb(
        { t: 'Klasyczny pedicure zakończony lakierem hybrydowym zamiast zwykłego. Efekt: ' },
        { t: 'kolor utrzymuje się 3–5 tygodni', b: true },
        { t: ' bez odpryskiwania — nawet przy codziennym noszeniu obuwia, basenie i aktywności fizycznej. Najpopularniejszy wybór wśród klientek, które chcą trwałego efektu koloryzacji.' },
      ),
      h3('Pedicure medyczny / podologiczny'),
      p(
        'Zabieg wykonywany przez podologa przy problemach zdrowotnych stóp — wrastające paznokcie, modzele, odciski, nadmierne rogowacenie. Różni się od klasycznego pedicure narzędziami, techniką i zakresem. Więcej o tym w artykule o podologii.',
      ),
      img('Kosmetolog opracowujący skóry i paznokcie podczas pedicure klasycznego — widoczne narzędzia, czyste, zadbane stopy'),

      h2('Co opracowuje się podczas pedicure?'),
      ul(
        'Paznokcie — kształtowanie, skrócenie, opracowanie wałów bocznych i skórek',
        'Naskórek na piętach i śródstopiu — pilnik, frez lub pumeks',
        'Obszary rogowaceń (pięty, boczne krawędzie stóp) — mechaniczne opracowanie lub kwasy',
        'Masaż stóp i łydek — poprawia krążenie, rozluźnia napięcia',
        'Malowanie lakierem (lub hybryda) — estetyczne wykończenie',
      ),
      quote('Najczęstszy błąd przy domowej pielęgnacji stóp: obcinanie skórek nożyczkami. To proszenie się o stan zapalny i wrastające paznokcie. Skórki tylko odpychamy i nawilżamy.'),

      h2('Jak często robić pedicure?'),
      pb(
        { t: 'Standardowo ' },
        { t: 'co 4–6 tygodni', b: true },
        { t: '. Osoby z tendencją do nadmiernego rogowacenia, wrastających paznokci lub cukrzycą powinny robić pedicure ' },
        { t: 'częściej — co 3–4 tygodnie', b: true },
        { t: ' i koniecznie korzystać z pomocy podologa przy problemach zdrowotnych.' },
      ),

      h2('Pielęgnacja stóp między wizytami — 4 zasady'),
      ol(
        'Nawilżanie codziennie — krem do stóp z mocznikiem (min. 10–20%) na pięty, lekki krem na śródstopie',
        'Pilnik zamiast pumeksu — pumeks mechanicznie ściera skórę z wodą (po pedicure ok.), w domu lepiej pilnik ceramiczny na suchą skórę',
        'Skarpetki nawilżające 1x tydzień — bawełniane skarpety + krem + folia = intensywna maska na stopy',
        'Odpowiednie obuwie — buty za ciasne to główna przyczyna modzeli, wrastających paznokci i odcisków',
      ),

      h2('Pedicure SPA i hybrydowy w salonie BeskidStudio By Wiktoria Ćwik w Limanowej'),
      p(
        'Oferujemy pedicure klasyczny, SPA i hybrydowy. Przy każdym zabiegu dbamy o pełne opracowanie skóry i paznokci. Przyjmujemy klientki z Limanowej, Mordarki, Dobrej, Jodłownika i okolic powiatu limanowskiego. Rezerwacja online.',
      ),
    ),
  },

  // ── 25. PODOLOGIA ────────────────────────────────────────────────────────
  {
    slug: 'podolog-problemy-ze-stopami-kiedy-isc-limanowa',
    category: 'Zabiegi na stopy',
    title: 'Podolog — czym się zajmuje i kiedy wizyta jest koniecznością, a nie luksusem?',
    metaTitle: 'Podolog Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Wrastające paznokcie, modzele, odciski',
    metaDescription:
      'Podolog w Limanowej — wrastające paznokcie, modzele, odciski, pękające pięty. Gabinet BeskidStudio By Wiktoria Ćwik oferuje pedicure podologiczny dla klientek z Nowego Sącza, Mszany Dolnej i powiatu limanowskiego.',
    excerpt:
      'Większość problemów ze stopami ignorujemy, dopóki nie zaczną naprawdę boleć. Podolog to specjalista, który zajmuje się właśnie tym — i wiele schorzeń można rozwiązać szybciej, niż myślisz.',
    readingTime: 6,
    tags: ['podolog', 'podologia', 'wrastający paznokieć', 'modzele', 'odciski', 'pielęgnacja stóp', 'limanowa'],
    content: doc(
      p(
        'Stopa człowieka to konstrukt złożony z 26 kości, 33 stawów i ponad 100 mięśni i więzadeł. W ciągu życia przeciętna osoba pokonuje ok. 150 000 kilometrów — to prawie cztery razy dookoła Ziemi. I przez większość tego czasu stopy są zaciśnięte w butach, obciążone nadwagą, zbyt długo na twardych podłożach. Że cokolwiek boli — to nie dziwi.',
      ),
      img('Specjalista podolog przy pracy — zbliżenie na opracowywanie wrastającego paznokcia frezerką medyczną; sterylne narzędzia, profesjonalne oświetlenie gabinetu'),

      h2('Czym zajmuje się podolog?'),
      pb(
        { t: 'Podologia to specjalizacja zajmująca się ' },
        { t: 'diagnostyką, leczeniem i pielęgnacją stóp', b: true },
        { t: '. Podolog nie jest lekarzem — ale ma specjalistyczną wiedzę i narzędzia, których nie posiada kosmetyczka wykonująca zwykły pedicure. To ważne rozróżnienie: pedicure jest zabiegiem kosmetycznym, pedicure podologiczny — terapeutycznym.' },
      ),
      quote('Podolog zajmuje się tym, z czym gabinet kosmetyczny sobie nie poradzi: wrastającymi paznokciami, modzelem, brodawkami planarnymi i stopą cukrzycową.'),

      h2('Schorzenia, którymi zajmuje się podolog'),
      h3('Wrastający paznokieć (onychocryptosis)'),
      pb(
        { t: 'Jeden z najczęstszych powodów wizyty u podologa. Paznokieć wrastający w boczny wał powoduje stan zapalny, ból i w zaawansowanych przypadkach — infekcję. ' },
        { t: 'Podolog oczyszcza wał, opracowuje paznokieć i zakłada klamrę korekcyjną', b: true },
        { t: ', która stopniowo prostuje kierunek wzrostu. Bez interwencji problem narasta.' },
      ),
      h3('Modzele i odciski'),
      p(
        'Modzel to miejscowe zgrubienie naskórka — reakcja ochronna na długotrwały ucisk lub tarcie. Odcisk (clavus) ma twardy środek, który uciska nerwy i boli przy chodzeniu. Podolog mechanicznie opracowuje zmiany frezerką, usuwa jądro odcisku i dobiera wkładki lub plastry odciążające, które eliminują przyczynę.',
      ),
      h3('Grzybica paznokci i stóp'),
      pb(
        { t: 'Żółknące, kruche, grubiejące paznokcie — to klasyczne objawy grzybicy. Podolog wykonuje ' },
        { t: 'diagnostykę wstępną i mechaniczne opracowanie', b: true },
        { t: ' zmienionego paznokcia (co ułatwia wnikanie leków przeciwgrzybiczych) oraz dobiera pielęgnację. Leczenie farmakologiczne wymaga konsultacji z dermatologiem lub lekarzem pierwszego kontaktu.' },
      ),
      h3('Brodawki stóp (verruca plantaris)'),
      p(
        'Wirusowe zmiany wywołane przez HPV — wyglądają jak twardy zrogowacony obszar, często mylony z odciskiem. Różnią się: odcisk boli przy ucisku pionowym, brodawka — przy bocznym ściśnięciu. Podolog opracowuje zmianę i dobiera leczenie (kwasy, mrożenie, plastry farmaceutyczne).',
      ),
      h3('Pęknięte pięty'),
      pb(
        { t: 'Głębokie, bolesne pęknięcia pięt to nie tylko problem estetyczny. Przy głębokich szczelinach (stopień 3–4) ' },
        { t: 'grozi infekcja i trudno gojące się rany', b: true },
        { t: '. Podolog oczyszcza pęknięcia, usuwa nadmiar rogowatego naskórka i zaleca odpowiednią pielęgnację domową.' },
      ),
      img('Zbliżenie na pięty przed i po zabiegu podologicznym — po lewej pęknięcia i sucha skóra, po prawej gładka, odżywiona skóra po serii zabiegów'),

      h2('Stopa cukrzycowa — dlaczego podolog jest koniecznością?'),
      p(
        'Osoby z cukrzycą mają zaburzone czucie w stopach (neuropatia) i zaburzone krążenie — małe urazy mogą nie boleć, a jednocześnie bardzo trudno się goją. Regularne wizyty u podologa (co 4–6 tygodni) to nie luksus — to element leczenia. Pedicure u zwykłej kosmetyczki przy stopie cukrzycowej jest ryzykowny.',
      ),
      quote('Przy cukrzycy jedna niezauważona otarcie może przerodzić się w owrzodzenie, które leczy się tygodniami. Podolog wie, jak pracować bezpiecznie przy tym schorzeniu.'),

      h2('Jak wygląda pierwsza wizyta u podologa?'),
      ol(
        'Wywiad — choroby współistniejące, leki, dolegliwości, historia problemu',
        'Ocena wzrokowa i dotykowa stóp — naskórek, paznokcie, czucie, krążenie',
        'Opracowanie zmian — frezarka, skalpel podologiczny, narzędzia do usuwania zrostów',
        'Zalecenia — pielęgnacja domowa, właściwe obuwie, kiedy wrócić',
        'Opcjonalnie: klamra korekcyjna na wrastający paznokieć, wkładka odciążająca',
      ),

      h2('Pedicure kosmetyczny vs. podologiczny — kiedy który?'),
      pb(
        { t: 'Jeśli stopy są zdrowe i chodzi Ci o estetykę — ' },
        { t: 'pedicure kosmetyczny wystarczy', b: true },
        { t: '. Jeśli masz bólowe modzele, wrastające paznokcie, grzybicę, brodawki, pęknięcia lub chorujesz na cukrzycę — ' },
        { t: 'idź do podologa', b: true },
        { t: '. To nie są zabiegi wymienne. To różne poziomy interwencji.' },
      ),

      h2('Kiedy iść do podologa — lista sygnałów'),
      ul(
        'Ból przy chodzeniu lub staniu wynikający ze zmian na skórze lub paznokciach',
        'Paznokieć wrastający w wał boczny — zaczerwienienie, obrzęk, ból',
        'Żółte, kruche, grubiejące paznokcie (podejrzenie grzybicy)',
        'Twarde, bolesne zmiany na podeszwie stopy (modzel, odcisk, brodawka)',
        'Głębokie pęknięcia pięt — szczególnie bolesne lub ze śladami krwi',
        'Cukrzyca lub inne choroby układu krążenia — regularne wizyty profilaktyczne',
        'Deformacje palców (paluch koślawy, palce młoteczkowe) powodujące otarcia',
      ),

      h2('Podologia w salonie BeskidStudio By Wiktoria Ćwik w Limanowej'),
      p(
        'Oferujemy pedicure podologiczny i kosmetyczny. Opracowujemy wrastające paznokcie, modzele, odciski i pęknięte pięty. Przyjmujemy klientki i klientów z Limanowej, Nowego Sącza, Mszany Dolnej, Łososiny Dolnej i całego powiatu limanowskiego. Przy pierwszej wizycie wykonujemy pełną ocenę stóp i dobieramy plan pielęgnacji. Rezerwacja online.',
      ),
    ),
  },

];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding kosmetologia blog posts (part 3: articles 21–25)...');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    throw new Error('No admin user found. Run the main seed first: pnpm prisma:seed');
  }

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[ąćęłńóśźż]/g, (c) =>
        ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[c] ?? c),
      );

  for (const article of articles) {
    const { tags, ...rest } = article;

    const tagRecords = await Promise.all(
      tags.map((name) =>
        prisma.tag.upsert({
          where: { slug: slugify(name) },
          update: {},
          create: { name, slug: slugify(name) },
        }),
      ),
    );

    await prisma.blogPost.upsert({
      where: { slug: rest.slug },
      update: {
        ...rest,
        tags: { set: tagRecords.map((t) => ({ id: t.id })) },
      },
      create: {
        ...rest,
        isPublished: true,
        authorId: admin.id,
        tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      },
    });

    console.log(`  ✓ ${rest.title}`);
  }

  console.log(`\nSeeded ${articles.length} blog posts (part 3) successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

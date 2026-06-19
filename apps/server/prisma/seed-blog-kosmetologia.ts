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

// Paragraph with inline bold fragments.
// Pass alternating [text, bold?] pairs.
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

  // ── 1. SKINBOOSTERS ──────────────────────────────────────────────────────
  {
    slug: 'skinboosters-mezoterapia-hialuronowa-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Skinboosters — kiedy krem już nie wystarcza',
    metaTitle: 'Skinboosters Limanowa — Gabinet BeautyBeskid | Mezoterapia hialuronowa',
    metaDescription:
      'Skinboosters w Limanowej — głębokie nawilżenie skóry kwasem hialuronowym. Gabinet BeautyBeskid oferuje mezoterapię hialuronową dla klientek z Mszany Dolnej, Nowego Sącza i okolic.',
    excerpt:
      'Masz dobre kosmetyki, regularnie stosujesz serum, a skóra wciąż wygląda zmęczona i szara? To znak, że potrzebuje czegoś, co działa głębiej. Skinboosters to odpowiedź.',
    readingTime: 5,
    tags: ['skinboosters', 'mezoterapia', 'kwas hialuronowy', 'nawilżanie twarzy', 'limanowa'],
    content: doc(
      pb(
        { t: 'Jest taki moment, w którym nawet najdroższy krem przestaje wystarczać. Skóra wchłania go w minutę, wygląda nieźle przez godzinę, a potem znów — szarość, ściąganie, zmęczony wyraz twarzy. ' },
        { t: 'Winowajcą nie jest krem. Winowajcą jest to, że krem, z definicji, może działać tylko na powierzchni.', b: true },
        { t: ' Skinboosters działają zupełnie inaczej.' },
      ),
      img('Zbliżenie na promienną, nawilżoną skórę twarzy kobiety — widoczny efekt blasku i elastyczności po serii skinboosterów'),

      h2('Czym są skinboosters i jak trafiają do skóry?'),
      p(
        'Skinbooster to preparat na bazie kwasu hialuronowego o małej gęstości, który podaje się bezpośrednio w skórę właściwą za pomocą cienkich mikroiniekcji. Kwas hialuronowy — substancja naturalnie obecna w naszym ciele — wiąże wodę w stosunku 1:6000 (jeden gram wiąże do sześciu litrów wody). W młodej skórze jest go pod dostatkiem. Z wiekiem — i to już od 25. roku życia — jego poziom systematycznie spada.',
      ),
      pb(
        { t: 'Różnica między skinboosterem a fillerem jest fundamentalna. ' },
        { t: 'Filler wypełnia — dodaje objętości w konkretnym miejscu.', b: true },
        { t: ' Skinbooster rewitalizuje — nawilża i poprawia jakość tkanki na całym obszarze. Nie modeluje ust ani policzków. Sprawia, że skóra zaczyna lepiej funkcjonować.' },
      ),

      h2('Jak przebiega zabieg?'),
      h3('Przygotowanie i znieczulenie'),
      p(
        'Przed zabiegiem skórę dezynfekuje się i nakłada krem znieczulający — czeka się 20–30 minut, aż zacznie działać. To sprawia, że sam zabieg jest znacznie lepiej tolerowany niż można by się spodziewać po słowie „iniekcje".',
      ),
      h3('Samo podanie preparatu'),
      p(
        'Kosmetolog wykonuje serię małych wkłuć lub używa kaniuli, równomiernie podając preparat w wybrany obszar — najczęściej policzki, okolice oczu, czoło, szyję lub dekolt. Zabieg trwa 30–45 minut.',
      ),
      quote(
        '„Po zabiegu mogą pojawić się drobne obrzęki i siniaki. To normalne — ustępują w ciągu 3–5 dni, a skóra pod nimi jest od razu głębiej nawilżona."',
      ),

      h2('Kto skorzysta najbardziej?'),
      ul(
        'Osoby ze skórą suchą i odwodnioną, która nie reaguje na standardowe kremy',
        'Kobiety po 30., u których naturalny poziom kwasu hialuronowego zaczyna spadać',
        'Palacze — tytoń przyspiesza degradację HA w tkance nawet dwukrotnie',
        'Osoby po kuracji retinolem lub mocnymi kwasami, szukające regeneracji bariery skórnej',
        'Każdy, kto chce poprawić jakość skóry — nie jej kształt, ale jej kondycję',
      ),

      h2('Ile sesji i jak długo trwają efekty?'),
      pb(
        { t: 'Standardowy protokół to ' },
        { t: '3 zabiegi w odstępach co 4 tygodnie', b: true },
        { t: ', a następnie sesja uzupełniająca co 6–12 miesięcy. Pierwsze efekty — miękkość w dotyku, poprawa blasku — widoczne są już po 2–3 tygodniach od pierwszego zabiegu. Pełen efekt ujawnia się po zakończeniu cyklu i utrzymuje się do 9 miesięcy.' },
      ),
      img('Kosmetolog w gabinecie wykonuje mezoterapię hialuronową — zbliżenie na zabieg przy twarzy klientki'),

      h2('Skinboosters + pielęgnacja domowa — idealne połączenie'),
      p(
        'Zabiegi i kosmetyki to nie alternatywy — to dwie warstwy tej samej strategii. Po skinboosterach warto stosować serum z kwasem hialuronowym na lekko wilgotną skórę, lekki krem nawilżający i — bezwzględnie — filtr SPF 50. Skóra po mezoterapii jest wrażliwsza na słońce przez kilka dni.',
      ),

      h2('Zarezerwuj wizytę w Limanowej'),
      p(
        'Gabinet BeautyBeskid w Limanowej wykonuje mezoterapię hialuronową dla klientek z całego powiatu. Z Mszany Dolnej dojedziesz w ok. 15 minut, z Nowego Sącza — ok. 30 minut, z Tymbarku — ok. 20 minut. Umów wizytę online — efekty pojawią się szybciej, niż się spodziewasz.',
      ),
    ),
  },

  // ── 2. PEELING CHEMICZNY ─────────────────────────────────────────────────
  {
    slug: 'peeling-chemiczny-kwasy-aha-bha-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Kwasy AHA i BHA w kosmetologii — co właściwie robią ze skórą?',
    metaTitle: 'Peeling chemiczny Limanowa — Salon BeautyBeskid | Kwasy AHA, BHA, TCA',
    metaDescription:
      'Peeling chemiczny kwasami AHA i BHA w Limanowej. Gabinet BeautyBeskid pomaga walczyć z przebarwieniami, rozszerzonymi porami i niejednolitą cerą. Klientki z Łososiny Dolnej, Ujanowic i okolic.',
    excerpt:
      'Kwasy w kosmetologii brzmią groźnie — tymczasem to jedne z najlepiej przebadanych i najskuteczniejszych składników, jakie w ogóle istnieją. Tylko trzeba wiedzieć, którego użyć i kiedy.',
    readingTime: 5,
    tags: ['peeling chemiczny', 'kwasy AHA BHA', 'przebarwienia', 'kosmetologia', 'limanowa'],
    content: doc(
      p(
        'Przebarwienie słoneczne, które zostało po lecie. Zaskórniki, które wracają co miesiąc jak w zegarku. Nierówna tekstura, którą czujesz pod palcami, kiedy nakładasz krem. To są problemy, z którymi pielęgnacja domowa radzi sobie… średnio. Peeling chemiczny radzi sobie znacznie lepiej.',
      ),
      img('Porównanie skóry twarzy przed i po serii peelingów chemicznych — wyrównany koloryt i wygładzona tekstura po prawej stronie'),

      h2('AHA, BHA, TCA — co kryje się za skrótami?'),
      h3('Kwasy AHA — dla skóry suchej i z przebarwieniami'),
      pb(
        { t: 'Alfa-hydroksykwasy (glikolowy, mlekowy, migdałowy, cytrynowy) działają na ' },
        { t: 'powierzchni naskórka', b: true },
        { t: '. Rozpuszczają spoiwo łączące martwe komórki, przyspieszają ich złuszczanie i pobudzają odnowę. Efekt: jaśniejsza cera, mniej widoczne drobne zmarszczki, wyrównany koloryt. Polecane dla skóry suchej i normalnej.' },
      ),
      h3('Kwas BHA — specjalista od porów i trądziku'),
      pb(
        { t: 'Kwas salicylowy (BHA) jest ' },
        { t: 'lipofilny — czyli rozpuszcza się w tłuszczach', b: true },
        { t: '. Dzięki temu wnika w pory, rozpuszcza sebum i oczyszcza je od środka. Niezastąpiony przy cerze tłustej, trądzikowej i skłonnej do zaskórników.' },
      ),
      h3('Kwas TCA — głębszy, ale tylko w gabinecie'),
      p(
        'Kwas trichlorooctowy (TCA) to już inny poziom — sięga głębiej, skutecznie redukuje przebarwienia posłoneczne, głębsze zmarszczki i blizny. Używany wyłącznie w gabinecie, wyłącznie przez specjalistę.',
      ),

      h2('Peeling w gabinecie vs. kwas w kremie — ogromna różnica'),
      pb(
        { t: 'Kwasy dostępne w drogeriach mają stężenie zazwyczaj do 10–15% przy bezpiecznym pH. Peeling gabinetowy to ' },
        { t: 'stężenia 20–70%', b: true },
        { t: ', stosowane przez kosmetologa z precyzyjną kontrolą czasu ekspozycji. To nie jest "mocniejszy krem" — to zupełnie inny rodzaj zabiegu.' },
      ),
      quote('Peeling chemiczny w gabinecie działa na skórę podobnie jak trening siłowy na mięśnie — wymaga odpowiedniego przygotowania, ale efekty są proporcjonalne do wysiłku.'),
      img('Kosmetolog aplikuje peeling chemiczny pędzelkiem na twarz klientki — profesjonalne warunki gabinetowe'),

      h2('Jak przygotować skórę? Zasada dwóch tygodni'),
      ol(
        'Przez 14 dni przed zabiegiem: wprowadź kwasy w niskim stężeniu, żeby zbudować tolerancję skóry',
        'Bezwzględnie: stosuj krem z filtrem SPF co rano — bez tego peeling może dać efekt odwrotny do zamierzonego',
        'Na 5–7 dni przed: odstawiaj retinoidy',
        'Poinformuj specjalistę o lekach — antybiotyki i leki hormonalne mogą nasilać fotosensytywność',
      ),

      h2('Co czeka Cię po zabiegu?'),
      p(
        'Po płytkim peelingiem AHA: 1–2 dni delikatnego zaróżowienia i suchości, złuszczanie zazwyczaj subtelne. Po głębszym TCA: wyraźne łuszczenie trwające 3–7 dni — w tym czasie omijasz aktywne składniki, nie eksponujesz skóry na słońce i intensywnie nawilżasz łagodnymi produktami.',
      ),

      h2('Kiedy NIE warto wykonywać peelingów chemicznych?'),
      ul(
        'Aktywny trądzik z otwartymi zmianami zapalnymi',
        'Oparzenia słoneczne lub niedawna opalenizna',
        'Ciąża i karmienie piersią',
        'Aktywna opryszczka — przed zabiegiem warto profilaktycznie wziąć lek przeciwwirusowy',
        'Isotretynoina w ciągu ostatnich 6 miesięcy',
      ),

      h2('Gabinet BeautyBeskid w Limanowej — dobieramy kwas do Twojej cery'),
      p(
        'Przyjmujemy klientki z Łososiny Dolnej, Ujanowic, Jodłownika i całego powiatu. Każdy peeling chemiczny poprzedza konsultacja i ocena cery — nie stosujemy gotowych schematów. Umów wizytę online.',
      ),
    ),
  },

  // ── 3. DERMAPEN ──────────────────────────────────────────────────────────
  {
    slug: 'dermapen-mikronakluwanie-twarzy-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Dermapen — jak setki mikroigieł może przywrócić skórze młodość',
    metaTitle: 'Dermapen Limanowa — Gabinet BeautyBeskid | Mikronakłuwanie twarzy',
    metaDescription:
      'Dermapen w Limanowej — stymulacja kolagenu metodą mikronakłuwania. Skuteczny na blizny potrądzikowe, zmarszczki i rozstępy. Gabinet BeautyBeskid przyjmuje klientki z Mordarki, Tymbarku i okolic.',
    excerpt:
      'Setki igiełek wbijające się w skórę. Brzmi jak ostatnia rzecz, którą chciałabyś zrobić swojej twarzy. A jednak dermapen to jeden z najlepiej działających zabiegów we współczesnej kosmetologii.',
    readingTime: 5,
    tags: ['dermapen', 'mikronakłuwanie', 'kolagen', 'blizny potrądzikowe', 'limanowa'],
    content: doc(
      p(
        'Mechanizm jest przewrotnie prosty: żeby skóra zaczęła się naprawiać, musi dostać sygnał, że jest uszkodzona. Dermapen tworzy setki mikrokanałów w naskórku — na tyle małych, żeby nie były niebezpieczne, na tyle wyraźnych, żeby uruchomić kaskadę gojenia. Fibroblasty ruszają do pracy. Kolagen zaczyna się odkładać. Skóra — dosłownie — odbudowuje się od środka.',
      ),
      img('Urządzenie dermapen z głowicą mikroigieł trzymane przez kosmetologa — zbliżenie na precyzyjną końcówkę roboczą'),

      h2('Mechanizm działania — dlaczego to działa?'),
      pb(
        { t: 'Głowica dermapena wchodzi w skórę na głębokość od ' },
        { t: '0,25 mm (naskórek) do nawet 2,5 mm (skóra właściwa)', b: true },
        { t: ' — w zależności od obszaru i problemu. Każde wkłucie to mikrouraz, który aktywuje płytki krwi i czynniki wzrostu. W ciągu kilku godzin mikrokanaliki się zamykają, ale sygnał naprawczy pozostaje aktywny przez 4–6 tygodni.' },
      ),
      quote('Dermapen działa jak trening siłowy dla skóry — drobne mikrourazy prowadzą do wzmocnienia i przebudowy tkanki.'),

      h2('Na co pomaga mikronakłuwanie?'),
      h3('Blizny potrądzikowe'),
      p(
        'To jeden z najtrudniejszych problemów w kosmetologii. Wgłębione blizny „ice pick" i „boxcar" wymagają stymulacji głębszych warstw skóry — dokładnie tam, gdzie sięga dermapen. Po serii 6–8 zabiegów powierzchnia bliznowata wyrównuje się widocznie.',
      ),
      h3('Rozstępy'),
      p(
        'Na brzuchu, udach, biuście. Dermapen poprawia teksturę i kolor rozstępów — starsze, białe rozstępy reagują wolniej niż świeże, różowe, ale poprawa jest możliwa.',
      ),
      h3('Zmarszczki i wiotkość skóry'),
      p(
        'Pobudzenie syntezy kolagenu i elastyny przekłada się na poprawę napięcia skóry. Efekt liftingujący widoczny po serii 4–6 sesji.',
      ),
      h3('Pory i szara cera'),
      p(
        'Regularne mikronakłuwanie poprawia ogólną teksturę skóry, zmniejsza widoczność porów i przywraca blask — nawet bez konkretnego problemu punktowego.',
      ),
      img('Skóra twarzy kobiety przed i po serii dermapena — wyraźnie zmniejszone blizny potrądzikowe i wygładzona tekstura'),

      h2('Ile sesji, jakie odstępy?'),
      pb(
        { t: 'Dla ogólnej poprawy kondycji: ' },
        { t: '3 sesje co 4–6 tygodni', b: true },
        { t: '. Dla blizn i rozstępów: 6–8 sesji. Efekty nie są natychmiastowe — kolagen potrzebuje czasu. Najlepsze rezultaty widać 2–3 miesiące po zakończeniu cyklu, nie po pierwszym zabiegu.' },
      ),

      h2('Dermapen + mezoterapia — synergia, która robi różnicę'),
      p(
        'Mikrokanały otwarte przez dermapen wchłaniają substancje aktywne nawet 10-krotnie lepiej niż nienaruszona skóra. Dlatego w trakcie zabiegu kosmetolog może aplikować cocktaile z witaminą C, peptydami czy kwasem hialuronowym — efekt jest wtedy znacznie głębszy niż przy samym nakłuwaniu.',
      ),

      h2('Pielęgnacja po zabiegu — 3 żelazne zasady'),
      ol(
        'Przez 24h: bez słońca, sauny, siłowni i gorących kąpieli',
        'Przez 48–72h: wyłącznie łagodna pielęgnacja — bez kwasów, retinolu, witaminy C',
        'Przez tydzień: krem SPF 50 każdego ranka — skóra po mikronakłuwaniu jest wyjątkowo wrażliwa na promieniowanie UV',
      ),

      h2('Umów się w Limanowej'),
      p(
        'Gabinet BeautyBeskid w Limanowej wykonuje zabiegi dermapenem dla klientek z całego powiatu. Z Mordarki dojedziesz w 10 minut, z Tymbarku — ok. 20 minut. Zarezerwuj termin online.',
      ),
    ),
  },

  // ── 4. POWIĘKSZANIE UST ───────────────────────────────────────────────────
  {
    slug: 'powiekszanie-ust-kwas-hialuronowy-limanowa',
    category: 'Medycyna estetyczna',
    title: 'Powiększanie ust — jak uniknąć efektu "za dużo"?',
    metaTitle: 'Powiększanie ust Limanowa — Gabinet BeautyBeskid | Filler ust kwas hialuronowy',
    metaDescription:
      'Powiększanie ust kwasem hialuronowym w Limanowej. Naturalny efekt, odwracalny zabieg. Gabinet BeautyBeskid przyjmuje klientki z Nowego Sącza, Mszany Dolnej i całego powiatu limanowskiego.',
    excerpt:
      'Filler do ust nadal kojarzą się niektórym z przesadnie wydętymi ustami ze zdjęć. Tymczasem dobry zabieg powinien być właściwie niewidoczny — powinnaś wyglądać jak Ty, tylko lepiej.',
    readingTime: 5,
    tags: ['usta', 'filler ust', 'kwas hialuronowy', 'medycyna estetyczna', 'limanowa'],
    content: doc(
      p(
        'Trend się zmienił. Jeszcze kilka lat temu popularne były usta mocno wydęte, wyraźnie "zrobione". Dziś klientki przynoszą na konsultacje zdjęcia z opisem "chcę, żeby wyglądało naturalnie" i "żeby nie było widać, że coś robiłam". I dobrze — bo właśnie takie efekty daje prawidłowo wykonany zabieg.',
      ),
      img('Zbliżenie na usta kobiety po zabiegu — naturalnie zarysowany kontur wargi górnej i dolnej, subtelna poprawa proporcji'),

      h2('Co można zmienić fylerem do ust?'),
      ul(
        'Zarysować kontur — warga górna po 30. traci wyrazistość łuku Kupidyna',
        'Uzupełnić objętość — usta "chudną" z wiekiem tak samo jak policzki',
        'Unieść opadające kąciki ust — dają wyraz twarzy "zmęczonej" lub "niezadowolonej"',
        'Wyrównać asymetrię — różnica w proporcji wargi górnej i dolnej',
        'Nawilżyć i wygładzić — filler poprawia też jakość tkanki warg',
      ),

      h2('Ile filera potrzeba? Mniej znaczy więcej'),
      pb(
        { t: 'Przy subtelnej korekcie zazwyczaj wystarczy ' },
        { t: '0,5–1 ml preparatu', b: true },
        { t: '. Przy wyraźniejszym powiększeniu — do 1,5 ml. Więcej niż 2 ml naraz to rzadkość uzasadniona rzadkimi przypadkami. Zasada jest prosta: zawsze lepiej dosypać niż przesadzić przy pierwszym zabiegu.' },
      ),
      quote('Dobry efekt fillera nie krzyczy — szepcze. Jeśli ktoś pyta "coś zrobiłaś z ustami?", to komplement. Jeśli od razu widzi filler — coś poszło nie tak.'),

      h2('Jak wygląda zabieg krok po kroku?'),
      h3('Konsultacja i planowanie'),
      p(
        'Przed podaniem czegokolwiek kosmetolog ogląda proporcje twarzy jako całości. Usta nie istnieją w oderwaniu od nosa, brody i kształtu twarzy — dobry specjalista pracuje z całością.',
      ),
      h3('Znieczulenie'),
      p(
        'Krem znieczulający lub blok nerwowy (szybki zastrzyk, który prawie całkowicie znosi ból). Usta to obszar wrażliwy — dobre znieczulenie to standard, nie opcja.',
      ),
      h3('Podanie preparatu'),
      p(
        'Filler podaje się cienką igłą lub kaniulą w wybrane punkty: wał wargi górnej (tzw. dry border), ciało warg, kąciki ust. Całość zajmuje 30–45 minut.',
      ),
      img('Kosmetolog w rękawiczkach przykładający preparat do ust klientki — widoczna precyzja zabiegu'),

      h2('Obrzęk, siniaki i "za duże usta" — co jest normą?'),
      pb(
        { t: 'Bezpośrednio po zabiegu usta wyglądają większe niż docelowo — to ' },
        { t: 'efekt obrzęku, który mija w 3–7 dni', b: true },
        { t: '. Ostateczny efekt ocenia się po 2 tygodniach. Siniaki są możliwe i normalne. Jeśli chcesz wyglądać dobrze na ważne wydarzenie — umów zabieg co najmniej 2 tygodnie wcześniej.' },
      ),

      h2('Filler jest odwracalny — to ważne'),
      p(
        'Kwas hialuronowy można w każdej chwili rozpuścić enzymem (hialuronidazą). To sprawia, że cały zabieg jest w pełni odwracalny. Jeśli efekt Ci nie odpowiada lub chcesz zacząć od nowa — to możliwe.',
      ),

      h2('Gabinet BeautyBeskid w Limanowej — najpierw konsultacja'),
      p(
        'Przyjmujemy klientki z Nowego Sącza, Mszany Dolnej, Słopnic i całego regionu. Przed każdym zabiegiem przeprowadzamy szczegółową konsultację i omawiamy oczekiwany efekt. Rezerwacja online dostępna przez całą dobę.',
      ),
    ),
  },

  // ── 5. OMBRE POWDER BROWS ────────────────────────────────────────────────
  {
    slug: 'ombre-powder-brows-makijaz-permanentny-brwi-limanowa',
    category: 'Brwi i rzęsy',
    title: 'Ombre Powder Brows — brwi, które budzą zachwyt i nie wymagają codziennego malowania',
    metaTitle: 'Makijaż permanentny brwi Limanowa — Salon BeautyBeskid | Ombre Powder Brows PMU',
    metaDescription:
      'Ombre Powder Brows w Limanowej — naturalne, trwałe brwi bez codziennego malowania. Salon BeautyBeskid wykonuje makijaż permanentny dla klientek z Jodłownika, Laskowej i okolic.',
    excerpt:
      'Rano wstajesz i brwi są. Nie trzeba nic robić — wyglądają jak delikatnie zacienione cieniem, idealnie symetryczne. To właśnie obiecuje technika ombre powder brows. I dotrzymuje obietnicy.',
    readingTime: 5,
    tags: ['makijaż permanentny', 'ombre powder brows', 'brwi', 'PMU', 'limanowa'],
    content: doc(
      p(
        'Wiele kobiet spędza przy lustrze 10–15 minut dziennie na malowaniu brwi. Przez rok daje to ponad 60 godzin. Makijaż permanentny odcina ten czas raz na zawsze — i w przypadku techniki ombre powder brows robi to z efektem, który wygląda naprawdę naturalnie.',
      ),
      img('Zbliżenie na brwi wykonane techniką ombre powder brows — naturalny gradient od jasnej nasady do ciemniejszego ogona'),

      h2('Czym jest ombre powder brows i jak różni się od microbladingu?'),
      pb(
        { t: 'Microblading rysuje w skórze cienkie linie imitujące pojedyncze włoski — efekt jest naturalny, ale technika najlepiej sprawdza się na ' },
        { t: 'cerze suchej i normalnej', b: true },
        { t: '. Na cerze tłustej pigment często "rozlewa się" i linie tracą ostrość.' },
      ),
      pb(
        { t: 'Ombre powder brows to metoda maszynkowa — pigment nakładany jest ' },
        { t: 'precyzyjnymi punktami (technika pixel PM)', b: true },
        { t: ', intensywniej u ogona brwi, delikatniej przy nasadzie. Efekt: brwi wyglądają jak delikatnie wypełnione cieniem. Technika sprawdza się na każdym typie cery, a na cerze tłustej jest zdecydowanie lepsza od microbladingu.' },
      ),
      quote('Ombre powder brows to nie tatuaż. To pigment wprowadzony płytko w skórę, który stopniowo wyblaknie — dlatego wymaga odświeżenia co 1–2 lata.'),

      h2('Jak wygląda cały proces?'),
      h3('Konsultacja i dobór kształtu'),
      p(
        'To najważniejszy etap. Razem ustalacie kształt brwi dopasowany do rysów twarzy i kolor dopasowany do naturalnego koloru włosów. Specjalistka zaznacza obrys — możesz zobaczyć efekt i zatwierdzić, zanim cokolwiek zostanie podane w skórę.',
      ),
      h3('Znieczulenie i wykonanie'),
      p(
        'Po nałożeniu kremu znieczulającego specjalistka wypełnia brwi metodą pixelową. Zabieg trwa ok. 2–2,5 godziny. Bezpośrednio po nim brwi są ciemniejsze niż docelowo — o 30–40%. Tak wygląda każdy makijaż permanentny na świeżo.',
      ),
      h3('Gojenie i poprawka'),
      p(
        'Przez pierwszych kilka dni brwi będą ciemne i mogą lekko łuszczyć — absolutnie nie ściągaj strupków, bo możesz zabrać pigment. Po 4–6 tygodniach kolor się stabilizuje i wykonuje się bezpłatną poprawkę uzupełniającą ubytki.',
      ),
      img('Kobieta z naturalnie zarysowanymi brwiami w efekcie ombre — symetryczne, pasujące do koloru włosów'),

      h2('Jak długo utrzymuje się efekt i co go skraca?'),
      ul(
        'Standardowo: 1,5–3 lata, zanim kolor wyblaknie na tyle, żeby wymagał odświeżenia',
        'Cera tłusta: pigment wchłania się szybciej — może wymagać odświeżenia po roku',
        'Słońce: regularne stosowanie SPF w okolicach brwi wyraźnie wydłuża trwałość',
        'Niektóre leki i kwasy w pielęgnacji mogą przyspieszyć wyblakanie — warto poinformować specjalistkę',
      ),

      h2('Salon BeautyBeskid w Limanowej — przyjmujemy z Jodłownika, Laskowej i okolic'),
      p(
        'Dojazd z Jodłownika i Laskowej zajmuje ok. 10–15 minut. Zarezerwuj termin online i zacznij poranne rutyny od nowa — bez kredki do brwi.',
      ),
    ),
  },

  // ── 6. DEPILACJA LASEROWA ────────────────────────────────────────────────
  {
    slug: 'depilacja-laserowa-co-warto-wiedziec-limanowa',
    category: 'Medycyna estetyczna',
    title: 'Depilacja laserowa — co naprawdę dzieje się ze skórą podczas zabiegu?',
    metaTitle: 'Depilacja laserowa Limanowa — Salon BeautyBeskid | Trwała depilacja lazer',
    metaDescription:
      'Depilacja laserowa w Limanowej — skuteczna redukcja owłosienia na nogach, pachach, twarzy i bikini. Salon BeautyBeskid przyjmuje klientki z Nowego Sącza, Tymbarku i całego powiatu.',
    excerpt:
      'Depilacja laserowa to nie magia. To fizyka — konkretny mechanizm, konkretne efekty i konkretne ograniczenia. Zanim zapiszesz się na pierwszą sesję, dowiedz się, jak to naprawdę działa.',
    readingTime: 5,
    tags: ['depilacja laserowa', 'trwała depilacja', 'laser', 'owłosienie', 'limanowa'],
    content: doc(
      p(
        'Kilka minut, lekki dyskomfort porównywalny do strzelu gumką recepturką i stopniowe, trwałe pozbycie się włosów. Brzmi niemal zbyt prosto. W dużym uproszczeniu — tak właśnie działa depilacja laserowa. Ale diabeł tkwi w szczegółach: w kolorze Twojej skóry i włosów, w fazie wzrostu mieszków i w liczbie potrzebnych sesji.',
      ),
      img('Kosmetolog wykonuje zabieg depilacji laserowej na nodze klientki — zbliżenie na głowicę urządzenia przy skórze'),

      h2('Fizyka zabiegu — dlaczego laser niszczy włosy?'),
      pb(
        { t: 'Laser emituje światło o konkretnej długości fali, które jest pochłaniane przez ' },
        { t: 'melaninę — barwnik zawarty w mieszku włosowym', b: true },
        { t: '. Pochłoniętą energię świetlna melanina zamienia na ciepło, które termicznie niszczy mieszek. Jeśli mieszek jest martwy — włos nie odrasta. Prosta fizyka.' },
      ),
      quote('Laser "widzi" melaninę. Dlatego najlepiej działa na ciemne włosy. I dlatego jasne, siwe i rudawe włosy są najtrudniejsze do usunięcia.'),

      h2('Ile sesji naprawdę potrzeba?'),
      pb(
        { t: 'Laser działa tylko na włosy w fazie aktywnego wzrostu (anagen). W danym momencie w tej fazie jest ' },
        { t: 'zaledwie 20–30% włosów', b: true },
        { t: ' na danym obszarze. Dlatego potrzeba serii — zazwyczaj 6–8 sesji w odstępach 4–8 tygodni — żeby "złapać" kolejne partie włosów.' },
      ),

      h2('Dla kogo depilacja laserowa daje najlepsze efekty?'),
      h3('Idealna kombinacja: jasna skóra + ciemne włosy'),
      p(
        'Maksymalny kontrast między melaininą włosa a melaniny skóry = laser trafia precyzyjnie w mieszek, nie nagrzewa okolicznej tkanki. Efekty najlepsze, ryzyko reakcji skóry najmniejsze.',
      ),
      h3('Śniada skóra + ciemne włosy'),
      p(
        'Przy odpowiednio dobranym laserze i parametrach zabiegu — dobre efekty. Wymaga doświadczonego specjalisty.',
      ),
      h3('Jasne, siwe lub rudawe włosy'),
      p(
        'Melanina w tych włosach jest słabo odzwierciedlona w zakresie typowych laserów. Efekty ograniczone lub żadne — warto to wiedzieć przed zapisaniem się.',
      ),
      img('Porównanie efektu przed i po serii depilacji laserowej na pachach — gładka skóra po stronie z efektem'),

      h2('Co zrobić przed i po zabiegu?'),
      h3('Przed sesją'),
      ul(
        'Nie opalaj się i nie stosuj samoopalacza przez co najmniej 4 tygodnie',
        'Ogól obszar dzień przed zabiegiem — włos musi być w mieszku, nie nad skórą',
        'Nie depiluj woskiem ani epilatorem — usuwasz mieszek, który laser ma trafić',
      ),
      h3('Po sesji'),
      ul(
        'Przez 24–48h unikaj sauny, intensywnego wysiłku i gorących kąpieli',
        'Stosuj krem SPF na naświetlone obszary przez kilka dni',
        'Między sesjami: tylko golenie lub krem depilacyjny — nigdy woskiem ani epilatorem',
      ),

      h2('Salon BeautyBeskid w Limanowej — bezpłatna konsultacja przed cyklem'),
      p(
        'Zapraszamy klientki z Nowego Sącza, Tymbarku, Łososiny Dolnej i całego powiatu. Na konsultacji ocenimy kolor Twojej skóry i owłosienia, dobierzemy parametry i wyjaśnimy, czego realnie oczekiwać. Rezerwacja online przez całą dobę.',
      ),
    ),
  },

  // ── 7. TRĄDZIK RÓŻOWATY ───────────────────────────────────────────────────
  {
    slug: 'tradzik-rozowaty-pielegnacja-cery-kosmetologia',
    category: 'Pielęgnacja skóry',
    title: 'Trądzik różowaty — jak przestać walczyć ze skórą i zacząć jej słuchać',
    metaTitle: 'Trądzik różowaty pielęgnacja — Salon BeautyBeskid Limanowa | Cera wrażliwa rosacea',
    metaDescription:
      'Trądzik różowaty wymaga specjalnej pielęgnacji. Gabinet BeautyBeskid w Limanowej oferuje zabiegi dla cery naczyniowej i wrażliwej. Przyjmujemy klientki z Mszany Dolnej, Słopnic i okolic.',
    excerpt:
      'Rumień, który nie znika. Naczynka przy nosie. Skóra, która reaguje na wszystko — wiatr, gorącą herbatę, stres. Rosacea jest przewlekła, ale można z nią żyć bez codziennej walki. Trzeba tylko wiedzieć, jak.',
    readingTime: 5,
    tags: ['trądzik różowaty', 'rosacea', 'cera wrażliwa', 'pielęgnacja twarzy', 'limanowa'],
    content: doc(
      p(
        'Trądzik różowaty ma fatalny marketing. Słowo "trądzik" sugeruje, że chodzi o te same mechanizmy co trądzik pospolity — i że te same metody pomogą. To błąd, który kosztuje lata stosowania nieodpowiedniej pielęgnacji, pogłębiającej problem zamiast go łagodzić. Rosacea to coś zupełnie innego.',
      ),
      img('Zbliżenie na twarz kobiety z delikatnym rumieniem na policzkach i naczynkami — charakterystyczny wygląd cery z rosacea'),

      h2('Czym jest rosacea i dlaczego reaguje na wszystko?'),
      pb(
        { t: 'Rosacea to zaburzenie naczynioruchowe — naczynia krwionośne w skórze twarzy ' },
        { t: 'reagują zbyt intensywnie na różne bodźce', b: true },
        { t: ', rozszerzają się i stają widoczne. Podłoże jest genetyczne. Czynniki zewnętrzne — słońce, ostre potrawy, alkohol, zmiany temperatury, stres — nasilają objawy.' },
      ),
      quote('Rosacea nie jest kwestią złej higieny ani złej pielęgnacji. To przewlekłe schorzenie z genetycznym podłożem — i tak powinno być traktowane.'),

      h2('Czego absolutnie unikać?'),
      pb(
        { t: 'Przy cerze z rosacea ' },
        { t: 'niektóre standardowe "składniki pielęgnacyjne" stają się wrogiem', b: true },
        { t: ':' },
      ),
      ul(
        'Alkohol, mentol, eukaliptus, kamfora — silnie podrażniają i rozszerzają naczynka',
        'Peelingi mechaniczne i granulowane — fizycznie drażnią ściany naczyń',
        'Silne kwasy AHA w wysokim stężeniu — nawet jeśli "dla zdrowej skóry" są w normie, przy rosacea mogą zaogniać',
        'SLS i SLES (detergenty w wielu żelach i pianek) — niszczą barierę lipidową, nasilając reaktywność',
        'Sauna, gorące prysznice i nagłe zmiany temperatury — klasyczne triggery napadu',
      ),

      h2('Co naprawdę pomaga?'),
      h3('Budowanie bariery skórnej'),
      p(
        'Ceramidy, cholesterol i wolne kwasy tłuszczowe tworzą naturalną barierę skóry. Jeśli jest uszkodzona — skóra reaguje na wszystko. Kosmetyki odbudowujące barierę to podstawa pielęgnacji rosacea.',
      ),
      h3('Składniki łagodzące i wzmacniające naczynia'),
      pb(
        { t: 'Niacynamid (witamina B3) działa ' },
        { t: 'przeciwzapalnie, zmniejsza rumień i wzmacnia ściany naczyń', b: true },
        { t: ' — jeden z najlepiej tolerowanych przez rosacea składników. Azulen, bisabolol, allantoina — uspokajają i łagodzą stany zapalne.' },
      ),
      h3('SPF każdego dnia'),
      p(
        'Słońce to jeden z najsilniejszych trigerów rosacea. Filtr SPF 30–50 co rano to nie opcja — to warunek konieczny. Przy rosacea najlepiej tolerowane są filtry mineralne (tlenek cynku, dwutlenek tytanu).',
      ),
      img('Kobieta z wyrównaną, spokojną cerą po serii zabiegów kosmetologicznych — widoczna redukcja rumienia przy policzkach'),

      h2('Zabiegi gabinetowe wspomagające leczenie rosacea'),
      ul(
        'Fototerapia LED czerwonym i żółtym światłem — łagodzi stan zapalny, wzmacnia ściany naczyń',
        'Mezoterapia z niacynamidem i peptydami — odbudowuje barierę, zmniejsza reaktywność',
        'Zabiegi z kwasem azelainowym — skuteczny w rosacea, działa przeciwzapalnie bez podrażniania',
      ),

      h2('Kiedy koniecznie do dermatologa?'),
      p(
        'Jeśli rosacea ma fazę zapalną — grudki, krostki, phyma (zgrubienia na nosie) — konieczne jest leczenie farmakologiczne. Kosmetolog wspomaga leczenie, ale nie zastępuje dermatologa w zaawansowanych przypadkach.',
      ),

      h2('Gabinet BeautyBeskid w Limanowej'),
      p(
        'Przyjmujemy klientki z Mszany Dolnej, Słopnic, Ujanowic i okolic. Zabiegi dla cery z rosacea zawsze poprzedza konsultacja i ocena. Umów się online.',
      ),
    ),
  },

  // ── 8. RETINOL ──────────────────────────────────────────────────────────
  {
    slug: 'retinol-pielegnacja-twarzy-jak-stosowac',
    category: 'Pielęgnacja skóry',
    title: 'Retinol — dlaczego połowa kobiet rezygnuje po tygodniu (i jak tego uniknąć)',
    metaTitle: 'Retinol pielęgnacja twarzy — Salon BeautyBeskid Limanowa | Anti-aging witamina A',
    metaDescription:
      'Jak stosować retinol w pielęgnacji twarzy? Gabinet BeautyBeskid w Limanowej podpowiada, jak bezpiecznie wprowadzić retinol do rutyny i jakie zabiegi z retinolem oferujemy.',
    excerpt:
      'Retinol to najlepiej przebadany składnik anti-aging w historii kosmetologii. Ma jedną wadę: jeśli zaczniesz źle, skóra się zbuntuje. Dlatego warto wiedzieć dokładnie, jak go wprowadzić.',
    readingTime: 5,
    tags: ['retinol', 'anti-aging', 'pielęgnacja twarzy', 'zmarszczki', 'kosmetologia'],
    content: doc(
      p(
        'Dziesięciolecia badań klinicznych. Tysiące opublikowanych badań. Dermatologowie zgadzają się rzadko — ale w kwestii retinolu są zgodni: działa. Przyspiesza odnowę komórkową, stymuluje kolagen, wygładza zmarszczki, wyrównuje koloryt, zmniejsza pory. Problem polega na tym, że wiele osób stosuje go źle — i rezygnuje po tygodniu przez pieczenie, łuszczenie i zaczerwienienie.',
      ),
      img('Buteleczka serum z retinolem na eleganckim tle — minimalistyczna kompozycja studyjna'),

      h2('Czym różni się retinol od tretynoiny?'),
      pb(
        { t: 'To nie jest ten sam składnik. Retinol (dostępny w sklepach) jest pochodną witaminy A, którą skóra musi ' },
        { t: 'przetworzyć przez kilka etapów do kwasu retinowego', b: true },
        { t: ' — właściwej aktywnej formy. Tretynoina to gotowa aktywna forma, dostępna tylko na receptę i ok. 20 razy silniejsza. Im bliżej aktywnej formy, tym skuteczniejsza substancja — ale też bardziej drażniąca.' },
      ),
      quote('Retinol to sprint do maratonu: zacznij wolno, buduj tempo stopniowo, a dobiegniesz do celu. Zacznij zbyt szybko — i wypadniesz z trasy po pierwszym kilometrze.'),

      h2('Jak bezpiecznie wdrożyć retinol? Protokół krok po kroku'),
      ol(
        'Tydzień 1–2: stężenie 0,025–0,05%, stosuj 1 raz w tygodniu wieczorem',
        'Tydzień 3–4: jeśli skóra dobrze toleruje — 2 razy w tygodniu',
        'Miesiąc 2–3: stopniowo zwiększaj do 3–4 razy w tygodniu',
        'Miesiąc 4+: codzienne stosowanie lub przejście na wyższe stężenie, jeśli chcesz',
      ),
      pb(
        { t: 'Metoda "sandwich": nawilżacz → retinol → nawilżacz. Nałożenie produktu nawilżającego przed retinolem ' },
        { t: 'buforuje jego wchłanianie', b: true },
        { t: ' i znacznie zmniejsza podrażnienie przy zachowaniu skuteczności. Idealna technika na start.' },
      ),
      img('Twarz kobiety z gładką, promienną skórą — efekt kilkumiesięcznej regularnej pielęgnacji z retinolem'),

      h2('Czego NIE łączyć z retinolem?'),
      h3('Kwasy AHA/BHA tego samego wieczoru'),
      p(
        'To zbyt silne połączenie na początku — szczególnie dla nowej w retinolu skóry. Przeplataj: retinol co wieczór parzyste, kwasy co wieczór nieparzyste.',
      ),
      h3('Witamina C wieczorem'),
      p(
        'Witaminę C stosuj rano (antyoksydant + synergia z SPF), retinol wieczorem. Nałożone razem wieczorami mogą reagować ze sobą i tracić skuteczność.',
      ),
      h3('Słońce rano bez SPF'),
      pb(
        { t: 'Retinol zwiększa fotosensytywność skóry. ' },
        { t: 'Krem SPF 50 rano to obowiązek', b: true },
        { t: ', nie opcja — bez niego retinol może przyspieszyć przebarwienia zamiast je redukować.' },
      ),

      h2('Kiedy zobaczyć efekty?'),
      ul(
        '4–8 tygodni: poprawa kolorytu i tekstury, pierwsze oznaki wygładzenia',
        '3–4 miesiące: wyraźne zmniejszenie drobnych zmarszczek i porów',
        '6–12 miesięcy: pełny efekt anti-aging widoczny w porównaniu ze zdjęciami',
      ),

      h2('Gabinetowe zabiegi z retinolem — szybsza droga'),
      p(
        'Peelingi z kwasem retinowym stosowane przez kosmetologa działają głębiej i szybciej niż domowe serum. W gabinecie BeautyBeskid w Limanowej dobieramy stężenie do historii Twojej skóry i jej aktualnej kondycji. Umów konsultację online.',
      ),
    ),
  },

  // ── 9. MASAŻ KOBIDO ───────────────────────────────────────────────────────
  {
    slug: 'masaz-twarzy-kobido-lifting-bez-skalpela-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Masaż Kobido — 500 lat japońskiej tradycji w służbie owalu twarzy',
    metaTitle: 'Masaż Kobido Limanowa — Gabinet BeautyBeskid | Lifting twarzy bez operacji',
    metaDescription:
      'Masaż twarzy Kobido w Limanowej — naturalny lifting, drenaż limfatyczny i poprawa owalu twarzy. Gabinet BeautyBeskid przyjmuje klientki z Kasiny Wielkiej, Słopnic i okolic powiatu limanowskiego.',
    excerpt:
      'Kobido to najstarszy znany protokół masażu twarzy — stworzony ponad 500 lat temu dla japońskich cesarzowych. Efekt liftingujący, który czujesz już po wyjściu z gabinetu. Bez igieł. Bez skalpela.',
    readingTime: 4,
    tags: ['masaż kobido', 'lifting twarzy', 'masaż twarzy', 'drenaż limfatyczny', 'limanowa'],
    content: doc(
      p(
        'W 1472 roku japońscy mistrzowie Shogo Mochizuki i Isai Nōami opracowali Kobido — technikę masażu twarzy zarezerwowaną dla cesarzowych. Dziś jest dostępna każdej kobiecie. I wciąż działa dokładnie tak samo: jako naturalny, nieurazowy lifting, który można poczuć już po pierwszej sesji.',
      ),
      img('Kosmetolog wykonuje masaż twarzy Kobido — dłonie ułożone na twarzy klientki leżącej na kozetce, spokojny klimat gabinetu'),

      h2('Na czym polega mechanizm liftingujący?'),
      pb(
        { t: 'Kobido łączy trzy elementy. Po pierwsze: ' },
        { t: 'drenaż limfatyczny', b: true },
        { t: ' — rytmiczne ruchy odprowadzają nadmiar płynów z tkanek twarzy. Efekt: "wyszczuplenie" owalu i redukcja porannych obrzęków. Po drugie: ' },
        { t: 'stymulacja mięśni twarzy', b: true },
        { t: ' — intensywna praca nad mięśniami żwaczy, czoła i szyi przywraca im elastyczność i napięcie. Po trzecie: ' },
        { t: 'poprawa krążenia', b: true },
        { t: ' — skóra natychmiast nabiera koloru i blasku.' },
      ),
      quote('Jeden masaż Kobido = efekt widzialny przez 5–7 dni. Seria 6 masaży = efekt, który wchodzi w nawyk i się utrzymuje.'),

      h2('Co dokładnie zmienia się po zabiegu?'),
      ul(
        'Wyraźnie uniesiony owal twarzy — widoczne już po pierwszej sesji',
        'Zredukowane opuchlizny — twarz wygląda "szczuplej" i wyraźniej zarysowanej',
        'Promienny koloryt — efekt natychmiastowego pobudzenia krążenia',
        'Rozluźnienie mięśni twarzy — szczególnie czoła i żuchwy, gdzie kumulujemy stres',
        'Lepsze wchłanianie kosmetyków aplikowanych po zabiegu',
      ),

      h2('Jak często i ile sesji?'),
      h3('Na początku — seria budująca'),
      p(
        'Zaleca się 4–6 zabiegów co 1–2 tygodnie, żeby "rozbudzić" mięśnie twarzy i zbudować efekt bazowy. Mięśnie twarzy, jak każde inne mięśnie, reagują na regularną stymulację.',
      ),
      h3('Potem — utrzymanie'),
      p(
        'Po ukończeniu serii wystarczy jedna wizyta miesięcznie. Efekty po serii utrzymują się znacznie dłużej niż po pojedynczym zabiegu — to logika każdego treningu.',
      ),
      img('Twarz kobiety przed i po masażu Kobido — uniesiony owal, zredukowany obrzęk pod oczami, bardziej zarysowane kości policzkowe'),

      h2('Dla kogo Kobido jest najlepszym wyborem?'),
      p(
        'Dla każdej kobiety, która szuka efektów liftingujących bez igieł i rekonwalescencji. Szczególnie dla tych, które zaciskają zęby i napinają mięśnie szczęki pod wpływem stresu (stomatolog czasem to pierwsza osoba, która to zauważa) oraz dla tych, które rano budzą się z opuchniętą twarzą.',
      ),

      h2('Zarezerwuj masaż Kobido w Limanowej'),
      p(
        'Salon BeautyBeskid przyjmuje klientki z Kasiny Wielkiej, Słopnic, Ujanowic i całego regionu. Z Kasiny Wielkiej dojazd to ok. 20 minut. Umów się online i sprawdź, co potrafi japońska technika sprzed 5 wieków.',
      ),
    ),
  },

  // ── 10. FOTOTERAPIA LED ───────────────────────────────────────────────────
  {
    slug: 'fototerapia-led-kolory-swiatla-skora-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Fototerapia LED — kolorowe światło, które naprawdę naprawia skórę',
    metaTitle: 'Fototerapia LED Limanowa — Gabinet BeautyBeskid | Terapia światłem skóra twarzy',
    metaDescription:
      'Fototerapia LED w Limanowej — redukcja trądziku, poprawa kolorytu, efekt anti-aging. Gabinet BeautyBeskid oferuje zabiegi LED dla klientek z Dobrej, Tymbarku i okolic powiatu limanowskiego.',
    excerpt:
      'Leżysz 20 minut pod kolorową lampą. Nic nie czujesz, nic nie boli, nie ma żadnej rekonwalescencji. I mimo to efekty są naprawdę imponujące. Jak to możliwe?',
    readingTime: 4,
    tags: ['fototerapia LED', 'terapia światłem', 'trądzik', 'anti-aging', 'limanowa'],
    content: doc(
      p(
        'NASA badała fototerapię LED w kontekście gojenia ran astronautów w przestrzeni kosmicznej. Dermatologowie i kosmetolodzy przejęli ją do leczenia trądziku i odmładzania. Dziś to jeden z najszerzej stosowanych zabiegów bezinwazyjnych — i jeden z niewielu, po których możesz wyjść z gabinetu i od razu iść na spotkanie.',
      ),
      img('Klientka leżąca pod panelem LED — twarz oświetlona kolorowym światłem maski LED, relaksująca atmosfera gabinetu'),

      h2('Różne kolory, różne efekty — jak to działa?'),
      pb(
        { t: 'Każdy kolor to inna długość fali i inna głębokość wnikania w tkankę. ' },
        { t: 'Czerwone światło (630–660 nm)', b: true },
        { t: ' penetruje najgłębiej — stymuluje fibroblasty do produkcji kolagenu i elastyny. Efekt: lifting i odmłodzenie.' },
      ),
      pb(
        { t: 'Niebieskie (415–450 nm)' },
        { t: ' działa głównie na powierzchni — niszczy bakterię Cutibacterium acnes odpowiedzialną za trądzik. Efekt: mniej zmian zapalnych, czystsza cera.' },
      ),
      pb(
        { t: 'Żółte/bursztynowe (580–590 nm)', b: true },
        { t: ' łagodzi stany zapalne i zmniejsza rumień — idealne przy rosacea i cerze naczyniowej.' },
      ),
      pb(
        { t: 'Bliskie podczerwone (NIR, 800–880 nm)', b: true },
        { t: ' wnika najgłębiej spośród wszystkich. Przyspiesza regenerację, zmniejsza ból mięśni twarzy, wspomaga procesy naprawcze.' },
      ),
      quote('LED nie uszkadza DNA komórek — to kluczowa różnica od promieniowania UV. Terapia LED jest bezpieczna nawet przy bardzo regularnym stosowaniu.'),

      h2('Po ilu sesjach pojawiają się efekty?'),
      h3('Trądzik'),
      p(
        'Widoczna poprawa zazwyczaj po 4–6 sesjach (3–4 razy w tygodniu przez 2 tygodnie). Niebieskie + czerwone światło razem dają najlepsze rezultaty: niebieskie niszczy bakterie, czerwone łagodzi stany zapalne.',
      ),
      h3('Anti-aging i kolagen'),
      p(
        'Zalecane 10–12 sesji. Skóra staje się wyraźnie bardziej napięta i promienna. LED jest też znakomitym uzupełnieniem innych zabiegów — po dermapenie czy peelingach przyspiesza regenerację.',
      ),
      img('Skóra twarzy przed i po serii 10 zabiegów LED — zmniejszone zaczerwienienia, jednolity koloryt, gładszy naskórek'),

      h2('Kto odniesie największe korzyści?'),
      ul(
        'Osoby z trądzikiem — czerwone + niebieskie światło razem to skuteczna kombinacja',
        'Cera z rumieniem i rosacea — żółte światło łagodzi i wzmacnia naczynia bez ryzyka podrażnienia',
        'Osoby szukające zabiegu anti-aging bez igieł i przestoju',
        'Skóra po zabiegach laserowych, dermapenie lub peelingach — LED przyspiesza gojenie',
      ),

      h2('Fototerapia LED w gabinecie BeautyBeskid w Limanowej'),
      p(
        'Oferujemy zabiegi LED zarówno jako samodzielną terapię, jak i w połączeniu z innymi zabiegami. Przyjmujemy klientki z Dobrej, Tymbarku, Łososiny Dolnej i całego powiatu. Umów wizytę online.',
      ),
    ),
  },

];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding kosmetologia blog posts (part 1: articles 1–10)...');

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

  console.log(`\nSeeded ${articles.length} blog posts (part 1) successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

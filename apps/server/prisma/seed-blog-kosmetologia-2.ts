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

  // ── 11. MIKRODERMABRAZJA ─────────────────────────────────────────────────
  {
    slug: 'mikrodermabrazja-diamentowa-pielegnacja-skory-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Mikrodermabrazja diamentowa — dlaczego to wciąż jeden z najpopularniejszych zabiegów na świecie?',
    metaTitle: 'Mikrodermabrazja diamentowa Limanowa — Salon BeautyBeskid | Głębokie złuszczanie skóry',
    metaDescription:
      'Mikrodermabrazja diamentowa w Limanowej — głęboka pielęgnacja, wygładzanie skóry, redukcja przebarwień. Salon BeautyBeskid przyjmuje klientki z Mordarki, Laskowej i powiatu limanowskiego.',
    excerpt:
      'Istnieje od lat 90. Przeżyła wszystkie kosmetologiczne trendy. I nadal jest jednym z najchętniej wybieranych zabiegów. Mikrodermabrazja diamentowa ma coś, czego nie zastąpił żaden nowotwór — natychmiastowy, namacalny efekt.',
    readingTime: 4,
    tags: ['mikrodermabrazja', 'złuszczanie', 'pielęgnacja twarzy', 'przebarwienia', 'limanowa'],
    content: doc(
      p(
        'W erze laserów, dermapena i osocza bogatopłytkowego można by pomyśleć, że prosta mechaniczna abrazia dawno odeszła w niepamięć. A jednak mikrodermabrazja diamentowa trzyma się mocno. Powód jest prosty: jest szybka, bezbolesna, daje natychmiastowe efekty i nie wymaga żadnej rekonwalescencji. Wychodzisz z gabinetu i możesz od razu wracać do życia — z wyraźnie gładszą skórą.',
      ),
      img('Kosmetolog przykłada głowicę urządzenia do mikrodermabrazji do policzka klientki — zbliżenie na diamentową końcówkę przy skórze'),

      h2('Co dokładnie dzieje się ze skórą podczas zabiegu?'),
      pb(
        { t: 'Głowica pokryta mikrokryształkami diamentu przesuwa się po skórze, jednocześnie ' },
        { t: 'mechanicznie ścierając martwą warstwę naskórka i zasysając ją próżnią', b: true },
        { t: '. To podwójne działanie — abrazja + wciąganie — oczyszcza pory i natychmiast wygładza teksturę skóry. Mechanizm próżniowy przy okazji lekko stymuluje krążenie, co daje efekt rozświetlenia widoczny zaraz po zabiegu.' },
      ),
      quote('Po mikrodermabrazji skóra działa jak gąbka — wchłania serum i maskę kilkakrotnie lepiej niż przed zabiegiem. Dlatego zawsze kończymy zabieg intensywną pielęgnacją.'),

      h2('Komu mikrodermabrazja przyniesie największą korzyść?'),
      ul(
        'Cera szara i zmęczona, pozbawiona blasku — efekt rozświetlenia widoczny od razu po zabiegu',
        'Przebarwienia posłoneczne i potrądzikowe — systematyczna redukcja po serii 4–6 zabiegów',
        'Widoczne pory na nosie i brodzie — mechaniczne oczyszczenie zmniejsza ich wygląd',
        'Pierwsze zmarszczki i niedoskonałości tekstury — gładszy naskórek po jednej sesji',
        'Skóra przed ważnym wydarzeniem — zabieg wykonany 2–3 dni wcześniej daje efekt idealnego podkładu pod makijaż',
      ),

      h2('Diamentowa vs. krystaliczna — która lepsza?'),
      h3('Mikrodermabrazja krystaliczna'),
      p(
        'Strumień drobnych kryształków tlenku glinu dmuchany na skórę i zasysany wraz z martwym naskórkiem. Skuteczna, ale kryształki mogą trafiać w okolice oczu i ust — wymaga większej ostrożności.',
      ),
      h3('Mikrodermabrazja diamentowa'),
      pb(
        { t: 'Końcówka stała, pokryta diamentem — ' },
        { t: 'precyzyjniejsza i higieniczna', b: true },
        { t: '. Można bezpiecznie pracować blisko oczu i ust. Nie zostawia kryształków na skórze. To dlatego wersja diamentowa jest dziś standardem w dobrych gabinetach.' },
      ),
      img('Twarz kobiety bezpośrednio po mikrodermabrazji — lekkie zaróżowienie i jednocześnie wyraźnie wygładzona, promienna skóra'),

      h2('Rekonwalescencja? Żadnej.'),
      p(
        'Skóra może być lekko zaróżowiona przez kilka godzin — to normalna reakcja na mechaniczne podrażnienie. Do wieczora zaczerwienienie zazwyczaj znika całkowicie. Przez 24h warto unikać aktywnych składników i stosować filtr — a poza tym normalny tryb życia od razu po zabiegu.',
      ),

      h2('Jak często i ile sesji?'),
      pb(
        { t: 'Optymalnie ' },
        { t: 'raz na 3–4 tygodnie', b: true },
        { t: '. W przypadku przebarwień — seria 4–6 zabiegów daje trwałą poprawę. Nie wykonujemy mikrodermabrazji częściej niż co 2 tygodnie — skóra musi mieć czas na regenerację i odbudowę bariery.' },
      ),

      h2('Zarezerwuj wizytę w Limanowej'),
      p(
        'Gabinet BeautyBeskid w Limanowej wykonuje mikrodermabrazję diamentową dla klientek z Mordarki, Laskowej, Dobrej i całego powiatu. Wyjdziesz z gabinetu z natychmiastowo gładszą skórą. Umów wizytę online.',
      ),
    ),
  },

  // ── 12. PIELĘGNACJA PO 40 ────────────────────────────────────────────────
  {
    slug: 'pielegnacja-skory-po-40-anti-aging-zabiegi',
    category: 'Pielęgnacja skóry',
    title: 'Pielęgnacja skóry po 40 — co naprawdę działa, a co to tylko ładne opakowanie?',
    metaTitle: 'Pielęgnacja skóry po 40 Limanowa — Salon BeautyBeskid | Anti-aging zabiegi kosmetyczne',
    metaDescription:
      'Jak pielęgnować skórę po 40. roku życia? Salon BeautyBeskid w Limanowej oferuje zabiegi anti-aging i doradztwo pielęgnacyjne dla klientek z Nowego Sącza, Mszany Dolnej i okolic.',
    excerpt:
      'Po czterdziestce zmieniają się zasady gry. Kosmetyki, które działały w dwudziestce, mogą nie dawać efektów. Za to metody, które wcześniej wydawały się przesadą — zaczynają mieć sens.',
    readingTime: 5,
    tags: ['anti-aging', 'pielęgnacja po 40', 'odmładzanie', 'zmarszczki', 'kosmetologia'],
    content: doc(
      p(
        'Czterdziestka to moment, w którym skóra zaczyna wyraźnie komunikować upływ czasu — i robi to na kilka sposobów naraz. Produkcja kolagenu spada o 1% rocznie, zaczynając już od 25. roku życia. Po czterdziestce efekt kumuluje się. Do tego dochodzi menopauza i spadek estrogenów, który skraca "czas nawilżenia" skóry. Nie brzmi zachęcająco — ale można działać skutecznie.',
      ),
      img('Elegancka kobieta po 40 z promienną, zadbaną skórą — naturalne oświetlenie, widoczna elastyczna i nawilżona cera'),

      h2('Co konkretnie zmienia się w skórze po 40?'),
      ul(
        'Skóra staje się cieńsza i bardziej sucha — gruczoły łojowe i potowe pracują wolniej',
        'Zmniejsza się produkcja kolagenu i elastyny — skóra traci sprężystość i uniesienie',
        'Pojawia się utrata objętości — policzki "opadają", twarz chudnie w charakterystyczny sposób',
        'Przebarwienia — plamy starcze i melasma nasilają się po 40, szczególnie przy braku SPF w przeszłości',
        'Owal twarzy traci napięcie, kąciki ust i powieki opadają',
      ),
      quote('80–90% widocznych oznak starzenia skóry to efekt słońca, nie czasu. Zdecydowana większość jest do zatrzymania lub odwrócenia.'),

      h2('Składniki, które naprawdę działają po 40'),
      h3('Retinol lub retinaldehyd — absolutna podstawa'),
      pb(
        { t: 'Najlepiej przebadany składnik anti-aging. Przyspiesza odnowę komórkową, stymuluje kolagen, wygładza zmarszczki. Po 40. roku życia warto rozważyć ' },
        { t: 'przejście na wyższe stężenia lub recepty na tretynoinę', b: true },
        { t: ' — po konsultacji z dermatologiem lub kosmetologiem.' },
      ),
      h3('Peptydy — sygnały dla fibroblastów'),
      p(
        'Peptydy to krótkie łańcuchy aminokwasów, które "naśladują" fragmenty kolagenu i sygnalizują skórze, że powinna go produkować więcej. Dobrze tolerowane, można łączyć z niemal każdym składnikiem.',
      ),
      h3('Kwas hialuronowy — nawilżenie w warstwie i głębiej'),
      p(
        'W kremie nawilża powierzchnię. W zabiegu (skinboosters) — sięga warstwy skóry właściwej. Po 40. różnica między tymi dwoma poziomami działania staje się bardzo wyraźna.',
      ),
      h3('Witamina C rano, retinol wieczorem — klasyk z powodu'),
      p(
        'Witamina C to antyoksydant neutralizujący wolne rodniki (główna przyczyna photoagingu) i stymulator syntezy kolagenu. Rano chroni, wieczorem retinol naprawia. To dwa filary nowoczesnej pielęgnacji anti-aging.',
      ),
      img('Kosmetolog przeprowadzający konsultację z klientką po 40 — diagnoza skóry lampą, spokojny klimat gabinetu'),

      h2('Które zabiegi gabinetowe warto wybrać?'),
      ul(
        'Skinboosters / mezoterapia hialuronowa — głębokie nawilżenie i regeneracja tkanki',
        'Dermapen z cocktailami peptydowymi — stymulacja kolagenu, poprawa tekstury',
        'Masaż Kobido — naturalny lifting i drenaż bez igieł',
        'Peeling TCA lub retinoidowy — redukcja przebarwień i drobnych zmarszczek',
        'Fototerapia LED — anti-aging bez przestoju, idealne jako uzupełnienie innych zabiegów',
      ),

      h2('Czy drogi krem jest lepszy od taniego?'),
      pb(
        { t: 'Niekoniecznie. Kluczowe są ' },
        { t: 'składniki aktywne i ich stężenie', b: true },
        { t: ', nie cena ani opakowanie. Warto czytać skład (INCI). Z drugiej strony — żaden krem nie dotrze tam, gdzie dotrze zabieg gabinetowy. Najlepsze efekty daje połączenie dobrej pielęgnacji domowej z regularnymi wizytami u kosmetologa.' },
      ),

      h2('Gabinet BeautyBeskid w Limanowej — pielęgnacja dojrzałej skóry'),
      p(
        'Przyjmujemy klientki z Nowego Sącza, Mszany Dolnej, Słopnic i całego regionu. Podczas konsultacji oceniamy stan skóry i układamy plan — zarówno zabiegowy, jak i domowej pielęgnacji. Umów się online.',
      ),
    ),
  },

  // ── 13. KWAS HIALURONOWY ─────────────────────────────────────────────────
  {
    slug: 'kwas-hialuronowy-nawilzenie-skory-co-warto-wiedziec',
    category: 'Pielęgnacja skóry',
    title: 'Kwas hialuronowy — dlaczego jedno serum to za mało?',
    metaTitle: 'Kwas hialuronowy Limanowa — Salon BeautyBeskid | Nawilżanie skóry zabiegi i kosmetyki',
    metaDescription:
      'Kwas hialuronowy w pielęgnacji i zabiegach gabinetowych — co wybrać i jak działa? Gabinet BeautyBeskid w Limanowej wyjaśnia i oferuje zabiegi hialuronowe dla klientek z całego powiatu.',
    excerpt:
      'Kwas hialuronowy jest w każdym drugim kosmetyku. Ale większość z nas stosuje go źle — na suchą skórę, bez uszczelnienia kremem, w zbyt małej ilości. Wyjaśniamy, jak naprawdę działa.',
    readingTime: 4,
    tags: ['kwas hialuronowy', 'nawilżanie skóry', 'hyaluron', 'pielęgnacja', 'kosmetologia'],
    content: doc(
      p(
        'Jeden gram kwasu hialuronowego wiąże do sześciu litrów wody. To nie jest marketingowa obietnica — to zmierzony fakt biochemiczny. Kwas hialuronowy jest naturalnie obecny w naszym ciele: w skórze, stawach, gałce ocznej. W skórze 25-latki jest go w bród. W skórze 45-latki — znacznie mniej. I właśnie tu zaczyna się rola kosmetologii.',
      ),
      img('Zbliżenie na nałożoną kroplę serum z kwasem hialuronowym na skórze dłoni — widoczna żelowa konsystencja preparatu'),

      h2('Nie wszystkie kwasy hialuronowe są takie same'),
      h3('Wysokocząsteczkowy — film ochronny na powierzchni'),
      pb(
        { t: 'Duże cząsteczki kwasu hialuronowego (>1000 kDa) ' },
        { t: 'nie wnikają w skórę', b: true },
        { t: ' — tworzą na niej film nawilżający, który zmniejsza utratę wody przez naskórek (TEWL). Efekt: natychmiastowa gładkość i miękkość w dotyku.' },
      ),
      h3('Niskocząsteczkowy — nawilżenie głębszych warstw'),
      pb(
        { t: 'Małe cząsteczki (<50 kDa) wnikają w naskórek, nawilżając ' },
        { t: 'wewnętrzne warstwy skóry', b: true },
        { t: '. Efekt pojawia się wolniej, ale jest trwalszy.' },
      ),
      h3('Zabiegi iniekcyjne — działanie w skórze właściwej'),
      p(
        'Skinboosters i mezoterapia hialuronowa to zupełnie inny poziom — kwas hialuronowy trafia bezpośrednio tam, gdzie jego poziom spada, czyli do skóry właściwej. Żadne serum tego nie zastąpi.',
      ),
      quote('Kwas hialuronowy w kremie nawilża skórę od zewnątrz. Kwas hialuronowy w zabiegu — nawilża ją od wewnątrz. To fundamentalna różnica w głębokości działania.'),

      h2('Najczęstszy błąd — stosowanie na suchą skórę'),
      pb(
        { t: 'Niskocząsteczkowy kwas hialuronowy nałożony na suchą skórę w suchym powietrzu może ' },
        { t: 'wyciągać wodę z głębszych warstw skóry na powierzchnię', b: true },
        { t: ' — efekt odwrotny do zamierzonego. Prawidłowo: serum nanosimy na skórę opryskną wodą termalną lub bezpośrednio po umyciu twarzy (kiedy jest jeszcze lekko wilgotna). Zawsze uszczelniamy kremem nawilżającym.' },
      ),

      h2('Jak wybrać dobre serum z kwasem hialuronowym?'),
      ul(
        'Szukaj produktów zawierających kilka form HA (zarówno wysoko-, jak i niskocząsteczkowy) — działają synergicznie',
        'Unikaj produktów z alkoholem denaturowanym w pierwszych 5 składnikach — wysusza skórę i niweluje działanie HA',
        'Stężenie kwasu: 1–2% to efektywna dawka — więcej nie zawsze lepiej',
        'Skóra wrażliwa i trądzikowa: wybieraj formuły bez zapachów i olejków eterycznych',
      ),
      img('Kobieta nakłada serum z kwasem hialuronowym na wilgotną skórę twarzy — prawidłowa technika aplikacji na lekko zwilżoną cerę'),

      h2('Kiedy serum już nie wystarczy?'),
      pb(
        { t: 'Jeśli skóra jest ' },
        { t: 'głęboko odwodniona, ma wyraźne zmarszczki lub widoczną utratę objętości', b: true },
        { t: ' — żadne serum tego nie naprawi. Tu potrzebne są zabiegi gabinetowe: mezoterapia hialuronowa lub skinboosters, które działają na poziomie tkanki, nie naskórka.' },
      ),

      h2('Gabinet BeautyBeskid w Limanowej — mezoterapia i skinboosters'),
      p(
        'Wykonujemy zabiegi hialuronowe dla klientek z Łososiny Dolnej, Ujanowic, Jodłownika i całego powiatu. Konsultacja kosmetologiczna poprzedza każdy zabieg. Zarezerwuj termin online.',
      ),
    ),
  },

  // ── 14. TRENDY PAZNOKCIE 2025 ────────────────────────────────────────────
  {
    slug: 'trendy-paznokcie-stylizacja-2025-limanowa',
    category: 'Paznokcie',
    title: 'Paznokcie 2025 — 5 trendów, które warto znać przed następną wizytą',
    metaTitle: 'Modne paznokcie 2025 Limanowa — Salon BeautyBeskid | Stylizacja i wzory paznokci',
    metaDescription:
      'Jakie wzory i kolory paznokci są modne w 2025 roku? Salon BeautyBeskid w Limanowej śledzi trendy i oferuje najnowsze stylizacje dla klientek z Tymbarku, Dobrej i okolic.',
    excerpt:
      'Chrome, aura nails, glazed donut, minimalizm i boxy shape — trendy w paznokciach 2025 roku. Jeden z nich zaskakuje prostotą, inny wymaga precyzji i doświadczenia stylisty.',
    readingTime: 4,
    tags: ['paznokcie', 'trendy 2025', 'nail art', 'stylizacja paznokci', 'limanowa'],
    content: doc(
      p(
        'Trendy w paznokciach zmieniają się sezonowo — ale są też style, które trwają dłużej niż jeden TikTok. W 2025 roku mamy do czynienia z ciekawym napięciem: z jednej strony efektowne, błyszczące wykończenia, z drugiej — estetyka "jakby nic", czyli paznokcie, które wyglądają pięknie właśnie dlatego, że sprawiają wrażenie zadbanych naturalnościach.',
      ),
      img('Dłonie kobiety z czterema różnymi stylizacjami paznokci ułożone obok siebie — chrome, aura nails, nude i glazed donut'),

      h2('1. Chrome — lustrzany blask, który nie wychodzi z mody'),
      pb(
        { t: 'Efekt chromu to metaliczne, błyszczące wykończenie uzyskiwane przez wcieranie specjalnego proszku w świeżo utwardzony żel. W 2025 roku chrome ' },
        { t: 'łączy się z gradientem', b: true },
        { t: ' — baza jest stonowana (nude, mleczna biel), a efekt lustrzany pojawia się tylko na końcówce paznokcia. Luksusowy wygląd, który pasuje i do formalnej stylizacji, i do codziennych jeansów.' },
      ),
      img('Zbliżenie na dłonie z paznokciami w efekcie chrome — błyszczący, lustrzany gradient w odcieniu różowego złota'),

      h2('2. Aura nails — rozmyty blask, który wygląda jak magia'),
      p(
        'Ten trend zrodził się na TikToku i szybko trafił do salonów. Na neutralnej bazie maluje się miękkimi ruchami pędzla rozmytą "aurę" — jakby paznokieć emanował delikatnym, kolorowym światłem. Efekt romantyczny, bardzo fotogeniczny. Sprawdza się na każdej długości.',
      ),

      h2('3. Glazed Donut — szlachetny połysk Hailey Bieber'),
      pb(
        { t: 'Zaproponowane przez Hailey Bieber "glazed donut nails" to ' },
        { t: 'mleczno-perłowe wykończenie', b: true },
        { t: ' — paznokcie w kolorze szkliwa pączka, z delikatnym, perłowym połyskiem. Subtelne, eleganckie, uniwersalne. Jeden z tych trendów, który sprawdza się zarówno w biurze, jak i na weselu.' },
      ),

      h2('4. Minimalizm i "quiet luxury nails"'),
      p(
        'Kontra dla efektownych chrome\'ów. Stonowane odcienie: nude, mleczna biel, jedwabisty beż, delikatny szary. Zdobienie — jeśli w ogóle — to jedna cienka linia lub jednobarwna kropka. Paznokcie, które wyglądają jak zadbane, a nie jak wykonane. Trend wyrastający wprost z estetyki "quiet luxury" — dyskretnego, bezkompromisowego gustu.',
      ),

      h2('5. Kształty paznokci na czasie w 2025'),
      ul(
        'Soft square — kwadratowy z lekko zaokrąglonymi krawędziami; praktyczny, znosi codzienny stres',
        'Almond — migdałowy, smukły; wizualnie wydłuża palce; bardzo kobiecy i elegancki',
        'Lipstick (szminki) — asymetryczny kształt z jedną ukośną krawędzią; odważny, dla chcących się wyróżnić',
        'Oval — ponadczasowy klasyk, który nigdy nie wychodzi z mody',
      ),
      img('Cztery dłonie pokazujące różne kształty paznokci — soft square, almond, oval i lipstick shape obok siebie'),

      h2('Zdrowe paznokcie jako fundament każdej stylizacji'),
      pb(
        { t: 'Zanim skupisz się na wzorach, upewnij się, że Twoje naturalne paznokcie są w dobrej kondycji. ' },
        { t: 'Łamliwe, kruche paznokcie z białymi plamkami', b: true },
        { t: ' to sygnał niedoborów lub uszkodzenia płytki. Regularny olejek do skórek, rękawiczki przy pracach domowych i przerwy od hybryd to prosta profilaktyka.' },
      ),

      h2('Salon BeautyBeskid w Limanowej — śledzimy trendy na bieżąco'),
      p(
        'Przyjmujemy klientki z Tymbarku, Dobrej, Łososiny Dolnej i całego powiatu. Zapytaj nas o chrome, aura nails lub glazed donut — dobierzemy stylizację do Twoich rąk i gustu. Rezerwacja online.',
      ),
    ),
  },

  // ── 15. SPF ───────────────────────────────────────────────────────────────
  {
    slug: 'krem-z-filtrem-spf-codzienna-pielegnacja-dlaczego-wazny',
    category: 'Pielęgnacja skóry',
    title: 'Krem z filtrem — jedyny kosmetyk, którego naprawdę nie można pominąć',
    metaTitle: 'Krem SPF filtr UV pielęgnacja — Salon BeautyBeskid Limanowa | Ochrona przeciwsłoneczna',
    metaDescription:
      'Dlaczego krem z filtrem SPF to najważniejszy kosmetyk w pielęgnacji twarzy? Gabinet BeautyBeskid w Limanowej tłumaczy i poleca produkty dla klientek z Mszany Dolnej, Nowego Sącza i okolic.',
    excerpt:
      'Możesz stosować najdroższe serum z witaminą C i retinol za 200 złotych — ale jeśli nie nakładasz filtru, większość tej pracy idzie na marne. SPF to fundament, nie dodatek.',
    readingTime: 4,
    tags: ['SPF', 'filtr UV', 'ochrona przeciwsłoneczna', 'pielęgnacja', 'photoaging'],
    content: doc(
      p(
        'Gdybym miała wybrać tylko jeden kosmetyk do codziennej pielęgnacji twarzy, bez zastanowienia wybrałabym krem z filtrem. Nie żadne super serum z peptydami. Nie drogocenny krem z retinolem. Filtr. I to nie jest przesada: badania szacują, że 80–90% widocznych oznak starzenia skóry — zmarszczki, przebarwienia, utrata elastyczności — jest powodowana promieniowaniem UV, a nie samym upływem czasu.',
      ),
      img('Kobieta nakładająca krem z filtrem na twarz w słoneczny dzień — uśmiechnięta, zdrowa i promienna skóra'),

      h2('UVA, UVB — co nas starzeje, a co parzy?'),
      h3('UVA — niewidzialne, ale stale obecne'),
      pb(
        { t: 'Długie fale UVA (315–400 nm) przechodzą przez chmury, szyby samochodów i okien. ' },
        { t: 'Są obecne przez cały rok', b: true },
        { t: ', niezależnie od pory roku i pogody. Wnikają w skórę właściwą i odpowiadają za photoaging: zmarszczki, przebarwienia, utratę elastyczności.' },
      ),
      h3('UVB — sezonowe, ale bezlitosne'),
      p(
        'Krótkie fale UVB (280–315 nm) powodują oparzenia słoneczne. Intensywność zależy od pory roku i godziny dnia — najsilniejsze między 10:00 a 14:00. Odpowiadają za raka skóry.',
      ),
      quote('Filtr "broad spectrum" chroni przed obiema formami. Bez tego oznaczenia chronisz się tylko przed oparzeniem — a nie przed starzeniem.'),

      h2('SPF 15, 30, 50 — jaki wybrać?'),
      pb(
        { t: 'SPF 30 blokuje ok. 97% promieni UVB. SPF 50 — ok. 98%. Różnica wydaje się mała, ale ' },
        { t: 'w długoterminowej perspektywie ma znaczenie', b: true },
        { t: '. Do codziennego stosowania: minimum SPF 30, rekomendowane SPF 50. Jeśli jesteś po zabiegu kosmetologicznym (peeling, dermapen, laser) — SPF 50 przez minimum tydzień to obowiązek.' },
      ),

      h2('Chemiczny czy mineralny — skąd ta różnica?'),
      h3('Filtry chemiczne'),
      p(
        'Wchłaniają promieniowanie UV i zamieniają je w ciepło. Lekkie, niewidoczne na skórze, dobrze tolerowane przez większość cer. Idealne do codziennego noszenia pod makijaż.',
      ),
      h3('Filtry mineralne (fizyczne)'),
      pb(
        { t: 'Dwutlenek tytanu i tlenek cynku ' },
        { t: 'odbijają promieniowanie jak lustro', b: true },
        { t: '. Bezpieczniejsze dla skóry bardzo wrażliwej i alergicznej, a także w ciąży. Starsze formuły zostawiają biały osad — nowe wersje nanominerałów są już znacznie bardziej niewidoczne.' },
      ),
      img('Różne produkty z filtrem SPF rozłożone na białym tle — fluid, krem, spray i balsam z widocznymi oznaczeniami SPF'),

      h2('Jak i kiedy nakładać filtr?'),
      ol(
        'Ostatni krok porannej pielęgnacji — po serum i nawilżaczu, przed podkładem',
        'Na twarz, szyję i dekolt — codziennie, nawet przy zachmurzeniu',
        'Odpowiednia ilość: ok. 1/4 łyżeczki na twarz — większość osób nanosi za mało',
        'Ponowna aplikacja co 2 godziny przy przebywaniu na zewnątrz',
        'Filtry chemiczne nakładaj 20–30 minut przed wyjściem na słońce',
      ),

      h2('Gabinet BeautyBeskid w Limanowej — dobieramy filtr do Twojego rodzaju cery'),
      p(
        'Lekki fluid dla cery tłustej, bogaty krem dla suchej, mineralny dla wrażliwej i z rosacea — na konsultacji pomożemy Ci wybrać produkt, który będziesz chciała stosować każdego dnia. Zapraszamy klientki z Mszany Dolnej, Nowego Sącza i całego regionu. Umów wizytę online.',
      ),
    ),
  },

  // ── 16. OCZYSZCZANIE TWARZY ──────────────────────────────────────────────
  {
    slug: 'oczyszczanie-twarzy-zabieg-hydrabrazja-kawitacja-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Oczyszczanie twarzy w gabinecie — kiedy domowa pielęgnacja przestaje wystarczać',
    metaTitle: 'Oczyszczanie twarzy Limanowa — Salon BeautyBeskid | Hydrabrazja i kawitacja',
    metaDescription:
      'Głębokie oczyszczanie twarzy w Limanowej — hydrabrazja, kawitacja, usuwanie zaskórników. Salon BeautyBeskid oferuje profesjonalne zabiegi oczyszczające dla klientek z Laskowej, Mordarki i powiatu.',
    excerpt:
      'Żel myjący dociera do powierzchni skóry. Kawitacja i hydrabrazja — do wnętrza porów. Jeśli masz zaskórniki, które wracają co miesiąc mimo starannego oczyszczania w domu, to właśnie o to chodzi.',
    readingTime: 5,
    tags: ['oczyszczanie twarzy', 'hydrabrazja', 'kawitacja', 'zaskórniki', 'limanowa'],
    content: doc(
      p(
        'Każdego wieczoru myjesz twarz, stosujesz tonik, nakładasz serum. I mimo to — te same zaskórniki na nosie, ta sama szarawość w okolicach brody. Nie robisz nic źle. Po prostu domowe oczyszczanie ma granice. Pory — szczególnie na strefie T — zbierają zanieczyszczenia głębiej, niż sięga jakikolwiek żel do mycia. Gabinetowe zabiegi oczyszczające działają tam, gdzie kosmetyki domowe nie mają wstępu.',
      ),
      img('Kosmetolog przykłada głowicę hydrabrazji do twarzy klientki — delikatny strumień wody przy skórze policzka'),

      h2('Hydrabrazja — oczyszczanie i nawilżanie jednocześnie'),
      pb(
        { t: 'Hydrabrazja (aquapeeling) to zabieg, który łączy mechaniczne złuszczanie z ' },
        { t: 'jednoczesnym nawilżaniem', b: true },
        { t: '. Specjalna głowica tworzy wir wodny, który ściąga martwy naskórek i zanieczyszczenia z porów, jednocześnie infuzując skórę serum nawilżającym lub oczyszczającym.' },
      ),
      quote('Hydrabrazja to jeden z niewielu zabiegów, po których możesz wyjść z gabinetu bez zaróżowienia i "okresu gojenia" — skóra jest od razu czysta, gładka i promienna.'),

      h2('Kawitacja ultradźwiękowa — głęboko, bez tarcia'),
      p(
        'Kawitacja używa fal ultradźwiękowych do rozluźniania łoju i zanieczyszczeń w porach. Mikropęcherzyki tworzone przez ultradźwięki "implodują" w porach, wypychając sebum i resztki makijażu. Następnie zwężona głowica pomaga je usunąć. Zabieg jest delikatny, nie powoduje zaczerwienienia — świetnie sprawdza się przy cerze tłustej z rozszerzonymi porami.',
      ),
      img('Twarz kobiety po zabiegu głębokiego oczyszczania — widoczna gładka, czysta skóra bez zaskórników, zrelaksowany wyraz twarzy'),

      h2('Który zabieg dla jakiej cery?'),
      ul(
        'Cera tłusta i mieszana z dużymi porami — kawitacja + manualne oczyszczanie zaskórników przez specjalistę',
        'Cera odwodniona z zanieczyszczeniami — hydrabrazja, która oczyszcza i nawilża jednocześnie',
        'Cera wrażliwa — peeling enzymatyczny + łagodna maska enzymatyczna bez ścierniwa',
        'Cera trądzikowa aktywna — kawitacja + fototerapia LED niebieskim światłem po zabiegu',
      ),

      h2('Dlaczego warto oczyszczać twarz regularnie — nie tylko kiedy "coś się dzieje"'),
      pb(
        { t: 'Raz na 4–6 tygodni to optimum dla większości cer. Przy cerze tłustej — co 3–4 tygodnie. ' },
        { t: 'Regularne wizyty zapobiegają tworzeniu się głębszych zaskórników', b: true },
        { t: ', które są znacznie trudniejsze do usunięcia i mogą zostawić przebarwienia. Profilaktyka jest zawsze łatwiejsza niż leczenie.' },
      ),

      h2('Co dzieje się ze skórą po zabiegu?'),
      ul(
        'Bezpośrednio po: skóra jest czysta, gładka, promienna — gotowa do wchłaniania kosmetyków',
        'Przez 24h: unikaj aktywnych składników (kwasów, retinolu) — skóra potrzebuje spokoju',
        'Przez tydzień: filtr SPF każdego ranka — świeżo oczyszczona skóra jest wrażliwsza na UV',
      ),

      h2('Gabinet BeautyBeskid w Limanowej'),
      p(
        'Przyjmujemy klientki z Laskowej, Mordarki, Jodłownika i całego powiatu limanowskiego. Dobieramy metodę oczyszczania indywidualnie do Twojego rodzaju cery. Zarezerwuj termin online.',
      ),
    ),
  },

  // ── 17. CERA TŁUSTA I PORY ───────────────────────────────────────────────
  {
    slug: 'pielegnacja-skory-tlustej-rozszerzone-pory-porady',
    category: 'Pielęgnacja skóry',
    title: 'Cera tłusta — dlaczego im bardziej ją suszysz, tym bardziej się przetłuszcza?',
    metaTitle: 'Cera tłusta rozszerzone pory — Salon BeautyBeskid Limanowa | Pielęgnacja i zabiegi',
    metaDescription:
      'Jak pielęgnować cerę tłustą i zmniejszyć rozszerzone pory? Gabinet BeautyBeskid w Limanowej oferuje zabiegi dla skóry tłustej i trądzikowej dla klientek z Tymbarku, Słopnic i okolic.',
    excerpt:
      'Błyszcząca T-strefa, zaskórniki co miesiąc, makijaż zsuwający się po południu. I do tego mit, że cera tłusta "sama się nawilża", przez co wielu osób pomija nawilżanie. To błąd, który pogłębia problem.',
    readingTime: 5,
    tags: ['cera tłusta', 'rozszerzone pory', 'sebum', 'pielęgnacja', 'kosmetologia'],
    content: doc(
      p(
        'Skóra tłusta bywa uciążliwa. Ale jest jedna dobra wiadomość, o której mówi się za rzadko: cera tłusta starzeje się wyraźnie wolniej niż sucha. Sebum, w odpowiednich ilościach, jest naturalnym nawilżaczem i ochroną bariery. Problem zaczyna się wtedy, gdy gruczołów łojowych pracuje zbyt intensywnie — i tu zaczyna się wiele błędów pielęgnacyjnych.',
      ),
      img('Zbliżenie na skórę twarzy z widocznymi rozszerzonymi porami na nosie i policzkach — fotografia diagnostyczna'),

      h2('Paradoks cerytłustej — dlaczego suszenie nasila przetłuszczanie?'),
      pb(
        { t: 'Kiedy agresywnie suszysz cerę alkoholem, mocnymi żelami myjącymi i pomijasz nawilżanie — skóra ' },
        { t: 'odczyta to jako sygnał niedoboru i wyprodukuje jeszcze więcej sebum', b: true },
        { t: ' w ramach obrony. To samonapędzający się mechanizm: im bardziej suszysz, tym bardziej się przetłuszcza. Wyjście? Nawilżać, łagodzić, regulować — nie eliminować.' },
      ),
      quote('Cera tłusta potrzebuje nawilżenia tak samo jak sucha — tylko innego rodzaju kosmetyków. Pomijanie nawilżacza to jeden z najczęstszych błędów pielęgnacyjnych.'),

      h2('Co naprawdę działa?'),
      h3('Kwas salicylowy (BHA)'),
      pb(
        { t: 'Lipofilny — rozpuszcza się w tłuszczach, wnika w por i ' },
        { t: 'oczyszcza go od środka', b: true },
        { t: '. Stosuj wieczornie w tonerze, serum lub żelu myjącym. Jeden z najlepiej udokumentowanych składników przy cerze tłustej.' },
      ),
      h3('Niacynamid'),
      pb(
        { t: 'Witamina B3 — ' },
        { t: 'reguluje produkcję sebum, zacieśnia pory, działa przeciwzapalnie', b: true },
        { t: '. Można łączyć z prawie każdym składnikiem aktywnym. Jeden z najbezpieczniejszych wyborów dla cery tłustej.' },
      ),
      h3('Lekki nawilżacz — niekomedogenny'),
      p(
        'Żele, fluidy, serum z kwasem hialuronowym — lekkie formuły nawilżają bez tłustego uczucia i bez zapychania porów. Szukaj oznaczeń "non-comedogenic" lub "oil-free".',
      ),
      h3('Filtr SPF w lekkim fluide'),
      p(
        'Wiele osób z cerą tłustą pomija SPF, bo "i tak się przetłuszcza". To błąd — przetłuszczanie i photoaging to dwa różne problemy. Lekki fluid SPF 50 rozwiązuje obydwa jednocześnie.',
      ),
      img('Porównanie skóry twarzy w T-strefie przed i po 8 tygodniach właściwej pielęgnacji — wyraźnie mniejsze błyszczenie i mniej widoczne pory'),

      h2('Czego unikać?'),
      ul(
        'Alkohol denaturowany w wysokim stężeniu — chwilowo zmniejsza przetłuszczanie, długoterminowo niszczy barierę i wzmaga seboprodukcję',
        'Zbyt agresywne mycie kilka razy dziennie — podrażnia skórę, uruchamia mechanizm obronny',
        'Ciężkie kremy z olejami nasyconymi (olej kokosowy, masło kakaowe) — typowo komedogenne',
        'Pomijanie nawilżania — mit "cera tłusta się sama nawilża" szkodzi skórze bardziej niż jej pomaga',
      ),

      h2('Zabiegi gabinetowe dla cery tłustej'),
      ul(
        'Kawitacja ultradźwiękowa — głębsze oczyszczenie porów bez podrażniania',
        'Peeling z kwasem salicylowym — normalizuje keratynizację, zmniejsza seboprodukcję',
        'Fototerapia LED niebieska — niszczy bakterie trądzikowe, zmniejsza stany zapalne',
        'Dermapen z niacynamidem — wzmacnia ściany porów i ogranicza ich rozszerzanie w dłuższej perspektywie',
      ),

      h2('Gabinet BeautyBeskid w Limanowej — strategia dla Twojej cery'),
      p(
        'Przyjmujemy klientki z Tymbarku, Słopnic, Ujanowic i całego powiatu. Konsultacja + ocena cery + plan pielęgnacji — indywidualnie, nie według gotowego szablonu. Umów wizytę online.',
      ),
    ),
  },

  // ── 18. HENNA BRWI I RZĘS ───────────────────────────────────────────────
  {
    slug: 'henna-brwi-rzes-naturalny-efekt-limanowa',
    category: 'Brwi i rzęsy',
    title: 'Henna brwi i rzęs — 30 minut w salonie, kilka tygodni bez makijażu',
    metaTitle: 'Henna brwi i rzęs Limanowa — Salon BeautyBeskid | Trwałe zabarwienie brwi rzęs',
    metaDescription:
      'Henna brwi i rzęs w Limanowej — ciemniejszy, wyraźniejszy kolor na 3–5 tygodni. Salon BeautyBeskid wykonuje zabarwienie brwi i rzęs dla klientek z Dobrej, Jodłownika i okolic.',
    excerpt:
      'Henna brwi to zabieg, który trwa pół godziny i eliminuje codzienne malowanie brwi przez kilka tygodni. Dla osób z jasnym owłosieniem — mała rewolucja w porannej rutynie.',
    readingTime: 4,
    tags: ['henna brwi', 'henna rzęs', 'barwienie brwi', 'kosmetologia', 'limanowa'],
    content: doc(
      p(
        'Jasne, ledwo widoczne brwi. Rzęsy, które bez tuszu praktycznie znikają w twarzy. Jeśli to brzmi znajomo — henna brwi i rzęs może okazać się jedną z lepszych decyzji pielęgnacyjnych, jakie podejmiesz. Krótki zabieg, wyraźny efekt, kilka tygodni spokoju od kredek i tuszy.',
      ),
      img('Zbliżenie na twarz kobiety z wyraźnie zarysowanymi brwiami po henie — naturalny kolor, widoczne wypełnienie i kontur'),

      h2('Henna brwi — jak działa i czym różni się od tyntu?'),
      h3('Henna — zabarwia włoski i skórę'),
      pb(
        { t: 'Henna (najczęściej mieszanka składników roślinnych i syntetycznych barwników w produktach do brwi) zabarwia zarówno włoski, jak i ' },
        { t: 'skórę pod nimi', b: true },
        { t: '. Efekt: brwi wyglądają "wypełnione", jakbyś je delikatnie zacienowała — nawet jeśli naturalnie masz rzadkie włoski. To kluczowa zaleta hennym nad tyntem.' },
      ),
      h3('Tinting (tint) — tylko włoski'),
      p(
        'Farby do brwi i rzęs (tint) barwią wyłącznie włoski — intensywniej i trwalej niż henna, ale bez efektu wypełnionego tła. Idealne jeśli masz już dostatecznie gęste brwi i chcesz tylko ciemniejszego, wyraźniejszego koloru.',
      ),
      quote('Proste pytanie: czy chcesz ciemniejszych włosków, czy wypełnionych brwi? Odpowiedź wskazuje, czy tint czy henna jest dla Ciebie.'),

      h2('Henna rzęs — ciemne, wyraźne rzęsy bez tuszu'),
      p(
        'Zabarwienie rzęs henną lub tyntem to ok. 15–20 minut w fotelu — i rzęsy wyglądają, jakbyś zawsze miała na nich delikatny tusz. Świetne dla osób z jasnym owłosieniem, które tracą dużo czasu na nakładanie i zdejmowanie tuszy. Efekt utrzymuje się 4–6 tygodni.',
      ),
      img('Oczy kobiety po hennie rzęs — zbliżenie na wyraźnie ciemniejsze, definowane rzęsy górne i dolne'),

      h2('Jak długo utrzymuje się henna brwi?'),
      ul(
        'Zabarwienie skóry pod brwiami: 1–2 tygodnie (cera tłusta — krócej, sucha — dłużej)',
        'Zabarwienie włosków brwiowych: 3–5 tygodni',
        'Tint do brwi i rzęs na włoskach: 4–6 tygodni',
        'Kosmetyki na bazie olejów i retinol stosowane w okolicach brwi mogą skrócić trwałość',
      ),

      h2('Henna a laminowanie brwi — można łączyć?'),
      pb(
        { t: 'Zdecydowanie tak — i to połączenie daje wyjątkowy efekt. ' },
        { t: 'Laminowanie układa i usztywnia włoski', b: true },
        { t: ', henna zabarwia je i skórę. Razem: idealnie ułożone i wyraźnie zabarwione brwi. W salonie BeautyBeskid możesz umówić oba zabiegi podczas jednej wizyty.' },
      ),

      h2('Salon BeautyBeskid w Limanowej — henna i tint dla klientek z całego powiatu'),
      p(
        'Wykonujemy henna brwi i rzęs oraz barwienie tyntem. Dobieramy odcień do naturalnego koloru włosów i karnacji. Przyjmujemy klientki z Dobrej, Jodłownika, Laskowej i okolic. Rezerwacja online — punktualna obsługa bez kolejek.',
      ),
    ),
  },

  // ── 19. CELLULIT ────────────────────────────────────────────────────────
  {
    slug: 'zabiegi-na-cellulit-co-naprawde-dziala-limanowa',
    category: 'Pielęgnacja ciała',
    title: 'Cellulit — co naprawdę działa, a co jest tylko ładnym opakowaniem obietnic?',
    metaTitle: 'Zabiegi na cellulit Limanowa — Salon BeautyBeskid | Skuteczna redukcja cellulitu',
    metaDescription:
      'Skuteczne zabiegi na cellulit w Limanowej — kawitacja, drenaż limfatyczny, masaż bańką. Gabinet BeautyBeskid przyjmuje klientki z Mszany Dolnej, Łososiny Dolnej i całego powiatu.',
    excerpt:
      'Cellulit dotyka ponad 85% kobiet — niezależnie od wagi i wieku. Rynek jest zalany kremami i suplementami obiecującymi cuda. Sprawdzamy, co faktycznie przynosi zmianę, a co tylko ją symuluje.',
    readingTime: 5,
    tags: ['cellulit', 'redukcja cellulitu', 'kawitacja', 'drenaż limfatyczny', 'limanowa'],
    content: doc(
      p(
        'Zacznijmy od rzeczy, które ważne: cellulit to nie choroba, nie kwestia nadwagi i nie efekt złej higieny. To strukturalny problem tkanki łącznej — i dotyczy większości kobiet, niezależnie od BMI. Warto to wiedzieć, zanim zainwestujesz w kolejny "krem antycellulitowy" za 80 złotych.',
      ),
      img('Udo kobiety z widocznym cellulitem — charakterystyczna struktura skórki pomarańczowej; zdjęcie edukacyjne przed zabiegiem'),

      h2('Dlaczego kobiety mają cellulit częściej niż mężczyźni?'),
      pb(
        { t: 'U kobiet komórki tłuszczowe są ułożone ' },
        { t: 'pionowo i wypychają w górę przez poziome przegrody kolagenu', b: true },
        { t: ' — tworząc charakterystyczne nierówności. U mężczyzn sieć kolagenu ma układ siatkowaty, który trzyma komórki w miejscu. Do tego estrogen wpływa na retencję wody i rozmieszczenie tkanki tłuszczowej. Cellulit u szczupłej kobiety jest biologicznie normalny.' },
      ),
      quote('Cellulit nie jest problemem estetycznym do "naprawienia" — jest anatomiczną cechą żeńskiej tkanki łącznej. Można go jednak wyraźnie zmniejszyć.'),

      h2('Co naprawdę redukuje cellulit?'),
      h3('Drenaż limfatyczny'),
      pb(
        { t: 'Manualny lub aparaturowy. Zmniejsza ' },
        { t: 'retencję wody w tkance', b: true },
        { t: ' — jedna z głównych przyczyn nasilenia cellulitu. Wygładza skórę, poprawia mikrokrążenie. Wymaga regularności: efekty widoczne po serii 6–10 sesji.' },
      ),
      h3('Kawitacja ultradźwiękowa'),
      p(
        'Mikropęcherzyki ultradźwiękowe implodują w komórkach tłuszczowych, rozbijając je mechanicznie. Uwolnione lipidy są następnie metabolizowane przez organizm. Efekty widoczne po serii 6–10 zabiegów w połączeniu z nawodnieniem i aktywnością fizyczną.',
      ),
      h3('Masaż bańką (vacuum massage)'),
      p(
        'Mechanicznie rozbija skupiska tkanki tłuszczowej, stymuluje krążenie i produkcję kolagenu. Chwilowo intensyfikuje wygląd skóry po zabiegu — i stopniowo, po serii, poprawia jej strukturę.',
      ),
      img('Udo kobiety przed i po serii zabiegów anti-cellulit — wyraźnie zmniejszona skórka pomarańczowa i bardziej jednolita struktura skóry'),

      h2('Co NIE działa — mimo pięknych opisów'),
      pb(
        { t: 'Kremy antycellulitowe działają ' },
        { t: 'powierzchownie i chwilowo', b: true },
        { t: '. Kofeina i L-karnityna poprawiają mikrokrążenie i nieznacznie napinają skórę — efekt trwa kilka godzin po nałożeniu. To kosmetyczny "efekt wizualny", nie redukcja cellulitu. Samodzielne stosowanie kremów bez innych metod nie zmieni struktury tkanki łącznej.' },
      ),

      h2('Fundament, którego nie zastąpi żaden zabieg'),
      ul(
        'Nawodnienie: minimum 2 litry wody dziennie zmniejszają retencję i poprawiają elastyczność skóry',
        'Ograniczenie soli: sól zatrzymuje wodę w tkankach i nasila wygląd cellulitu',
        'Aktywność fizyczna: trening siłowy i cardio poprawiają krążenie i wzmacniają tkankę łączną',
        'Zabiegi kosmetologiczne działają najlepiej jako uzupełnienie, nie zamiast zdrowego trybu życia',
      ),

      h2('Gabinet BeautyBeskid w Limanowej — kompleksowy program anti-cellulit'),
      p(
        'Oferujemy drenaż limfatyczny, kawitację i masaż bańką dla klientek z Mszany Dolnej, Łososiny Dolnej, Tymbarku i całego powiatu. Dobieramy plan indywidualnie do stopnia nasilenia cellulitu. Umów wizytę online.',
      ),
    ),
  },

  // ── 20. KARBOKSYTERAPIA ──────────────────────────────────────────────────
  {
    slug: 'karboksyterapia-co2-zastosowanie-efekty-limanowa',
    category: 'Zabiegi na twarz',
    title: 'Karboksyterapia — jak CO₂ podbija świat kosmetologii',
    metaTitle: 'Karboksyterapia Limanowa — Gabinet BeautyBeskid | CO2 twarz cellulit rozstępy',
    metaDescription:
      'Karboksyterapia w Limanowej — zabiegi CO2 na twarz, cellulit i rozstępy. Gabinet BeautyBeskid przyjmuje klientki z Kasiny Wielkiej, Ujanowic i całego powiatu limanowskiego.',
    excerpt:
      'Dwutlenek węgla pod skórą brzmi niepokojąco — dopóki nie zobaczysz efektów. Karboksyterapia to jeden z niewielu zabiegów, który jednocześnie odmładza twarz, redukuje cellulit i poprawia wygląd rozstępów.',
    readingTime: 5,
    tags: ['karboksyterapia', 'CO2', 'odmładzanie', 'rozstępy', 'limanowa'],
    content: doc(
      p(
        'W latach 30. XX wieku we francuskim uzdrowisku Royat lekarze odkryli, że kąpiele w wodzie bogatej w CO₂ mają wyjątkowy wpływ na ukrwienie tkanek. Kilkadziesiąt lat później medycyna estetyczna przejęła ten mechanizm i zamknęła go w igłach o grubości włosa. Tak narodziła się karboksyterapia — jeden z bardziej fascynujących zabiegów w nowoczesnej kosmetologii.',
      ),
      img('Kosmetolog wykonujący karboksyterapię na twarzy klientki — cienka igła przy skórze, profesjonalne warunki gabinetu'),

      h2('Mechanizm działania — efekt Bohra w służbie urody'),
      pb(
        { t: 'Kiedy CO₂ zostaje podane pod skórę, organizm interpretuje to jako ' },
        { t: 'lokalny niedobór tlenu', b: true },
        { t: '. Natychmiastowa reakcja: rozszerzenie naczyń krwionośnych, zwiększony przepływ krwi, intensywniejsze dotlenienie tkanki. To tzw. efekt Bohra — ta sama reakcja, która zachodzi w mięśniach podczas intensywnego wysiłku. Powtarzane sesje budują nowe naczynia krwionośne i stymulują produkcję kolagenu.' },
      ),
      quote('Karboksyterapia nie wprowadza do organizmu nic obcego. CO₂ jest naturalnym produktem metabolizmu — organizm doskonale wie, co z nim zrobić.'),

      h2('Gdzie i na co pomaga karboksyterapia?'),
      h3('Cienie i opuchlizna pod oczami'),
      pb(
        { t: 'To obszar, gdzie karboksyterapia jest ' },
        { t: 'wyjątkowo skuteczna', b: true },
        { t: '. Cienie pod oczami często wynikają z zastoju mikrokrążenia — CO₂ go rozrusza. Wyraźna poprawa po 4–6 sesjach.' },
      ),
      h3('Ogólne odmłodzenie twarzy'),
      p(
        'Lepsza trofika tkanek przekłada się na poprawę napięcia skóry i kolorytu. Efekt subtelniejszy niż przy fillerach, ale całkowicie naturalny i trwały po ukończeniu serii.',
      ),
      h3('Cellulit'),
      p(
        'Poprawa mikrokrążenia i rozbicie skupisk tłuszczowych — karboksyterapia działa tu podwójnie. Przy regularnych sesjach widoczne zmniejszenie "skórki pomarańczowej".',
      ),
      h3('Rozstępy'),
      pb(
        { t: 'Stymulacja kolagenu w bliznach rozstępowych poprawia ich wygląd — szczególnie ' },
        { t: 'świeże, różowe rozstępy reagują lepiej niż stare białe', b: true },
        { t: ', choć poprawa jest możliwa w obu przypadkach.' },
      ),
      img('Skóra pod oczami kobiety przed i po karboksyterapii — wyraźnie zredukowane cienie i opuchlizna, skóra bardziej napięta'),

      h2('Czy to boli?'),
      p(
        'Pod oczami i na twarzy — odczucia łagodne: lekki ucisk lub chwilowe pieczenie podczas podania, ustępujące w ciągu minut. Na ciele, przy leczeniu cellulitu i rozstępów, możliwe jest uczucie rozrywania pod skórą — mija po kilku minutach. Większość klientek dobrze toleruje zabieg.',
      ),

      h2('Ile sesji i jak szybko widać efekty?'),
      ol(
        'Twarz: 6–10 sesji co tydzień; pierwsze efekty po 4–5 sesjach',
        'Cellulit i rozstępy: 10–15 sesji zależnie od nasilenia problemu',
        'Pełny efekt: 2–3 miesiące po zakończeniu cyklu — kolagen "dojrzewa" stopniowo',
        'Sesja uzupełniająca co 3–6 miesięcy podtrzymuje wyniki',
      ),

      h2('Karboksyterapia w gabinecie BeautyBeskid w Limanowej'),
      p(
        'Przyjmujemy klientki z Kasiny Wielkiej, Ujanowic, Słopnic i całego powiatu limanowskiego. Z Kasiny Wielkiej dojazd to ok. 20 minut, z Ujanowic — ok. 15 minut. Zarezerwuj wizytę online i odkryj, co CO₂ może zrobić dla Twojej skóry.',
      ),
    ),
  },

];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding kosmetologia blog posts (part 2: articles 11–20)...');

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

  console.log(`\nSeeded ${articles.length} blog posts (part 2) successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

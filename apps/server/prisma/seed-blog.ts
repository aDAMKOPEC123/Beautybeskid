import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TipTap JSON helpers
const h2 = (text: string) => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
});

const p = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const ul = (...items: string[]) => ({
  type: 'bulletList',
  content: items.map((item) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
  })),
});

const doc = (...content: object[]) =>
  JSON.stringify({ type: 'doc', content });

// ---------------------------------------------------------------------------

const articles = [
  // ─── 1. Podolog ──────────────────────────────────────────────────────────
  {
    slug: 'podolog-limanowa-kiedy-warto',
    title: 'Podolog w Limanowej — kiedy warto umówić wizytę?',
    metaTitle: 'Podolog Limanowa — Gabinet BeskidStudio By Wiktoria Ćwik | Wrastające paznokcie, odciski',
    metaDescription:
      'Szukasz podologa w Limanowej? Gabinet BeskidStudio By Wiktoria Ćwik oferuje leczenie wrastających paznokci, odcisków i grzybicy stóp. Przyjmujemy z Mszany Dolnej, Laskowej i okolic.',
    excerpt:
      'Problemy ze stopami dotykają wiele osób — wrastające paznokcie, odciski, grzybica. Sprawdź, kiedy wizyta u podologa w Limanowej jest konieczna i czego się spodziewać.',
    readingTime: 4,
    tags: ['podologia', 'limanowa', 'wrastający paznokieć', 'stopy'],
    content: doc(
      p(
        'Podologia to dziedzina medycyny estetycznej i profilaktycznej zajmująca się zdrowiem stóp. Choć problemy ze stopami są powszechne, wiele osób zbyt długo zwleka z wizytą u specjalisty — tymczasem nieleczone schorzenia mogą prowadzić do poważnych powikłań, szczególnie u osób z cukrzycą lub chorobami krążenia.',
      ),
      h2('Najczęstsze problemy podologiczne'),
      p(
        'W gabinecie BeskidStudio By Wiktoria Ćwik w Limanowej zajmujemy się szerokim spektrum problemów podologicznych. Do najczęstszych należą:',
      ),
      ul(
        'Wrastający paznokieć — ból, stan zapalny, nawracające infekcje',
        'Grzybica paznokci i skóry stóp — przebarwienia, kruchość, nieprzyjemny zapach',
        'Odciski i modzele — bolesne zgrubienia skóry wywołane tarciem lub uciskiem',
        'Pękające pięty — szczeliny w skórze, które mogą prowadzić do zakażeń',
        'Haluksy — boczne odchylenie palucha, ból przy chodzeniu',
        'Brodawki podeszwowe — wirusowe zmiany skórne, trudne do usunięcia w domu',
      ),
      h2('Jak wygląda wizyta podologiczna w Limanowej?'),
      p(
        'Wizyta w gabinecie BeskidStudio By Wiktoria Ćwik zaczyna się od wywiadu zdrowotnego i oceny stanu stóp. Podolog ogląda paznokcie, skórę podeszwy i boki palców. Następnie, w zależności od problemu, wykonywany jest zabieg: opracowanie naskórka, korekta paznokcia, aplikacja preparatów leczniczych lub założenie klamry podologicznej. Całość trwa od 45 do 90 minut. Gabinet wyposażony jest w sprzęt do frezowania i sterylizacji narzędzi.',
      ),
      h2('Wrastający paznokieć — dlaczego nie warto czekać?'),
      p(
        'Wrastający paznokieć to jeden z najpowszechniejszych powodów wizyty u podologa. Paznokieć wrasta w skórę wału paznokciowego, powodując ból, zaczerwienienie i obrzęk. Nieleczony prowadzi do ropnego zapalenia, a w skrajnych przypadkach wymaga interwencji chirurgicznej. W gabinecie BeskidStudio By Wiktoria Ćwik stosujemy dwie skuteczne metody nieoperacyjne: tamponowanie (podłożenie waiku z gazy pod krawędź paznokcia) oraz klamrę podologiczną, która stopniowo koryguje kierunek wzrostu paznokcia bez bólu.',
      ),
      h2('Dla kogo szczególnie polecamy wizytę?'),
      p(
        'Podologia jest szczególnie ważna dla osób z cukrzycą — stopa cukrzycowa to poważne powikłanie, które można ograniczyć regularną pielęgnacją podologiczną. Polecamy wizytę też sportowcom (urazy, modzel, modzele), osobom starszym (zmiany zwyrodnieniowe, trudności z samodzielną pielęgnacją), a także każdemu, kto odczuwa ból lub dyskomfort przy chodzeniu.',
      ),
      h2('Dojazd do gabinetu BeskidStudio By Wiktoria Ćwik z okolic Limanowej'),
      p(
        'Gabinet BeskidStudio By Wiktoria Ćwik mieści się w centrum Limanowej i jest łatwo dostępny dla klientek z całego powiatu limanowskiego. Z Mszany Dolnej dojazd zajmuje około 15 minut, z Laskowej i Mordarki — zaledwie 10 minut, a z Tymbarku i Jodłownika — około 20 minut. Oferujemy rezerwacje online, więc termin możesz zarezerwować w dowolnym momencie bez wychodzenia z domu.',
      ),
      p(
        'Nie czekaj, aż problem się pogłębi — umów wizytę u podologa w Limanowej już dziś i zadbaj o zdrowie swoich stóp.',
      ),
    ),
  },

  // ─── 2. Laminowanie brwi ─────────────────────────────────────────────────
  {
    slug: 'laminowanie-brwi-limanowa',
    title: 'Laminowanie brwi w Limanowej — efekty, ile trwa i co warto wiedzieć',
    metaTitle: 'Laminowanie brwi Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Efekty i cena',
    metaDescription:
      'Laminowanie brwi w Limanowej w salonie BeskidStudio By Wiktoria Ćwik. Dowiedz się jak wygląda zabieg, jak długo trwa efekt i jak pielęgnować brwi po laminowaniu. Umawiaj się online!',
    excerpt:
      'Laminowanie brwi to jeden z najmodniejszych zabiegów brwi — naturalny wygląd, wyraźnie zarysowane brwi bez codziennej stylizacji. Sprawdź, jak to działa w Limanowej.',
    readingTime: 4,
    tags: ['brwi', 'laminowanie brwi', 'limanowa', 'stylizacja brwi'],
    content: doc(
      p(
        'Laminowanie brwi zdobyło ogromną popularność w ciągu ostatnich kilku lat — i nic dziwnego. Zabieg pozwala ujarzmić nawet najbardziej niesforne włoski brwiowe, nadając im jednolity kształt i objętość bez makijażu. W salonie BeskidStudio By Wiktoria Ćwik w Limanowej wykonujemy laminowanie brwi przy użyciu sprawdzonych preparatów, dbając o pełne bezpieczeństwo zabiegu.',
      ),
      h2('Na czym polega laminowanie brwi?'),
      p(
        'Laminowanie brwi to trzystopniowy zabieg chemiczny. W pierwszym kroku stosuje się preparat zmiękczający strukturę włosa, co pozwala na jego modelowanie. Następnie włoski układa się w pożądanym kierunku i utrwala preparatem utleniającym. Na koniec aplikuje się odżywkę regenerującą. Cały zabieg trwa około 45–60 minut i nie wymaga golenia ani wyrywania włosków.',
      ),
      h2('Jak długo utrzymują się efekty laminowania?'),
      p(
        'Efekty laminowania utrzymują się zazwyczaj od 4 do 8 tygodni, w zależności od naturalnego cyklu wzrostu włosów i pielęgnacji domowej. Bezpośrednio po zabiegu brwi wyglądają wyraźnie, mają piękny połysk i są idealnie ułożone. Po kilku tygodniach zabieg można powtórzyć.',
      ),
      h2('Laminowanie brwi a henna — co wybrać?'),
      p(
        'Laminowanie i henna brwi to dwa różne zabiegi, które można łączyć. Laminowanie układa i usztywnia włoski, nadaje im objętość. Henna zabarwia włoski i skórę, wzmacniając kontur brwi. Jeśli masz jasne brwi i chcesz je wyraźniej zaznaczyć — henna jest idealnym uzupełnieniem laminowania. W salonie BeskidStudio By Wiktoria Ćwik oferujemy oba zabiegi i chętnie doradzimy optymalne połączenie.',
      ),
      h2('Pielęgnacja po laminowaniu — czego unikać?'),
      p(
        'Przez pierwsze 24 godziny po zabiegu należy unikać kontaktu brwi z wodą, parą i kosmetykami. Nie należy też pocierać twarzy ręcznikiem w okolicach brwi. Po tym czasie brwi można myć normalnie. Regularne stosowanie odżywki do brwi przedłuży efekt laminowania i wzmocni strukturę włosków.',
      ),
      h2('Przeciwwskazania do laminowania brwi'),
      ul(
        'Aktywne infekcje skórne lub stany zapalne w okolicach brwi',
        'Alergia na składniki preparatów do laminowania (zalecany test alergiczny)',
        'Ciąża i karmienie piersią (zalecana ostrożność)',
        'Bardzo przerzedzone lub uszkodzone włoski brwiowe',
      ),
      h2('Umów wizytę — przyjmujemy klientki z całego powiatu'),
      p(
        'Salon BeskidStudio By Wiktoria Ćwik w Limanowej przyjmuje klientki z Mordarki, Słopnic, Ujanowic, Jodłownika i wszystkich okolicznych miejscowości. Dojazd z większości wiosek powiatu limanowskiego zajmuje nie więcej niż 20 minut. Zarezerwuj termin online i ciesz się pięknymi brwiami bez codziennej stylizacji!',
      ),
    ),
  },

  // ─── 3. Lifting rzęs ─────────────────────────────────────────────────────
  {
    slug: 'lifting-rzes-limanowa',
    title: 'Lifting rzęs w Limanowej — na czym polega i komu jest polecany?',
    metaTitle: 'Lifting rzęs Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Laminowanie i przedłużanie',
    metaDescription:
      'Lifting rzęs w Limanowej — naturalny efekt długich, uniesionych rzęs bez tuszu. Salon BeskidStudio By Wiktoria Ćwik oferuje lifting, laminowanie i przedłużanie rzęs. Umów wizytę!',
    excerpt:
      'Lifting rzęs daje efekt efektownie uniesionych, dłużej wyglądających rzęs bez konieczności codziennego używania zalotki. Sprawdź, czy to zabieg dla Ciebie.',
    readingTime: 4,
    tags: ['rzęsy', 'lifting rzęs', 'laminowanie rzęs', 'limanowa'],
    content: doc(
      p(
        'Każda, kto rano sięga po zalotkę, wie jak żmudne jest podkręcanie rzęs — efekt i tak znika po kilku godzinach. Lifting rzęs to zabieg, który rozwiązuje ten problem raz na kilka tygodni, dając naturalne, wyraźne spojrzenie przez cały czas. W salonie BeskidStudio By Wiktoria Ćwik w Limanowej wykonujemy lifting rzęs przy użyciu bezpiecznych preparatów z certyfikatami.',
      ),
      h2('Jak wygląda lifting rzęs krok po kroku?'),
      p(
        'Rzęsy układa się na silikonowych wałeczkach dobranych do ich długości. Następnie aplikuje się preparat utrwalający podkręcenie, a po określonym czasie — preparat neutralizujący. Na koniec rzęsy odżywia się keratyną lub olejkiem. Zabieg trwa około 60 minut, jest bezbolesny i nie wymaga specjalnego przygotowania.',
      ),
      h2('Lifting a laminowanie rzęs — jaka różnica?'),
      p(
        'Lifting rzęs skupia się na trwałym podkręceniu — efekt przypomina użycie zalotki, ale utrzymuje się 6–8 tygodni. Laminowanie rzęs dodatkowo nadaje im połysk, ciemniejszy kolor i większą gęstość wizualną dzięki pielęgnacyjnym składnikom preparatu. Oba zabiegi można ze sobą łączyć, a personel salonu BeskidStudio By Wiktoria Ćwik pomoże wybrać odpowiednie rozwiązanie.',
      ),
      h2('Lifting a przedłużanie rzęs — co wybrać?'),
      p(
        'Przedłużanie rzęs metodą 1:1 lub objętościową daje bardziej dramatyczny efekt, ale wymaga regularnego uzupełniania co 2–4 tygodnie i delikatnego traktowania rzęs. Lifting jest mniej zobowiązujący — efekt jest bardziej naturalny i nie wymaga tak częstych wizyt. Dla osób aktywnych fizycznie lub preferujących minimalistyczny makijaż lifting jest często lepszym wyborem.',
      ),
      h2('Jak długo utrzymuje się efekt liftingu rzęs?'),
      p(
        'Efekty liftingu rzęs utrzymują się od 6 do 8 tygodni — tyle trwa naturalny cykl wzrostu rzęs. Regularne stosowanie odżywki do rzęs może nieznacznie przedłużyć efekt. Zabieg można powtarzać co 6–8 tygodni bez uszczerbku dla kondycji rzęs.',
      ),
      h2('Pielęgnacja rzęs po liftingu'),
      ul(
        'Przez pierwsze 24h unikaj kontaktu z wodą, parą i tłustymi kosmetykami',
        'Nie pocieraj oczu ręcznikiem — osuszaj delikatnymi ruchami',
        'Stosuj odżywkę do rzęs — wzmocni ich kondycję i przedłuży efekt',
        'Unikaj mascaras wodoodpornych — trudno je zmyć bez pocierania rzęs',
      ),
      h2('Klientki z Nowego Sącza, Kasiny Wielkiej i Sowlin'),
      p(
        'Salon BeskidStudio By Wiktoria Ćwik w Limanowej jest wygodnie zlokalizowany dla klientek z okolic: z Nowego Sącza dojazd zajmuje ok. 30 minut, z Kasiny Wielkiej i Sowlin — ok. 15–20 minut. Oferujemy rezerwacje online — wybierz termin, który Ci odpowiada, i przyjedź po piękne, uniesione rzęsy na kolejne tygodnie.',
      ),
    ),
  },

  // ─── 4. Manicure hybrydowy ────────────────────────────────────────────────
  {
    slug: 'manicure-hybrydowy-limanowa',
    title: 'Manicure hybrydowy w Limanowej — trwałość, wzory i pielęgnacja',
    metaTitle: 'Manicure hybrydowy Limanowa — Salon BeskidStudio By Wiktoria Ćwik | Trwały manicure',
    metaDescription:
      'Manicure hybrydowy w Limanowej — trwałość do 4 tygodni, szeroki wybór kolorów. Salon BeskidStudio By Wiktoria Ćwik przyjmuje klientki z Dobrej, Tymbarku i Łososiny Dolnej.',
    excerpt:
      'Manicure hybrydowy łączy zalety lakieru z wytrzymałością żelu — efekt jest piękny i trwa nawet 4 tygodnie. Dowiedz się, jak zadbać o paznokcie po zabiegu.',
    readingTime: 3,
    tags: ['manicure', 'manicure hybrydowy', 'paznokcie', 'limanowa'],
    content: doc(
      p(
        'Manicure hybrydowy to obecnie najpopularniejszy rodzaj manicure — łączy naturalny wygląd klasycznego lakieru z trwałością żelu. Efekt utrzymuje się do 3–4 tygodni bez odpryskiwania i matowienia, co czyni go idealnym wyborem dla osób aktywnych zawodowo i prywatnie.',
      ),
      h2('Manicure hybrydowy, klasyczny czy żelowy — czym się różnią?'),
      ul(
        'Klasyczny lakier — szybki, tani, trwa 3–5 dni',
        'Hybrydowy — utrwalany lampą UV/LED, trwa 3–4 tygodnie, naturalny wygląd',
        'Żel — większa grubość i wytrzymałość, możliwość budowania długości, trwa 4–6 tygodni',
        'Akryl — najbardziej wytrzymały, idealny do przedłużania paznokci',
      ),
      h2('Jak wygląda manicure hybrydowy w salonie BeskidStudio By Wiktoria Ćwik?'),
      p(
        'Zabieg zaczyna się od usunięcia poprzedniej hybrydy (jeśli była). Następnie stylista opracowuje płytkę paznokcia, modeluje i skraca długość. Po nałożeniu bazy i lakieru każda warstwa jest utwardzana lampą UV/LED. Ostatni etap to top coat nadający połysk i zabezpieczający kolor. Cały zabieg trwa ok. 60–75 minut.',
      ),
      h2('Trwałość manicure hybrydowego — co na nią wpływa?'),
      p(
        'Hybryd przy odpowiedniej pielęgnacji trzyma się 3–4 tygodnie. Na trwałość negatywnie wpływają: częsty kontakt z detergentami bez rękawiczek, praca fizyczna, mocowanie paznokci i nieprawidłowe usuwanie hybrydy. Stosowanie olejku do skórek i nawilżanie dłoni znacząco przedłuża efekt.',
      ),
      h2('Pielęgnacja po manicure hybrydowym'),
      ul(
        'Noś rękawiczki przy myciu naczyń i pracach domowych',
        'Stosuj olejek do skórek — nawilża i wzmacnia płytkę',
        'Nie otwieraj puszek i nie używaj paznokci jako narzędzi',
        'Chroń dłonie przed mrozem — niskie temperatury mogą powodować mikropęknięcia hybrydy',
      ),
      h2('Jak bezpiecznie usunąć manicure hybrydowy?'),
      p(
        'Samodzielne zdrapywanie lub zrywanie hybrydy niszczy płytkę paznokcia i może prowadzić do ich przerzedzenia i łamliwości. Prawidłowe usunięcie polega na spiłowaniu wierzchniej warstwy i namoczeniu paznokci w acetonie — najlepiej w warunkach gabinetowych. W salonie BeskidStudio By Wiktoria Ćwik usuwanie hybrydy jest wykonywane z pełną dbałością o kondycję Twoich paznokci.',
      ),
      h2('Manicure i pedicure — warto zadbać o oba'),
      p(
        'Wiele klientek łączy wizytę manicure z pedicure hybrydowym lub podologicznym — oszczędzasz czas i masz pewność, że dłonie i stopy wyglądają perfekcyjnie. Zapytaj o dostępność pakietów przy rezerwacji.',
      ),
      h2('Przyjmujemy klientki z Dobrej, Tymbarku i Łososiny Dolnej'),
      p(
        'Salon BeskidStudio By Wiktoria Ćwik w Limanowej jest świetnie skomunikowany z okolicznymi miejscowościami. Z Dobrej i Tymbarku dojazd zajmuje ok. 15–20 minut, z Łososiny Dolnej — ok. 20 minut. Umów swój termin online i przyjdź po trwały, piękny manicure!',
      ),
    ),
  },

  // ─── 5. Salon kosmetyczny dla całego powiatu ──────────────────────────────
  {
    slug: 'zabiegi-kosmetologiczne-limanowa-okolice',
    title:
      'Salon kosmetyczny Limanowa — zabiegi dla klientek z Mszany Dolnej, Laskowej, Słopnic i całego powiatu',
    metaTitle: 'Salon kosmetyczny Limanowa — BeskidStudio By Wiktoria Ćwik | Obsługujemy cały powiat limanowski',
    metaDescription:
      'Salon BeskidStudio By Wiktoria Ćwik w Limanowej to kosmetologia twarzy, podologia, manicure i stylizacja rzęs. Przyjmujemy klientki z Mszany Dolnej, Laskowej, Słopnic, Tymbarku i okolic.',
    excerpt:
      'Szukasz sprawdzonego salonu kosmetycznego blisko Mszany Dolnej, Laskowej lub Słopnic? Salon BeskidStudio By Wiktoria Ćwik w Limanowej to pełna oferta zabiegów kosmetologicznych dla całego powiatu.',
    readingTime: 4,
    tags: ['kosmetologia', 'limanowa', 'salon kosmetyczny', 'powiat limanowski'],
    content: doc(
      p(
        'Limanowa to naturalne centrum usługowe dla całego powiatu limanowskiego. Salon BeskidStudio By Wiktoria Ćwik działa tutaj jako kompleksowy gabinet kosmetologiczny — oferuje zabiegi na twarz i ciało, stylizację brwi i rzęs, manicure, pedicure oraz specjalistyczne usługi podologiczne. Wszystko w jednym miejscu, z wygodną rezerwacją online.',
      ),
      h2('Pełna oferta zabiegów w salonie BeskidStudio By Wiktoria Ćwik'),
      ul(
        'Kosmetologia twarzy — oczyszczanie, nawilżanie, zabiegi anti-aging, mikrodermabrazja',
        'Podologia — wrastające paznokcie, odciski, grzybica, pielęgnacja stóp',
        'Stylizacja brwi — laminowanie, henna, regulacja, makijaż permanentny',
        'Pielęgnacja rzęs — lifting, laminowanie, przedłużanie metodą 1:1 i objętościową',
        'Manicure — klasyczny, hybrydowy, żelowy, pedicure leczniczy i kosmetyczny',
        'Program lojalnościowy — zbieraj punkty za każdą wizytę',
      ),
      h2('Klientki z Mszany Dolnej'),
      p(
        'Mszana Dolna leży zaledwie 15 km od Limanowej — dojazd samochodem zajmuje ok. 15 minut. Dla klientek z Mszany Dolnej i okolic (Kasiny Wielkiej, Lubomierza) salon BeskidStudio By Wiktoria Ćwik to najbliższy pełny gabinet kosmetologiczny z ofertą zabiegów podologicznych i laminowania rzęs. Zapraszamy — rezerwacji dokonasz online w każdej chwili.',
      ),
      h2('Klientki z Laskowej i Mordarki'),
      p(
        'Laskowa i Mordarka leżą bezpośrednio w sąsiedztwie Limanowej — dojazd to zaledwie 10 minut. Wiele naszych stałych klientek pochodzi właśnie z tych miejscowości. Jeśli szukasz sprawdzonego salonu kosmetycznego w pobliżu Laskowej lub Mordarki, salon BeskidStudio By Wiktoria Ćwik jest Twoim naturalnym wyborem.',
      ),
      h2('Klientki ze Słopnic, Ujanowic i Jodłownika'),
      p(
        'Ze Słopnic, Ujanowic i Jodłownika do salonu BeskidStudio By Wiktoria Ćwik w Limanowej jedzie się ok. 20–25 minut. To nieduży dystans w zamian za pełną ofertę zabiegową i profesjonalną obsługę. Oferujemy szerokie okna czasowe — możesz zarezerwować wizytę rano przed pracą lub w sobotę.',
      ),
      h2('Klientki z Nowego Sącza'),
      p(
        'Nowy Sącz leży ok. 30 km od Limanowej. Choć w mieście jest wiele salonów kosmetycznych, część klientek z Nowego Sącza decyduje się na wizytę w BeskidStudio By Wiktoria Ćwik — ze względu na specjalistyczne usługi podologiczne lub zabiegi rzęs, których trudno szukać w pobliżu. Jeśli jedziesz w okolice Limanowej w innych sprawach, warto połączyć to z wizytą w naszym gabinecie.',
      ),
      h2('Jak umówić wizytę w salonie BeskidStudio By Wiktoria Ćwik?'),
      p(
        'Rezerwacja jest prosta i wygodna. Wystarczy wejść na naszą stronę internetową, wybrać interesujący zabieg i dostępny termin. System jest dostępny przez całą dobę. Możesz też skontaktować się z nami telefonicznie lub przez media społecznościowe. Zapraszamy wszystkie klientki z powiatu limanowskiego i okolic — do zobaczenia w Limanowej!',
      ),
    ),
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding blog posts...');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    throw new Error('No admin user found. Run the main seed first: pnpm prisma:seed');
  }

  for (const article of articles) {
    const { tags, ...rest } = article;

    // Upsert tags
    const tagRecords = await Promise.all(
      tags.map((name) =>
        prisma.tag.upsert({
          where: { slug: name.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: {
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
          },
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

  console.log(`\nSeeded ${articles.length} blog posts successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

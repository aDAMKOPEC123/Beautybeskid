const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const AUTHOR_ID = "cmqpjs6nm00258lr6gd24x07r";

const posts = [
  {
    title: "Kosmetyczka Mordarka — profesjonalna pielęgnacja skóry blisko Limanowej",
    slug: "kosmetyczka-mordarka-profesjonalna-pielegnacja-skory",
    metaTitle: "Kosmetyczka Mordarka — zabiegi pielęgnacyjne | BeskidStudio",
    metaDescription: "Szukasz dobrej kosmetyczki w Mordarce? BeskidStudio by Wiktoria Ćwik oferuje konsultacje, laminację brwi, peelingi i zabiegi pielęgnacyjne. Umów wizytę.",
    category: "Pielęgnacja",
    readingTime: 5,
    excerpt: "Profesjonalny gabinet kosmetologiczny w Mordarce koło Limanowej. Dowiedz się, jakie zabiegi oferuje BeskidStudio i dlaczego warto wybrać kosmetyczkę z doświadczeniem.",
    tags: ["kosmetyczka mordarka", "pielęgnacja skóry", "gabinet kosmetyczny"],
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Gabinet kosmetologiczny w Mordarce — BeskidStudio by Wiktoria Ćwik" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Mordarka to niewielka miejscowość tuż przy Limanowej, w której mieści się profesjonalny gabinet kosmetologiczny " },
          { type: "text", marks: [{ type: "bold" }], text: "BeskidStudio by Wiktoria Ćwik" },
          { type: "text", text: ". Gabinet powstał z pasji do pielęgnacji skóry i chęci zapewnienia mieszkankom powiatu limanowskiego dostępu do nowoczesnych zabiegów kosmetologicznych bez konieczności dojazdu do dużego miasta." },
        ]},
        { type: "paragraph", content: [
          { type: "text", text: "Wiktoria Ćwik to dyplomowany kosmetolog z doświadczeniem w zabiegach pielęgnacyjnych na twarz i ciało. Każda wizyta zaczyna się od indywidualnej konsultacji, podczas której oceniany jest stan skóry i dobierany optymalny plan zabiegowy." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Jakie zabiegi oferuje kosmetyczka w Mordarce?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "W BeskidStudio dostępny jest szeroki zakres usług kosmetologicznych:" },
        ]},
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Konsultacje kosmetologiczne" }, { type: "text", text: " — analiza potrzeb skóry, dobór pielęgnacji domowej i gabinetowej" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Laminacja brwi i rzęs" }, { type: "text", text: " — naturalne podkreślenie spojrzenia bez makijażu" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Henna brwi i rzęs" }, { type: "text", text: " — koloryzacja nadająca wyrazistość i głębię" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Peelingi chemiczne" }, { type: "text", text: " — odnawianie skóry, redukcja przebarwień i blizn" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Zabiegi nawilżające i odżywcze" }, { type: "text", text: " — regeneracja skóry suchej, zmęczonej i odwodnionej" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Depilacja twarzy" }, { type: "text", text: " — delikatne usuwanie niechcianego owłosienia" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dlaczego warto wybrać kosmetyczkę w Mordarce?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Gabinet BeskidStudio wyróżnia się kilkoma elementami:" },
        ]},
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Indywidualne podejście" }, { type: "text", text: " — każda klientka otrzymuje plan pielęgnacji dopasowany do jej typu skóry i potrzeb" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Profesjonalne kosmetyki" }, { type: "text", text: " — w gabinecie stosowane są sprawdzone preparaty przeznaczone do użytku profesjonalnego" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Wygodna lokalizacja" }, { type: "text", text: " — Mordarka 505, zaledwie kilka minut od centrum Limanowej, z dostępnym parkingiem" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Rezerwacja online" }, { type: "text", text: " — możliwość sprawdzenia wolnych terminów i umówienia się bez dzwonienia" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Jak dojechać do gabinetu w Mordarce?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Gabinet BeskidStudio mieści się pod adresem Mordarka 505, 34-600 Mordarka. Dojazd z centrum Limanowej zajmuje około 5 minut samochodem. Przy gabinecie dostępny jest bezpłatny parking. Klientki przyjeżdżają również z Laskowej, Tymbarku, Dobrej, Mszany Dolnej i Nowego Sącza." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Umów wizytę u kosmetyczki w Mordarce" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Chcesz zadbać o swoją skórę u doświadczonego kosmetologa? Sprawdź dostępne terminy i zarezerwuj wizytę online na stronie " },
          { type: "text", marks: [{ type: "bold" }], text: "kosmetologwiktoriacwik.pl" },
          { type: "text", text: ". Pierwsza konsultacja pozwoli dobrać odpowiedni kierunek zabiegowy bez zobowiązań." },
        ]},
      ],
    }),
  },
  {
    title: "Kosmetyczka Limanowa — zabiegi kosmetyczne w okolicy Limanowej",
    slug: "kosmetyczka-limanowa-zabiegi-kosmetyczne",
    metaTitle: "Kosmetyczka Limanowa — zabiegi i pielęgnacja | BeskidStudio",
    metaDescription: "Kosmetyczka koło Limanowej — BeskidStudio oferuje laminację brwi, peelingi, zabiegi nawilżające i konsultacje. Gabinet w Mordarce, 5 min od Limanowej.",
    category: "Pielęgnacja",
    readingTime: 5,
    excerpt: "Szukasz sprawdzonej kosmetyczki w okolicy Limanowej? Poznaj ofertę gabinetu BeskidStudio w Mordarce — zabiegi pielęgnacyjne, stylizacja brwi i rzęs, konsultacje.",
    tags: ["kosmetyczka limanowa", "zabiegi kosmetyczne", "salon kosmetyczny limanowa"],
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Gdzie znaleźć dobrą kosmetyczkę w okolicy Limanowej?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Mieszkanki Limanowej i okolic coraz częściej szukają profesjonalnej opieki kosmetologicznej blisko domu. " },
          { type: "text", marks: [{ type: "bold" }], text: "BeskidStudio by Wiktoria Ćwik" },
          { type: "text", text: " to gabinet kosmetologiczny w Mordarce — zaledwie 5 minut jazdy od centrum Limanowej. Oferuje pełen zakres zabiegów pielęgnacyjnych i stylizacyjnych prowadzonych przez dyplomowanego kosmetologa." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Najpopularniejsze zabiegi kosmetyczne w Limanowej" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Klientki z Limanowej najczęściej wybierają następujące zabiegi:" },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Laminacja brwi i rzęs" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg, który pozwala naturalnie podkreślić brwi i rzęsy bez codziennego makijażu. Laminacja nadaje brwiom pożądany kształt i kierunek, a rzęsom — widoczne podkręcenie i uniesienie. Efekt utrzymuje się przez 6-8 tygodni." },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Henna brwi" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Koloryzacja brwi henną pudrową to szybki sposób na wyrównanie koloru i uzupełnienie drobnych ubytków w łuku brwiowym. Zabieg trwa około 30 minut, a efekt utrzymuje się do 2 tygodni na skórze i 4-6 tygodni na włoskach." },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Zabiegi pielęgnacyjne na twarz" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Peelingi chemiczne, nawilżanie, odżywianie i regeneracja skóry — każdy zabieg jest dobierany po konsultacji kosmetologicznej, w której oceniany jest aktualny stan skóry, jej potrzeby i ewentualne przeciwwskazania." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Co wyróżnia BeskidStudio spośród kosmetyczek w Limanowej?" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Wykształcenie kierunkowe" }, { type: "text", text: " — Wiktoria Ćwik jest dyplomowanym kosmetologiem, nie tylko kosmetyczką" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Konsultacja przed każdym zabiegiem" }, { type: "text", text: " — żaden zabieg nie jest wykonywany bez wcześniejszej analizy skóry" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "System rezerwacji online" }, { type: "text", text: " — wygodne umawianie wizyt z dowolnego urządzenia, bez czekania na telefon" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Program lojalnościowy" }, { type: "text", text: " — stałe klientki zbierają punkty za wizyty i wymieniają na zniżki" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dla kogo jest BeskidStudio?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Gabinet przyjmuje klientki z całego powiatu limanowskiego — z Limanowej, Mordarki, Laskowej, Dobrej, Tymbarku, Słopnic, Mszany Dolnej oraz Nowego Sącza. Niezależnie od tego, czy szukasz pierwszej konsultacji, regularnej pielęgnacji, czy przygotowania na specjalną okazję — w BeskidStudio znajdziesz odpowiedni zabieg." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Zarezerwuj wizytę u kosmetyczki koło Limanowej" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Sprawdź aktualne wolne terminy i umów się online. Pierwsza konsultacja kosmetologiczna pozwoli określić potrzeby Twojej skóry i dobrać odpowiednie zabiegi. Rezerwacja dostępna na stronie " },
          { type: "text", marks: [{ type: "bold" }], text: "kosmetologwiktoriacwik.pl/rezerwacja" },
          { type: "text", text: "." },
        ]},
      ],
    }),
  },
  {
    title: "Laminacja brwi — na czym polega, ile trwa i dla kogo jest ten zabieg?",
    slug: "laminacja-brwi-na-czym-polega-ile-trwa",
    metaTitle: "Laminacja brwi — efekty, trwałość i cena | BeskidStudio Limanowa",
    metaDescription: "Laminacja brwi to zabieg stylizacji, który nadaje brwiom kształt i objętość na 6-8 tygodni. Dowiedz się, jak przebiega i umów wizytę w Limanowej.",
    category: "Stylizacja brwi",
    readingTime: 6,
    excerpt: "Laminacja brwi to jeden z najpopularniejszych zabiegów stylizacji. Dowiedz się, na czym polega, jak długo utrzymuje się efekt i czy ten zabieg jest dla Ciebie.",
    tags: ["laminacja brwi", "stylizacja brwi", "brwi limanowa"],
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Czym jest laminacja brwi?" }] },
        { type: "paragraph", content: [
          { type: "text", marks: [{ type: "bold" }], text: "Laminacja brwi" },
          { type: "text", text: " to profesjonalny zabieg kosmetologiczny polegający na trwałym ułożeniu włosków brwiowych w pożądanym kierunku. Dzięki specjalistycznym preparatom włoski zostają uformowane i utrwalone, co nadaje brwiom pełniejszy, bardziej uporządkowany wygląd." },
        ]},
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg jest szczególnie polecany osobom, które mają niesforne, rosnące w różnych kierunkach brwi lub chcą uzyskać efekt naturalnie gęstych brwi bez konieczności codziennego żelowania czy czesania." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Jak przebiega zabieg laminacji brwi?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg laminacji brwi w BeskidStudio składa się z kilku etapów:" },
        ]},
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Oczyszczenie" }, { type: "text", text: " — usunięcie makijażu i zanieczyszczeń z okolicy brwi" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Nałożenie preparatu zmiękczającego" }, { type: "text", text: " — preparat rozluźnia strukturę włosa, umożliwiając zmianę jego ułożenia" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Formowanie kształtu" }, { type: "text", text: " — kosmetolog układa włoski w pożądanym kierunku, najczęściej ku górze" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Utrwalenie" }, { type: "text", text: " — nałożenie preparatu utrwalającego, który zamyka nowy kształt włosków" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Odżywienie" }, { type: "text", text: " — aplikacja odżywki keratynowej lub botoksu, który wzmacnia i regeneruje włoski" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ile trwa laminacja brwi i jak długo utrzymuje się efekt?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Sam zabieg trwa od " },
          { type: "text", marks: [{ type: "bold" }], text: "30 do 45 minut" },
          { type: "text", text: ". Efekt laminacji utrzymuje się przeciętnie od " },
          { type: "text", marks: [{ type: "bold" }], text: "6 do 8 tygodni" },
          { type: "text", text: ", w zależności od szybkości wzrostu włosków i pielęgnacji domowej. Przez pierwsze 24 godziny po zabiegu należy unikać kontaktu brwi z wodą." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dla kogo jest laminacja brwi?" }] },
        { type: "paragraph", content: [{ type: "text", text: "Laminacja brwi sprawdzi się, jeśli:" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Twoje brwi rosną w różnych kierunkach i trudno je ułożyć" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Chcesz uzyskać efekt pełniejszych, gęstszych brwi" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nie chcesz codziennie stylizować brwi żelem lub pomadą" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Szukasz naturalnego efektu bez makijażu permanentnego" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Laminacja brwi a inne zabiegi — czym się różni?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Laminacja dotyczy ułożenia i kształtu naturalnych włosków. W przeciwieństwie do makijażu permanentnego nie ingeruje w skórę. Można ją łączyć z " },
          { type: "text", marks: [{ type: "bold" }], text: "henną brwi" },
          { type: "text", text: " (dla dodania koloru) lub " },
          { type: "text", marks: [{ type: "bold" }], text: "regulacją" },
          { type: "text", text: " (dla doprecyzowania kształtu). Połączenie laminacji z henną to tzw. " },
          { type: "text", marks: [{ type: "bold" }], text: "LamiSet" },
          { type: "text", text: " — kompleksowy zabieg, o którym więcej przeczytasz na naszym blogu." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Laminacja brwi w Limanowej — umów wizytę" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg laminacji brwi wykonywany jest w gabinecie BeskidStudio w Mordarce koło Limanowej. Sprawdź aktualną cenę i wolne terminy na stronie " },
          { type: "text", marks: [{ type: "bold" }], text: "kosmetologwiktoriacwik.pl" },
          { type: "text", text: " i zarezerwuj wizytę online." },
        ]},
      ],
    }),
  },
  {
    title: "Henna brwi — koloryzacja, która podkreśli Twoje spojrzenie",
    slug: "henna-brwi-koloryzacja-ktora-podkresli-spojrzenie",
    metaTitle: "Henna brwi — efekty, trwałość i przebieg zabiegu | BeskidStudio",
    metaDescription: "Henna brwi nadaje kolor i wyrazistość na 2-6 tygodni. Dowiedz się, jak przebiega zabieg, ile kosztuje i umów wizytę w BeskidStudio koło Limanowej.",
    category: "Stylizacja brwi",
    readingTime: 5,
    excerpt: "Henna brwi to szybki zabieg koloryzacji, który nadaje brwiom głębię i wyrazistość. Przeczytaj, jak przebiega, ile trwa efekt i czy warto go połączyć z laminacją.",
    tags: ["henna brwi", "koloryzacja brwi", "stylizacja brwi limanowa"],
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Czym jest henna brwi?" }] },
        { type: "paragraph", content: [
          { type: "text", marks: [{ type: "bold" }], text: "Henna brwi" },
          { type: "text", text: " to zabieg koloryzacji polegający na nałożeniu na brwi specjalnego barwnika, który nadaje włoskom i skórze pod nimi jednolity, intensywny kolor. W gabinecie BeskidStudio stosowana jest henna pudrowa — bezpieczna metoda koloryzacji dająca naturalny, wyrazisty efekt." },
        ]},
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg jest idealny dla osób, które chcą uzupełnić luki w brwiach, wyrównać kolor po wypadaniu włosków lub po prostu nadać brwiom bardziej zdefiniowany wygląd bez codziennego makijażu." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Jak przebiega zabieg henny brwi?" }] },
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Konsultacja i dobór koloru" }, { type: "text", text: " — kolor henny jest dobierany do odcienia włosów, karnacji i preferencji klientki" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Oczyszczenie i odtłuszczenie" }, { type: "text", text: " — brwi są przygotowywane do przyjęcia barwnika" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Aplikacja henny" }, { type: "text", text: " — barwnik nakładany jest precyzyjnie na włoski i skórę, z zachowaniem symetrii" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Czas działania" }, { type: "text", text: " — henna pozostaje na brwiach przez 10-20 minut, w zależności od pożądanej intensywności" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Usunięcie i wykończenie" }, { type: "text", text: " — po zmyciu henny brwi są regulowane i układane w ostateczny kształt" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ile trwa efekt henny brwi?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Efekt henny utrzymuje się od " },
          { type: "text", marks: [{ type: "bold" }], text: "2 tygodni na skórze" },
          { type: "text", text: " do " },
          { type: "text", marks: [{ type: "bold" }], text: "4-6 tygodni na włoskach" },
          { type: "text", text: ". Trwałość zależy od typu skóry (skóra tłusta zmywa pigment szybciej), częstotliwości mycia twarzy i stosowanych kosmetyków. Sam zabieg trwa około 30 minut." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Henna brwi a farbka — czym się różnią?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Henna pudrowa barwi zarówno włoski, jak i skórę pod brwiami, dając efekt cienia i wypełnienia. Klasyczna farbka koloryzuje tylko włoski. Dlatego henna jest lepszym wyborem dla osób z rzadkimi brwiami lub lukami — efekt jest pełniejszy i bardziej naturalny." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Czy hennę brwi można łączyć z innymi zabiegami?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Tak. Najczęstsze połączenie to " },
          { type: "text", marks: [{ type: "bold" }], text: "henna + laminacja brwi" },
          { type: "text", text: ", czyli tzw. " },
          { type: "text", marks: [{ type: "bold" }], text: "LamiSet" },
          { type: "text", text: ". W jednej wizycie uzyskujesz idealny kolor i kształt brwi. Laminacja układa włoski, a henna nadaje im odpowiedni odcień — efekt utrzymuje się kilka tygodni." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Henna brwi w Limanowej — gdzie wykonać?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg henny brwi dostępny jest w gabinecie BeskidStudio w Mordarce koło Limanowej. Umów wizytę online na " },
          { type: "text", marks: [{ type: "bold" }], text: "kosmetologwiktoriacwik.pl" },
          { type: "text", text: " — sprawdzisz aktualną cenę, wolne terminy i umówisz się bez dzwonienia." },
        ]},
      ],
    }),
  },
  {
    title: "LamiSet — laminacja brwi z henną w jednym zabiegu",
    slug: "lamiset-laminacja-brwi-z-henna-w-jednym-zabiegu",
    metaTitle: "LamiSet — laminacja + henna brwi w jednej wizycie | BeskidStudio",
    metaDescription: "LamiSet to połączenie laminacji i henny brwi w jednym zabiegu. Idealny kształt i kolor na 6-8 tygodni. Umów wizytę w BeskidStudio koło Limanowej.",
    category: "Stylizacja brwi",
    readingTime: 5,
    excerpt: "LamiSet to kompleksowy zabieg łączący laminację brwi z henną — kształt i kolor w jednej wizycie. Dowiedz się, dla kogo jest i ile trwa efekt.",
    tags: ["lamiset", "laminacja brwi", "henna brwi", "stylizacja brwi"],
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Co to jest LamiSet?" }] },
        { type: "paragraph", content: [
          { type: "text", marks: [{ type: "bold" }], text: "LamiSet" },
          { type: "text", text: " to połączenie dwóch najpopularniejszych zabiegów na brwi — " },
          { type: "text", marks: [{ type: "bold" }], text: "laminacji" },
          { type: "text", text: " i " },
          { type: "text", marks: [{ type: "bold" }], text: "henny" },
          { type: "text", text: " — wykonywanych podczas jednej wizyty. W efekcie uzyskujesz idealnie ułożone, pełne brwi o intensywnym, dopasowanym kolorze. To najczęściej wybierany zabieg na brwi w gabinecie BeskidStudio." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dlaczego warto wybrać LamiSet zamiast samej laminacji lub henny?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Każdy z zabiegów osobno daje świetne efekty, ale ich połączenie ma wyraźne zalety:" },
        ]},
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Kompleksowy efekt" }, { type: "text", text: " — laminacja dba o kształt i ułożenie, henna o kolor i wypełnienie" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Oszczędność czasu" }, { type: "text", text: " — zamiast dwóch wizyt, wszystko w jednej sesji trwającej około 45-60 minut" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Lepszy efekt końcowy" }, { type: "text", text: " — zabiegi wzajemnie się uzupełniają, dając bardziej spójny i naturalny rezultat" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Korzystna cena" }, { type: "text", text: " — LamiSet w pakiecie jest tańszy niż oba zabiegi kupowane osobno" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Jak przebiega zabieg LamiSet?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg składa się z dwóch etapów wykonywanych bezpośrednio po sobie:" },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Etap 1: Laminacja" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Kosmetolog nakłada na brwi preparaty zmiękczające i utrwalające, które pozwalają ułożyć włoski w pożądanym kierunku. Włoski są formowane ku górze, co optycznie powiększa i zagęszcza brwi. Na koniec nakładana jest odżywka keratynowa wzmacniająca strukturę włosków." },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Etap 2: Henna" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Po laminacji na brwi nakładana jest henna pudrowa w kolorze dobranym do odcienia włosów i karnacji. Barwnik działa na włoski i skórę, nadając brwiom jednolity, wyrazisty kolor i efekt naturalnego cienia." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ile trwa efekt LamiSet?" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Efekt laminacji utrzymuje się " },
          { type: "text", marks: [{ type: "bold" }], text: "6-8 tygodni" },
          { type: "text", text: ", kolor henny na skórze " },
          { type: "text", marks: [{ type: "bold" }], text: "do 2 tygodni" },
          { type: "text", text: ", a na włoskach " },
          { type: "text", marks: [{ type: "bold" }], text: "4-6 tygodni" },
          { type: "text", text: ". Większość klientek odwiedza gabinet co 5-6 tygodni, aby odnowić efekt." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dla kogo jest LamiSet?" }] },
        { type: "paragraph", content: [{ type: "text", text: "LamiSet sprawdzi się szczególnie, jeśli:" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Chcesz uporządkować brwi i jednocześnie nadać im kolor" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Masz jasne lub nierównomiernie zabarwione brwi" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nie chcesz codziennie rysować i żelować brwi" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Przygotowujesz się na wyjątkową okazję i chcesz wyglądać naturalnie bez makijażu" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pielęgnacja po zabiegu LamiSet" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Przez pierwsze " },
          { type: "text", marks: [{ type: "bold" }], text: "24 godziny" },
          { type: "text", text: " po zabiegu należy unikać kontaktu brwi z wodą, parą i kosmetykami olejowymi. W kolejnych dniach warto stosować olejek do brwi (np. rycynowy) na noc, aby wzmocnić i odżywić włoski." },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "LamiSet w BeskidStudio — Mordarka koło Limanowej" }] },
        { type: "paragraph", content: [
          { type: "text", text: "Zabieg LamiSet wykonywany jest w gabinecie BeskidStudio by Wiktoria Ćwik w Mordarce 505. Aktualną cenę i dostępne terminy sprawdzisz na " },
          { type: "text", marks: [{ type: "bold" }], text: "kosmetologwiktoriacwik.pl" },
          { type: "text", text: ". Zarezerwuj wizytę online i ciesz się idealnie wyglądającymi brwiami." },
        ]},
      ],
    }),
  },
];

async function seed() {
  for (const post of posts) {
    const { tags, ...data } = post;
    const existing = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
    if (existing) {
      console.log(`SKIP (exists): ${data.slug}`);
      continue;
    }
    await prisma.blogPost.create({
      data: {
        ...data,
        isPublished: true,
        authorId: AUTHOR_ID,
        tags: {
          connectOrCreate: tags.map((t) => ({
            where: { name: t },
            create: { name: t, slug: t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") },
          })),
        },
      },
    });
    console.log(`CREATED: ${data.slug}`);
  }
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });

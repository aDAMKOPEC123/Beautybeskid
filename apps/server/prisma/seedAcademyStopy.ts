import { PrismaClient, Difficulty, CourseStatus, LessonType, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

interface QuizOption { text: string; isCorrect: boolean; }
interface QuizQuestion { text: string; explanation: string; options: QuizOption[]; }
interface QuizData { title: string; passingScore: number; maxAttempts: number; questions: QuizQuestion[]; }
interface LessonData { title: string; slug: string; type: LessonType; contentHtml?: string; estimatedMinutes: number; quiz?: QuizData; }
interface ModuleData { title: string; lessons: LessonData[]; }
interface CourseData { title: string; slug: string; description: string; difficulty: Difficulty; estimatedMinutes: number; tags: string[]; modules: ModuleData[]; }

// ─── KURS 1: Wrastające paznokcie ─────────────────────────────────────────────

const courseWrastajace: CourseData = {
  title: 'Wrastające paznokcie – przyczyny, zapobieganie i pielęgnacja',
  slug: 'wrastajace-paznokcie',
  description: 'Dowiedz się, dlaczego paznokcie wrastają, jak im zapobiegać i jak prawidłowo pielęgnować stopy, aby uniknąć bolesnych nawrotów. Kurs łączy anatomię, profilaktykę i praktyczne wskazówki pielęgnacyjne.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 75,
  tags: ['stopy', 'paznokcie', 'wrastające paznokcie', 'podologia', 'pielęgnacja'],
  modules: [
    {
      title: 'Anatomia paznokcia i mechanizm wrastania',
      lessons: [
        {
          title: 'Budowa paznokcia – co musisz wiedzieć',
          slug: 'budowa-paznokcia',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Czym jest paznokieć?</h2>
<p>Paznokieć to twarda struktura zbudowana z <strong>keratyny</strong> – białka, które tworzy też włosy i zewnętrzną warstwę skóry. Choć wydaje się prostą, jednolitą płytką, w rzeczywistości to złożony narząd z kilkoma ważnymi strefami.</p>

<h2>Elementy budowy paznokcia</h2>
<ul>
  <li><strong>Płytka paznokciowa</strong> – twarda, widoczna część. Rośnie z macierzy i przesuwa się w kierunku wolnego brzegu.</li>
  <li><strong>Macierz paznokcia</strong> – strefa wzrostu ukryta pod fałdem skórnym. Tu powstają nowe komórki keratynowe. Uszkodzenie macierzy może trwale deformować paznokieć.</li>
  <li><strong>Łożysko paznokcia</strong> – skóra pod płytką, bogato unaczyniona; odpowiada za odżywienie paznokcia.</li>
  <li><strong>Obrąbek skórny (skórka)</strong> – chroni macierz przed bakteriami i grzybami.</li>
  <li><strong>Fałdy boczne (wały paznokciowe)</strong> – boczne fałdy skóry otaczające paznokieć. To właśnie tutaj dochodzi do wrastania.</li>
  <li><strong>Hyponychium</strong> – strefa pod wolnym brzegiem paznokcia, bariera przeciw drobnoustrojom.</li>
</ul>

<h2>Jak paznokieć rośnie?</h2>
<p>Paznokieć palucha rośnie średnio <strong>1,5–2 mm miesięcznie</strong> – wolniej niż paznokcie rąk. Pełne odbudowanie paznokcia zajmuje 12–18 miesięcy. Tempo wzrostu zmniejsza się wraz z wiekiem, w zimie i przy niedożywieniu.</p>

<h2>Czym jest wrastający paznokieć?</h2>
<p>Wrastający paznokieć (<em>onychocryptosis</em>) to stan, w którym boczna lub przednia krawędź płytki paznokciowej wbija się w sąsiadujący wał paznokciowy. Najczęściej dotyczy <strong>palucha</strong>, rzadziej innych palców.</p>
<p>Efektem jest ból, obrzęk, zaczerwienienie, a w zaawansowanych przypadkach – ropny stan zapalny i przerost wału skórnego (ziarnina zapalna).</p>

<blockquote>
  <strong>Wskazówka:</strong> Wrastanie nie zawsze wynika z błędu pielęgnacyjnego. Genetycznie zaokrąglony lub poszerzony kształt paznokcia naturalnie sprzyja wrastaniu – szczególnie u osób z tzw. „dachem" na paznokciu.
</blockquote>
`
        },
        {
          title: 'Przyczyny i czynniki ryzyka wrastania',
          slug: 'przyczyny-wrastania',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Dlaczego paznokcie wrastają?</h2>
<p>Wrastający paznokieć to efekt nierównowagi między krawędzią płytki a otaczającym ją wałem skórnym. Przyczyny możemy podzielić na <strong>zewnętrzne</strong> (wynikające z pielęgnacji i stylu życia) oraz <strong>wewnętrzne</strong> (anatomiczne, genetyczne).</p>

<h2>Przyczyny zewnętrzne</h2>
<ul>
  <li><strong>Nieprawidłowe obcinanie paznokci</strong> – zaokrąglanie krawędzi lub obcinanie zbyt krótko to główna przyczyna. Krawędź odcięta w łuk „wchodzi" w boczny wał przy odroście.</li>
  <li><strong>Za ciasne obuwie</strong> – ucisk palców z boku i z góry wgniata wał skórny w krawędź paznokcia. Szczególnie szkodliwe są obuwie z wąskim noskiem i buty BHP.</li>
  <li><strong>Urazy paznokcia</strong> – uderzenia, nadepnięcia, upuszczenie ciężkiego przedmiotu. Mogą zmienić trajektorię wzrostu płytki.</li>
  <li><strong>Skarpety z uciśniętymi palcami</strong> – zbyt krótkie lub zbyt ciasne skarpety mogą chronicznym uciskiem zmieniać pozycję paznokcia.</li>
  <li><strong>Nadmierna wilgoć</strong> – moczenie stóp lub praca w wilgotnym obuwiu zmiękcza tkanki wału, czyniąc je bardziej podatnymi na penetrację przez krawędź paznokcia.</li>
</ul>

<h2>Czynniki anatomiczne i wewnętrzne</h2>
<ul>
  <li><strong>Genetyczny kształt paznokcia</strong> – paznokcie o nadmiernie zakrzywionej, miseczkowatej formie (onychogrypoza lub inne deformacje) mają tendencję do wrastania.</li>
  <li><strong>Hiperhydroza (nadmierne pocenie stóp)</strong> – stale wilgotna skóra wałów jest mniej odporna mechanicznie.</li>
  <li><strong>Płaskostopie i hallux valgus</strong> – zmieniona biomechanika chodu powoduje nierównomierne obciążenie palców i zwiększony ucisk boczny na palucha.</li>
  <li><strong>Przerost wałów paznokciowych</strong> – gruba, przerośnięta skóra wału łatwiej konfliktuje z rosnącą płytką.</li>
  <li><strong>Wiek</strong> – u dzieci i młodzieży paznokcie rosną szybciej i są bardziej miękkie; u seniorów tkanki stają się mniej elastyczne.</li>
</ul>

<h2>Stopnie zaawansowania</h2>
<p>Wrastający paznokieć klasyfikuje się w trzech stopniach:</p>
<ul>
  <li><strong>Stopień I</strong> – ból przy ucisku, lekki obrzęk i zaczerwienienie wału. Brak wycieku.</li>
  <li><strong>Stopień II</strong> – obrzęk, zaczerwienienie, wyciek surowiczy lub ropny z wału.</li>
  <li><strong>Stopień III</strong> – przerośnięty wał (ziarnina zapalna), przewlekły ból, trudności z chodzeniem. Konieczna interwencja podologiczna lub chirurgiczna.</li>
</ul>

<blockquote>
  <strong>Ważne:</strong> Stopień II i III wymagają konsultacji z podologiem lub lekarzem. Domowe interwencje przy zaawansowanym stanie zapalnym mogą pogorszyć sytuację.
</blockquote>
`,
          quiz: {
            title: 'Sprawdź wiedzę – przyczyny wrastania',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Jak prawidłowo obcinać paznokcie, aby zapobiec wrastaniu?',
                explanation: 'Paznokcie należy obcinać prosto – poziomą linią cięcia – bez zaokrąglania bocznych krawędzi. Krawędź powinna sięgać do linii opuszka palca lub nieznacznie wystawać.',
                options: [
                  { text: 'Zaokrąglić krawędzie zgodnie z kształtem palca', isCorrect: false },
                  { text: 'Przyciąć prosto, zachowując boczne krawędzie', isCorrect: true },
                  { text: 'Obciąć jak najkrócej, żeby wolniej rosły', isCorrect: false },
                  { text: 'Pilnować tylko długości, kształt nie ma znaczenia', isCorrect: false },
                ]
              },
              {
                text: 'Który czynnik NIE jest przyczyną wrastającego paznokcia?',
                explanation: 'Regularne nawilżanie stóp kremem nie powoduje wrastania paznokci – wręcz przeciwnie, utrzymuje skórę wałów w dobrej kondycji i zmniejsza ryzyko podrażnień.',
                options: [
                  { text: 'Za ciasne obuwie', isCorrect: false },
                  { text: 'Zaokrąglone obcinanie krawędzi', isCorrect: false },
                  { text: 'Regularne nawilżanie stóp kremem', isCorrect: true },
                  { text: 'Genetyczny kształt paznokcia', isCorrect: false },
                ]
              },
              {
                text: 'Stopień II wrastającego paznokcia charakteryzuje się:',
                explanation: 'Stopień II to obrzęk i zaczerwienienie z wyciekiem surowiczym lub ropnym. Wymaga już pomocy specjalisty – podologa lub lekarza.',
                options: [
                  { text: 'Tylko bólem przy ucisku bez wycieku', isCorrect: false },
                  { text: 'Obrzękiem, zaczerwienieniem i wyciekiem z wału', isCorrect: true },
                  { text: 'Przerośniętym wałem z ziarniną zapalną', isCorrect: false },
                  { text: 'Całkowitym brakiem objawów bólowych', isCorrect: false },
                ]
              }
            ]
          }
        }
      ]
    },
    {
      title: 'Zapobieganie i prawidłowa pielęgnacja',
      lessons: [
        {
          title: 'Prawidłowe obcinanie i piłowanie paznokci stóp',
          slug: 'obcinanie-paznokci-stopy',
          type: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: `
<h2>Złota zasada: prosto i nie za krótko</h2>
<p>Najważniejsza zasada pielęgnacji paznokci stóp to <strong>obcinanie ich prostą linią</strong>, bez zaokrąglania bocznych krawędzi. Boczne krawędzie powinny być widoczne po obcięciu i sięgać do linii opuszka palca lub nieznacznie wystawać.</p>

<h2>Krok po kroku – jak obcinać paznokcie stóp?</h2>
<ol>
  <li><strong>Namocz stopy</strong> – 5–10 minut w ciepłej wodzie zmiękczy płytkę i ułatwi cięcie. Można dodać sól morską lub kilka kropel olejku z drzewa herbacianego.</li>
  <li><strong>Osusz dokładnie</strong> – szczególnie przestrzenie między palcami.</li>
  <li><strong>Użyj ostrego narzędzia</strong> – tępe obcinaczki szarpią płytkę i powodują mikrourazy. Używaj obcinaczki do paznokci stóp (prostej krawędzi) lub nożyczek do paznokci z prostym ostrzem.</li>
  <li><strong>Tnij poziomo</strong> – jednym ruchem od strony do strony, bez wchodzenia klinem w boczne krawędzie.</li>
  <li><strong>Długość</strong> – krawędź paznokcia powinna sięgać do końca palca. Zbyt krótkie obcięcie odsłania łożysko i pozwala skórze wału „narosnąć" na krawędź.</li>
  <li><strong>Wygładź pilnikiem</strong> – pilnik jednorazowy lub szklany (nie metalowy) wygładzaj w jednym kierunku, bez piłowania w przód i tył.</li>
</ol>

<h2>Czego unikać</h2>
<ul>
  <li><strong>Nie wkopuj obcinaczki w boczne kąty</strong> – to klasyczna droga do wrastania.</li>
  <li><strong>Nie obcinaj mokrych paznokci bez ich wcześniejszego osuszenia</strong> – mokra płytka ugina się i cięcie jest nierówne.</li>
  <li><strong>Nie odrywaj paznokcia ręcznie</strong> – ryzyko pęknięcia głęboko w łożysko.</li>
  <li><strong>Nie obcinaj raz na kwartał</strong> – paznokieć odrasta nierównomiernie i łatwiej o deformacje. Optymalna częstotliwość: co 3–4 tygodnie.</li>
</ul>

<h2>Pielęgnacja bocznych krawędzi</h2>
<p>Jeśli boczna krawędź jest ostra lub szczypie skórę – <strong>wygładź ją pilnikiem pod kątem 45°</strong>, nie obcinaj. Usunięcie krawędzi obcinaczką skraca paznokieć od strony bocznej i sprzyja wrastaniu przy odroście.</p>
`
        },
        {
          title: 'Dobór obuwia i skarpet – jak chronić paznokcie',
          slug: 'obuwie-skarpety-paznokcie',
          type: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: `
<h2>Obuwie a wrastające paznokcie</h2>
<p>Szacuje się, że <strong>ponad 60% problemów z wrastającymi paznokciami</strong> ma związek z niewłaściwym obuwiem. Zarówno za ciasne buty z przodu, jak i zbyt miękkie obuwie bez stabilizacji pięty mogą sprzyjać wrastaniu.</p>

<h2>Jak dobierać obuwie?</h2>
<ul>
  <li><strong>Między paluchem a czubkiem buta</strong> powinno być minimum <strong>1 cm luzu</strong> – tyle, ile grubość kciuka.</li>
  <li><strong>Szerokość</strong> – palce nie powinny być ściśnięte bocznie. Przy szerokim śródstopiu wybieraj modele z oznaczeniem „W" (wide) lub „wide fit".</li>
  <li><strong>Materiał</strong> – naturalna skóra lub oddychające tkaniny techniczne. Unikaj butów z twardego plastiku bez wentylacji.</li>
  <li><strong>Miarka popołudniowa</strong> – stopa puchnie w ciągu dnia (szczególnie przy pracy na stojąco). Mierz stopę i kupuj buty <strong>po południu</strong>.</li>
  <li><strong>Ostrość nosa</strong> – obuwie z bardzo wąskim lub zaostrzonym noskiem kompresuje palce. Wybieraj zaokrągloną lub kwadratową linię przodu.</li>
</ul>

<h2>Skarpety – niedoceniony element</h2>
<ul>
  <li><strong>Materiał</strong> – bawełna, wełna merino lub tkaniny oddychające (coolmax, bamboo). Unikaj syntetyków przy tendencji do pocenia stóp.</li>
  <li><strong>Długość</strong> – skarpeta musi swobodnie obejmować palce. Zbyt krótka skarpeta „zesuwa się" i tworzy ucisk w strefie paznokci.</li>
  <li><strong>Szwy</strong> – przy wrażliwych palcach wybieraj skarpety „bezszwowe" lub z szwem po zewnętrznej stronie palców.</li>
  <li><strong>Zmiana</strong> – skarpety zmieniaj codziennie, przy intensywnej pracy fizycznej nawet dwa razy dziennie.</li>
</ul>

<h2>Specjalne wkładki</h2>
<p>Wkładki ortopedyczne mogą wyrównać biomechanikę chodu i zmniejszyć nacisk boczny na palucha – szczególnie ważne przy płaskostopiu, koślawości lub hallux valgus. Warto skonsultować się z podologiem lub ortopedą w sprawie indywidualnego dopasowania.</p>
`
        },
        {
          title: 'Co robić, gdy paznokieć zaczyna wrastać – pierwsza pomoc',
          slug: 'pierwsza-pomoc-wrastajacy',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Stopień I – możesz działać samodzielnie</h2>
<p>Jeśli paznokieć dopiero zaczyna wrastać (ból tylko przy ucisku, brak wycieku), możesz wdrożyć domowe postępowanie. Przy objawach stopnia II lub III – idź do podologa.</p>

<h2>Kąpiel z solą i środkiem antyseptycznym</h2>
<p>Moczenie w ciepłej wodzie z solą morską (1–2 łyżki na miskę) przez 15–20 minut:</p>
<ul>
  <li>Zmiękcza skórę wału, ułatwiając delikatne odsunięcie tkanek</li>
  <li>Działa przeciwzapalnie i antyseptycznie</li>
  <li>Zmniejsza obrzęk i ból</li>
</ul>
<p>Po kąpieli osusz stopę i nałóż preparat antyseptyczny (np. oczyszczony spirytus salicylowy, lub żel z olejkiem z drzewa herbacianego).</p>

<h2>Delikatne odsunięcie wału</h2>
<p>Po namoczeniu, sterylnym patyczkiem (lub drewnianą wykałaczką owiniętą gazą) delikatnie odsuń wał skórny od krawędzi paznokcia. <strong>Nie forsuj</strong> – celem jest tylko nieznaczne zmniejszenie nacisku, nie wyjęcie paznokcia.</p>

<h2>Podłożenie waty lub gazy</h2>
<p>Pod krawędź wrastającego paznokcia można podłożyć mały wałeczek z czystej bawełnianej gazy lub specjalny klin z gumy silikonowej (dostępny w aptece). To unosi krawędź paznokcia i zmniejsza kontakt z wałem. Wałeczek należy wymieniać codziennie po kąpieli.</p>

<h2>Plaster antywrastający</h2>
<p>W aptekach dostępne są specjalne plastry (np. Scholl, Urgo) z ząbkowaną krawędzią, które mechanicznie odciągają wał od paznokcia. Stosuj zgodnie z ulotką producenta.</p>

<h2>Kiedy bezwzględnie iść do podologa lub lekarza?</h2>
<ul>
  <li>Pojawił się wyciek ropny lub surowiczy</li>
  <li>Wał jest wyraźnie przerośnięty (ziarnina)</li>
  <li>Ból uniemożliwia normalne chodzenie</li>
  <li>Stan nie poprawia się po 3–4 dniach domowego leczenia</li>
  <li>Masz cukrzycę, zaburzenia krążenia lub odporności – w tych przypadkach KAŻDE wrastanie to wskazanie do szybkiej konsultacji</span></li>
</ul>

<blockquote>
  <strong>Uwaga:</strong> Nie próbuj samodzielnie wycinać rogów paznokcia ani „wyjmować" wrastającego fragmentu nożyczkami. Domowe operacje mogą prowadzić do zakażenia i powikłań trudnych do leczenia.
</blockquote>
`
        }
      ]
    }
  ]
};

// ─── KURS 2: Grzybica stóp i paznokci ─────────────────────────────────────────

const courseGrzybica: CourseData = {
  title: 'Grzybica stóp i paznokci – rozpoznanie, leczenie i profilaktyka',
  slug: 'grzybica-stop-i-paznokci',
  description: 'Naucz się rozpoznawać grzybicę stóp i paznokci, rozumieć jej przyczyny oraz skutecznie jej zapobiegać. Dowiedz się, jakie metody leczenia są dostępne i jak zadbać o higienę, by uchronić siebie i bliskich.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 65,
  tags: ['grzybica', 'stopy', 'paznokcie', 'higiena', 'profilaktyka', 'podologia'],
  modules: [
    {
      title: 'Czym jest grzybica i jak ją rozpoznać',
      lessons: [
        {
          title: 'Grzyby, które atakują stopy – rodzaje i objawy',
          slug: 'grzyby-rodzaje-objawy',
          type: 'TEXT',
          estimatedMinutes: 14,
          contentHtml: `
<h2>Co to jest grzybica?</h2>
<p>Grzybica stóp (<em>tinea pedis</em>) i paznokci (<em>onychomycosis</em>) to infekcje wywoływane przez mikroskopijne grzyby. To jedna z najczęstszych chorób skóry na świecie – szacuje się, że dotyka nawet <strong>20–25% populacji</strong>.</p>

<h2>Główne rodzaje grzybów atakujących stopy</h2>
<ul>
  <li><strong>Dermatofity</strong> – najczęstsza przyczyna (ok. 90% przypadków). Żywią się keratiną skóry i paznokci. Najważniejsze: <em>Trichophyton rubrum</em>, <em>T. interdigitale</em>.</li>
  <li><strong>Drożdżaki (Candida)</strong> – częściej atakują osoby z osłabionym układem odpornościowym, cukrzycą lub przyjmujące antybiotyki.</li>
  <li><strong>Pleśnie (non-dermatophytes)</strong> – rzadziej, ale mogą zaatakować uszkodzony paznokieć, szczególnie u starszych osób.</li>
</ul>

<h2>Objawy grzybicy skóry stóp</h2>
<p>Grzybica skóry objawia się w kilku wzorcach:</p>
<ul>
  <li><strong>Forma międzypalcowa</strong> – najczęstsza. Maceracja, złuszczanie, pęknięcia i świąd skóry między palcami, szczególnie w przestrzeni 3–4 i 4–5 palca.</li>
  <li><strong>Forma podeszwowa (mokasyn)</strong> – suche, łuszczące się zmiany obejmujące podeszwę i boki stopy w kształcie mokasyna. Charakterystyczne srebrzystobiałe złuszczanie.</li>
  <li><strong>Forma pęcherzowa (dyshidrotyczna)</strong> – swędzące pęcherzyki z treścią surowiczą, głównie po wewnętrznej stronie stopy i na palcach.</li>
</ul>

<h2>Objawy grzybicy paznokci</h2>
<p>Grzybica paznokci (<em>onychomycosis</em>) zmienia wygląd płytki:</p>
<ul>
  <li>Zażółcenie, zbielenie lub brunatne przebarwienie paznokcia</li>
  <li>Pogrubienie i kruchość płytki</li>
  <li>Oddzielanie paznokcia od łożyska (onycholysis) – przestrzeń pod płytką wypełnia się brunatnymi masami</li>
  <li>Sypki, krusząc się materiał pod paznokciem</li>
  <li>Deformacja kształtu płytki</li>
</ul>

<h2>Jak odróżnić grzybicę od innych zmian?</h2>
<p>Podobne objawy mogą dawać:</p>
<ul>
  <li><strong>Łuszczyca paznokci</strong> – wgłębienia (pitting), olejowe przebarwienia, ale zazwyczaj brak kruszenia się.</li>
  <li><strong>Uraz paznokcia</strong> – przebarwienie podpaznokciowe po uderzeniu, ciemna plama (wylew krwawy).</li>
  <li><strong>Linia Beaua</strong> – poprzeczne wgłębienie po chorobie ogólnoustrojowej.</li>
</ul>
<p>W razie wątpliwości badanie mykologiczne (wymaz lub wycinek paznokcia) pozwala potwierdzić diagnozę. Wykonuje się je w pracowniach dermatologicznych.</p>

<blockquote>
  <strong>Ważne:</strong> Grzybicy paznokci NIE można skutecznie wyleczyć samymi kosmetykami ani domowymi metodami. Wymaga stosowania leków – miejscowych lub ogólnych – pod kontrolą lekarza.
</blockquote>
`,
          quiz: {
            title: 'Sprawdź wiedzę – objawy i rozpoznanie grzybicy',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Który pathogen jest najczęstszą przyczyną grzybicy stóp?',
                explanation: 'Dermatofity, przede wszystkim Trichophyton rubrum i T. interdigitale, odpowiadają za około 90% przypadków grzybicy stóp i paznokci.',
                options: [
                  { text: 'Candida albicans', isCorrect: false },
                  { text: 'Dermatofity (np. Trichophyton rubrum)', isCorrect: true },
                  { text: 'Pleśnie (non-dermatophytes)', isCorrect: false },
                  { text: 'Bakterie gronkowca', isCorrect: false },
                ]
              },
              {
                text: 'Forma podeszwowa grzybicy (typ moksyn) charakteryzuje się:',
                explanation: 'Forma podeszwowa (mokasyn) daje obraz suchych, łuszczących się zmian na podeszwie i bokach stopy z charakterystycznym srebrzystobiałym złuszczaniem.',
                options: [
                  { text: 'Swędzącymi pęcherzykami na podeszwie', isCorrect: false },
                  { text: 'Macerowaną, złuszczającą skórą między palcami', isCorrect: false },
                  { text: 'Suchym, łuszczącym złuszczaniem podeszwy i boków stopy', isCorrect: true },
                  { text: 'Brunatnymi przebarwieniami pod paznokciem', isCorrect: false },
                ]
              }
            ]
          }
        },
        {
          title: 'Skąd bierze się grzybica i kto jest narażony',
          slug: 'przyczyny-grzybicy-czynniki-ryzyka',
          type: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: `
<h2>Jak dochodzi do zakażenia?</h2>
<p>Grzyby wywołujące grzybicę stóp są <strong>wszechobecne w środowisku</strong>. Do zakażenia dochodzi przez kontakt ze zarodnikami lub strzępkami grzybni na:</p>
<ul>
  <li>Podłogach basenów, saun, pryszniców publicznych i siłowni</li>
  <li>Wspólnych mat, ręcznikach, kapciach</li>
  <li>Własnych butach (jeśli już doszło do pierwszego zakażenia)</li>
</ul>
<p>Zakażenie następuje najłatwiej, gdy skóra jest <strong>zmacerowana (wilgotna przez dłuższy czas)</strong>, uszkodzona (otarcia, pęknięcia) lub gdy odporność lokalna jest obniżona.</p>

<h2>Czynniki ryzyka</h2>
<ul>
  <li><strong>Praca fizyczna i długotrwałe noszenie zamkniętego obuwia</strong> – pot i ciepło tworzą idealne warunki dla grzybów</li>
  <li><strong>Korzystanie z basenów, saun, wspólnych szatni</strong></li>
  <li><strong>Cukrzyca</strong> – zaburzone ukrwienie i obniżona odporność skóry</li>
  <li><strong>Podeszły wiek</strong> – wolniejsza odnowa naskórka i gorsze ukrwienie obwodowe</li>
  <li><strong>Nadmierna potliwość stóp (hiperhydroza)</strong></li>
  <li><strong>Urazy paznokci</strong> – uszkodzona płytka łatwiej ulega kolonizacji</li>
  <li><strong>Antybiotykoterapia</strong> – niszczy naturalną florę bakteryjną, otwierając drogę grzybom</li>
  <li><strong>Nieodpowiednia higiena obuwia</strong> – buty są rezerwuarem zarodników</li>
</ul>

<h2>Grzybica jest zaraźliwa</h2>
<p>Grzybica stóp i paznokci jest <strong>zakaźna</strong> – możesz zarazić innych i siebie (np. przenosząc grzyby z paznokci na skórę stopy lub ręce). Dlatego profilaktyka i leczenie są ważne nie tylko dla siebie, ale i dla otoczenia.</p>
`
        }
      ]
    },
    {
      title: 'Leczenie i skuteczna profilaktyka',
      lessons: [
        {
          title: 'Jak leczyć grzybicę stóp i paznokci',
          slug: 'leczenie-grzybicy',
          type: 'TEXT',
          estimatedMinutes: 14,
          contentHtml: `
<h2>Leczenie grzybicy skóry stóp</h2>
<p>Grzybicę skóry w lekkich do umiarkowanych przypadkach można leczyć <strong>preparatami miejscowymi</strong> (bez recepty lub na receptę). Najważniejsze substancje czynne:</p>
<ul>
  <li><strong>Terbinafina</strong> (krem, żel, spray) – fungicydalna, działa na dermatofity; standardowy czas leczenia: 1–2 tygodnie</li>
  <li><strong>Clotrimazol, mikonazol, ekonazol</strong> – pochodne azolowe, szerokie spektrum (dermatofity + Candida); leczenie: 4 tygodnie</li>
  <li><strong>Tolnaftat</strong> – starszy preparat, dostępny bez recepty</li>
</ul>
<p>Preparat nakłada się na czystą, osuszoną skórę 1–2 razy dziennie, przez <strong>zalecany czas kuracji</strong> – nawet jeśli objawy ustąpią szybciej. Skrócenie kuracji to główna przyczyna nawrotów.</p>

<h2>Leczenie grzybicy paznokci</h2>
<p>Grzybica paznokci jest trudniejsza do wyleczenia ze względu na słabą penetrację leków przez twardą płytkę. Opcje:</p>
<ul>
  <li><strong>Lakiery lecznicze</strong> (amorolfina, ciclopirox) – nakładane na paznokieć 1–2 razy w tygodniu przez 6–12 miesięcy. Skuteczne przy zajęciu do 50% płytki bez korzenia.</li>
  <li><strong>Leki doustne</strong> (terbinafina, flukonazol, itrakonazol) – przepisywane przez lekarza. Wyższa skuteczność, ale ryzyko interakcji i obciążenia wątroby. Leczenie: 3–6 miesięcy.</li>
  <li><strong>Terapia laserowa</strong> – dostępna w gabinetach podologicznych, pomocnicza, nie zastępuje leków.</li>
</ul>

<h2>Dezynfekcja obuwia – kluczowy krok</h2>
<p>Buty to rezerwuar grzybów. Bez ich dezynfekcji leczenie będzie nieskuteczne – ponowne zakażenie z własnego obuwia to najczęstsza przyczyna nawrotów.</p>
<ul>
  <li>Spryskaj wnętrze butów preparatem przeciwgrzybiczym (np. Mycolek, Lamisil spray)</li>
  <li>Zostaw buty do wyschnięcia przez 24 godziny</li>
  <li>Dezynfekuj regularnie przez cały czas leczenia</li>
  <li>Rozważ wyrzucenie starych, mocno przetartych butów – szczególnie tych, w których stopy pociły się przez długi czas</li>
</ul>

<h2>Pralnia i ręczniki</h2>
<ul>
  <li>Ręczniki praj w temperaturze min. <strong>60°C</strong></li>
  <li>Używaj oddzielnego ręcznika do stóp</li>
  <li>Skarpety praj w min. 60°C; można użyć dodatku z olejkiem z drzewa herbacianego lub octem</li>
</ul>
`
        },
        {
          title: 'Higiena stóp i zapobieganie nawrotom',
          slug: 'higiena-profilaktyka-grzybica',
          type: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: `
<h2>Codzienna higiena – klucz do zapobiegania</h2>
<p>Grzyby rozwijają się w środowiskach <strong>ciepłych, wilgotnych i słabo wentylowanych</strong>. Codzienna higiena eliminuje te warunki.</p>

<h2>Zasady codziennej pielęgnacji stóp</h2>
<ol>
  <li><strong>Myj stopy codziennie</strong> – ciepłą (nie gorącą) wodą z łagodnym mydłem lub żelem antybakteryjnym. Dokładnie myj przestrzenie między palcami.</li>
  <li><strong>Osuszaj dokładnie</strong> – szczególnie między palcami. Wilgoć to pożywka dla grzybów. Użyj miękkiego ręcznika lub suszarki do włosów na zimnym nawiewie.</li>
  <li><strong>Aplikuj puder lub spray</strong> – przy tendencji do pocenia stóp stosuj puder absorbujący (talk, skrobia kukurydziana, preparaty z Clotrimazolem) lub antyperspirant do stóp.</li>
  <li><strong>Nawilżaj, ale nie między palcami</strong> – krem nakładaj na podeszwę i piętę, omijając przestrzenie między palcami, gdzie wilgoć jest niepożądana.</li>
</ol>

<h2>W miejscach publicznych</h2>
<ul>
  <li>Zawsze noś klapki na basenie, w saunach, przysznicach publicznych i hotelowych łazienkach</li>
  <li>Nie pożyczaj obuwia, skarpet ani ręczników</li>
  <li>Po basenie czy siłowni osusz stopy zanim założysz skarpety i buty</li>
</ul>

<h2>Wybór obuwia pod kątem profilaktyki grzybiczej</h2>
<ul>
  <li>Preferuj buty z <strong>naturalnych materiałów</strong> (skóra, canvas) lub oddychających tworzyw technicznych</li>
  <li>Zmieniaj buty co kilka dni, dając im czas na wyschnięcie</li>
  <li>Stosuj wkładki antybakteryjne lub przeciwgrzybicze (dostępne w aptekach)</li>
  <li>Unikaj noszenia tych samych butów przez wiele dni z rzędu</li>
</ul>

<blockquote>
  <strong>Pamiętaj:</strong> Wyleczenie grzybicy paznokci zajmuje miesiące, a nowy, zdrowy paznokieć odrasta powoli. Nie przerywaj kuracji, gdy objawy zmaleją – to najczęstszy błąd prowadzący do nawrotu.
</blockquote>
`,
          quiz: {
            title: 'Sprawdź wiedzę – leczenie i profilaktyka grzybicy',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Dlaczego dezynfekcja obuwia jest konieczna podczas leczenia grzybicy?',
                explanation: 'Buty są rezerwuarem zarodników grzybów. Bez ich dezynfekcji dochodzi do ponownego zakażenia z własnego obuwia – to najczęstsza przyczyna nawrotów grzybicy mimo prawidłowego leczenia skóry lub paznokci.',
                options: [
                  { text: 'Żeby buty ładniej pachniały', isCorrect: false },
                  { text: 'Bo grzyby przeżywają w butach i powodują nawroty', isCorrect: true },
                  { text: 'Tylko przy grzybicy wywołanej Candida', isCorrect: false },
                  { text: 'Dezynfekcja obuwia nie jest potrzebna', isCorrect: false },
                ]
              },
              {
                text: 'Jak dokładnie należy osuszać stopy po myciu?',
                explanation: 'Dokładne osuszenie przestrzeni między palcami jest kluczowe – wilgoć między palcami tworzy idealne środowisko dla grzybów. Nawilżacz kremem nakłada się na podeszwę i piętę, omijając przestrzenie między palcami.',
                options: [
                  { text: 'Wystarczy szybko przetrzeć stopę, wilgoć sama wyparuje', isCorrect: false },
                  { text: 'Szczególnie dokładnie między palcami – tam wilgoć sprzyja grzybicy', isCorrect: true },
                  { text: 'Nie trzeba osuszać, krem nawilżający wystarczy', isCorrect: false },
                  { text: 'Gorącą wodą sama zabija grzyby, nie trzeba osuszać', isCorrect: false },
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── KURS 3: Stopy w butach BHP ───────────────────────────────────────────────

const courseBHP: CourseData = {
  title: 'Stopy w pracy – pielęgnacja stóp obciążonych butami BHP',
  slug: 'stopy-buty-bhp',
  description: 'Kurs dedykowany osobom pracującym w obuwiu ochronnym: pracownikom budowlanym, magazynierów, pracownikom produkcji i służb mundurowych. Dowiedz się, jak chronić stopy przed odciskami, modzele, pęcherzami i przewlekłym zmęczeniem.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 70,
  tags: ['stopy', 'buty BHP', 'praca fizyczna', 'odciski', 'modzele', 'pielęgnacja', 'zmęczenie stóp'],
  modules: [
    {
      title: 'Dlaczego buty BHP są problematyczne dla stóp',
      lessons: [
        {
          title: 'Jak buty BHP wpływają na zdrowie stóp',
          slug: 'buty-bhp-wplyw-na-stopy',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Buty BHP – ochrona i wyzwanie</h2>
<p>Buty bezpieczne i ochronne (BHP) ratują życie i zdrowie – chronią przed uderzeniami, przebiciami, poślizgiem i chemikaliami. Jednak ich konstrukcja, wymagana normami bezpieczeństwa, niesie ze sobą <strong>wyzwania dla zdrowia stóp</strong>.</p>

<h2>Cechy butów BHP, które obciążają stopy</h2>
<ul>
  <li><strong>Ciężar</strong> – stal lub kompozyt chroniący palce, podnoszone podeszwy z wkładką antyprzebiciową. Buty BHP ważą nawet 3–4× więcej niż zwykłe obuwie. Noszenie ich przez 8–12 godzin to ogromny wysiłek dla mięśni nóg i stóp.</li>
  <li><strong>Sztywność konstrukcji</strong> – mała elastyczność podeszwy zmienia biomechanikę chodu, ogranicza naturalne odbicie od podłoża i przeciąża ścięgno Achillesa oraz powięź podeszwową.</li>
  <li><strong>Słaba wentylacja</strong> – zamknięta, szczelna konstrukcja powoduje znaczne pocenie stóp. Wilgotna skóra jest bardziej podatna na otarcia, macerację i grzybice.</li>
  <li><strong>Sztywny nosek ochronny</strong> – toecap ze stali lub kompozytu uciska palce, szczególnie przy chodzeniu po nierównym terenie lub wchodzeniu po schodach.</li>
  <li><strong>Brak amortyzacji</strong> – wiele modeli budżetowych ma twarde, nieamortyzujące podeszwy. Pracownicy chodzący po betonie przez całą zmianę narażeni są na wstrząsy przenoszone do kolan i kręgosłupa.</li>
</ul>

<h2>Najczęstsze problemy stóp u pracowników w butach BHP</h2>
<ul>
  <li><strong>Odciski i modzele</strong> – rogowacenie skóry jako ochronna reakcja na powtarzające się tarcie i ucisk</li>
  <li><strong>Pęcherze</strong> – przy nowych butach lub długich zmianach</li>
  <li><strong>Wrastające paznokcie</strong> – ucisk boczny twardego noszka na palucha</li>
  <li><strong>Grzybica</strong> – wilgotne środowisko przez całą zmianę</li>
  <li><strong>Fasciitis plantaris (zapalenie powięzi podeszwowej)</strong> – ból przy pierwszych krokach rano, charakterystyczny dla pracy na twardym podłożu w butach bez amortyzacji</li>
  <li><strong>Obrzęki stóp i kostek</strong> – przy długotrwałym staniu lub chodzeniu</li>
</ul>
`
        },
        {
          title: 'Odciski, modzele i pęcherze – czym różnią się i jak reagować',
          slug: 'odciski-modzele-pecherze',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Odcisk (callus vs corn)</h2>
<p>Skóra reaguje na powtarzający się ucisk i tarcie <strong>pogrubieniem naskórka</strong> – to naturalna ochrona. Problem pojawia się, gdy rogowacenie staje się nadmierne.</p>
<ul>
  <li><strong>Modzele (callus)</strong> – rozległe, płaskie zgrubienia naskórka na podeszwie, piętach, głowach kości śródstopia. Zazwyczaj niebolesne. Są odpowiedzią na rozłożone obciążenie.</li>
  <li><strong>Odciski (corn – nagniotek)</strong> – małe, okrągłe, twarde zrogowacenia z twardym rdzeniem wbitym w głąb skóry. Bardzo bolesne przy ucisku. Najczęściej między palcami (miękkie, białawe) lub na grzbietach palców (twarde, żółtawe).</li>
</ul>

<h2>Jak postępować z modzeli?</h2>
<ol>
  <li>Mocz stopy w ciepłej wodzie z solą przez 15–20 minut</li>
  <li>Użyj pumeksu lub tarki do stóp, by delikatnie ścierać zrogowaciały naskórek – <strong>nie ścieraj do krwi</strong></li>
  <li>Nałóż bogaty krem z mocznikiem (10–20%) lub kwasem salicylowym – rozmiękcza zrogowaciałą skórę</li>
  <li>Regularność jest kluczowa – jeden zabieg tygodniowo utrzymuje skórę w dobrym stanie</li>
</ol>

<h2>Jak postępować z odciskami?</h2>
<p>Odciski (nagniotki) wymagają eliminacji przyczyny (zmiana obuwia, wkładka odciążająca) i stopniowego usunięcia przez:</p>
<ul>
  <li>Plastry keratolotyczne z kwasem salicylowym (np. Corn Caps, Salipax) – stosować zgodnie z ulotką, chronić zdrową skórę plastrami ochronnymi</li>
  <li>Zabieg podologiczny – mechaniczne usunięcie rdzenia specjalną frezarką lub skalpelem. Nie próbuj samodzielnie wycinać rdzenia – ryzyko zakażenia.</li>
</ul>

<h2>Pęcherze</h2>
<p>Pęcherze powstają przez tarcie (nowe buty, długa zmiana). Postępowanie:</p>
<ul>
  <li><strong>Małe pęcherze</strong> – zabezpiecz plastrem hydrokoloidowym (np. Compeed). NIE przebijaj – zawartość pęcherza chroni przed zakażeniem.</li>
  <li><strong>Duże, napięte, bolesne pęcherze</strong> – możesz przekłuć sterylną igłą (zdezynfekowaną spirytusem) przy brzegu, wypuścić treść, ale pozostawić skórę na miejscu jako ochronę. Przykryj plastrem.</li>
  <li><strong>Pęcherz pęknięty</strong> – oczyść, nałóż preparat antyseptyczny, zabezpiecz sterylnym opatrunkiem.</li>
</ul>

<blockquote>
  <strong>Uwaga dla diabetyków:</strong> Każde uszkodzenie skóry stóp przy cukrzycy wymaga kontroli lekarskiej. Nie stosuj samodzielnie preparatów keratolotycznych (kwas salicylowy, mocznik >10%) bez konsultacji.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Rutyna pielęgnacyjna dla pracownika fizycznego',
      lessons: [
        {
          title: 'Poranna rutyna – przed pracą',
          slug: 'rutyna-poranna-bhp',
          type: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: `
<h2>Przygotowanie stóp do ciężkiego dnia</h2>
<p>Kilka minut rano może znacząco zmniejszyć dyskomfort po całej zmianie. Regularność tej rutyny przynosi efekty już po tygodniu.</p>

<h2>Poranna rutyna krok po kroku</h2>
<ol>
  <li><strong>Dokładnie osusz stopy</strong> po prysznicu, szczególnie między palcami.</li>
  <li><strong>Nałóż krem ochronny na pięty i podeszwę</strong> – lekki krem z mocznikiem 5–10% lub krem ochronny do stóp. Omijaj palce i przestrzenie między nimi – tam nie chcesz wilgoci.</li>
  <li><strong>Posyp wnętrze butów pudrem przeciwgrzybiczym</strong> – talk lub gotowy puder do stóp (np. Daktarin puder, Mycospor). Redukuje wilgoć i zapobiega grzybicy.</li>
  <li><strong>Wybierz właściwe skarpety</strong> – do pracy fizycznej w butach BHP wybieraj skarpety z podwójną podeszwą lub wzmocnioną piętą i palcami. Materiał: wełna merino lub bawełna z domieszką lycry. Unikaj 100% bawełny – zatrzymuje wilgoć.</li>
  <li><strong>Sprawdź wkładkę w bucie</strong> – stara, splaszczona wkładka nie amortyzuje. Wymień ją na ergonomiczną wkładkę amortyzującą (piankę poliuretanową lub żelową) dopasowaną do pracy na twardym podłożu.</li>
  <li><strong>Zabezpiecz potencjalne punkty tarcia</strong> – jeśli wiesz, gdzie masz tendencję do pęcherzy lub otarć, nałóż tam plaster hydrokoloidowy prewencyjnie lub specjalny balsam antytarciowy.</li>
</ol>
`
        },
        {
          title: 'Wieczorna rutyna – regeneracja po pracy',
          slug: 'rutyna-wieczorna-bhp',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Po pracy – czas dla stóp</h2>
<p>Wieczorna pielęgnacja to <strong>najważniejsza inwestycja</strong> w zdrowie stóp pracownika fizycznego. Zaniedbana przez tygodnie i miesiące skóra stóp staje się coraz trudniejsza do utrzymania w dobrej kondycji.</p>

<h2>Wieczorna rutyna krok po kroku</h2>
<ol>
  <li><strong>Wyjmij wkładki z butów i zostaw buty do wyschnięcia</strong> – nie wkładaj jutrzejszych skarpet do wilgotnych butów.</li>
  <li><strong>Kąpiel lub prysznic stóp</strong> – ciepła woda (38–40°C), 10–15 minut. Możesz dodać:
    <ul>
      <li>Sól morską lub himalajską – przeciwzapalna, rozluźniająca</li>
      <li>Olejek z drzewa herbacianego (3–4 krople) – antybakteryjny i przeciwgrzybiczy</li>
      <li>Sodę oczyszczoną – neutralizuje kwas mlekowy, łagodzi zmęczenie</li>
      <li>Ocet jabłkowy (3–4 łyżki) – przy tendencji do grzybicy lub nieprzyjemnego zapachu</li>
    </ul>
  </li>
  <li><strong>Dokładnie osusz stopy</strong> – ręcznikiem lub suszarką (zimny nawiew) zwracając uwagę na przestrzenie między palcami.</li>
  <li><strong>Nałóż krem regenerujący na stopy</strong>:
    <ul>
      <li>Pięty i podeszwa – krem z mocznikiem 15–25% lub krem z kwasem mlekowym (rozmiękczają modzele, nawilżają głęboko)</li>
      <li>Okolica paznokci i wały – krem z pantenolem lub olejek (np. z drzewa herbacianego, jojoba)</li>
      <li>Nie nakładaj kremu między palce</li>
    </ul>
  </li>
  <li><strong>Masaż stóp</strong> – 3–5 minut wystarczy. Pracuj kciukami wzdłuż podeszwy, od pięty ku palcom. Rozluźnia powięź, poprawia krążenie i przyspiesza regenerację.</li>
  <li><strong>Opcjonalnie: skarpety bawełniane na noc</strong> – po nałożeniu grubego kremu włóż cienkie bawełniane skarpety. Okluzyjna metoda maksymalizuje nawilżenie skóry przez noc.</li>
</ol>

<h2>Raz w tygodniu – głębsza pielęgnacja</h2>
<ul>
  <li>Dłuższa kąpiel (20 minut)</li>
  <li>Delikatne opracowanie pumeksem lub tarką do stóp zrogowaciałego naskórka</li>
  <li>Maść na noc z mocznikiem 30% lub mocznikiem + kwasem salicylowym (dostępna w aptece)</li>
  <li>Obcięcie i opracowanie paznokci (prosto, bez zaokrąglania krawędzi)</li>
</ul>
`,
          quiz: {
            title: 'Sprawdź wiedzę – rutyna pielęgnacyjna',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Dlaczego do pracy w butach BHP lepiej wybierać skarpety z wełny merino lub mieszanek technicznych zamiast 100% bawełny?',
                explanation: 'Wełna merino i materiały techniczne odprowadzają wilgoć od skóry na zewnątrz (właściwość "moisture wicking"), podczas gdy 100% bawełna zatrzymuje pot przy skórze, tworząc wilgotne środowisko sprzyjające otarciom i grzybicy.',
                options: [
                  { text: 'Bawełna jest za droga na skarpety robocze', isCorrect: false },
                  { text: 'Bawełna zatrzymuje wilgoć przy skórze, co sprzyja otarciom i grzybicy', isCorrect: true },
                  { text: 'Wełna jest bardziej wytrzymała na tarcie w butach BHP', isCorrect: false },
                  { text: 'Materiał skarpet nie ma znaczenia przy butach BHP', isCorrect: false },
                ]
              },
              {
                text: 'Co dodać do kąpieli stóp przy tendencji do grzybicy?',
                explanation: 'Olejek z drzewa herbacianego (tea tree oil) ma udokumentowane działanie przeciwgrzybicze i antybakteryjne. Ocet jabłkowy zmienia pH środowiska, utrudniając namnażanie grzybów. Oba są pomocnicze – nie zastępują leczenia farmakologicznego.',
                options: [
                  { text: 'Szampon do włosów', isCorrect: false },
                  { text: 'Olejek z drzewa herbacianego lub ocet jabłkowy', isCorrect: true },
                  { text: 'Płyn do naczyń – odstrasza grzyby', isCorrect: false },
                  { text: 'Gorącą wodę powyżej 50°C, by zabić grzyby', isCorrect: false },
                ]
              }
            ]
          }
        },
        {
          title: 'Dobór wkładek i prawidłowy wybór butów BHP',
          slug: 'wkladki-dobor-butow-bhp',
          type: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: `
<h2>Wkładki do butów BHP – dlaczego mają znaczenie</h2>
<p>Fabryczne wkładki w butach BHP rzadko oferują odpowiednią amortyzację i podparcie łuku stopy. Po kilku tygodniach noszenia <strong>spłaszczają się do zera</strong>. Wymiana wkładek to najtańsza i najefektywniejsza inwestycja w komfort stóp przy pracy.</p>

<h2>Rodzaje wkładek i ich zastosowanie</h2>
<ul>
  <li><strong>Wkładki żelowe</strong> – świetna amortyzacja wstrząsów na twardym podłożu (beton, asfalt). Polecane dla pracowników chodzących wiele kilometrów dziennie.</li>
  <li><strong>Wkładki z pianki poliuretanowej (PU)</strong> – lżejsze od żelowych, dobre podparcie łuku, trwalsze. Dobry wybór ogólny.</li>
  <li><strong>Wkładki ortopedyczne półsztywne</strong> – dla osób z płaskostopiem, koślawością lub przewlekłym bólem pięty (fasciitis plantaris). Najlepiej dobierać indywidualnie u podologa lub ortopedy.</li>
  <li><strong>Wkładki antybakteryjne z jonami srebra lub węglem aktywnym</strong> – redukują zapach i hamują namnażanie bakterii i grzybów. Dobry wybór profilaktyczny.</li>
</ul>

<h2>Jak wybrać buty BHP, które mniej niszczą stopy?</h2>
<ul>
  <li><strong>Luz w nosie buta</strong> – minimum 1–1,5 cm. Przy staniu stopa nieco puchnie.</li>
  <li><strong>Szerokość</strong> – buty BHP dostępne są w różnych szerokościach. Szeroka stopa w wąskim bucie to prosta droga do odcisków i wrastających paznokci.</li>
  <li><strong>Waga</strong> – lżejsze buty (kompozytowy nosek zamiast stalowego) mniej obciążają mięśnie nóg przy długich zmianach.</li>
  <li><strong>Podeszwa</strong> – powinna być elastyczna w okolicy śródstopia. Całkowicie sztywna podeszwa utrudnia naturalne odbicie stopy.</li>
  <li><strong>Oddychalność</strong> – przy pracach nienarażonych na ciecze wybieraj modele z membraną (Gore-Tex, Sympatex) lub perforacją.</li>
  <li><strong>Regulacja</strong> – system sznurowania lub rzepów pozwala dostosować ciasność do opuchniętej stopy pod koniec zmiany.</li>
</ul>

<h2>Kiedy wymienić buty BHP?</h2>
<p>Buty BHP zwykle wytrzymują 12–18 miesięcy intensywnego użytkowania. Wymień je, gdy:</p>
<ul>
  <li>Podeszwa jest starta (zmniejszona ochrona przed poślizgiem)</li>
  <li>Nosek traci kształt lub jest widocznie uszkodzony</li>
  <li>Skóra lub tkanina są podziurawione lub starte</li>
  <li>Mimo nowych wkładek stopy bolą bardziej niż zwykle – but stracił swoją strukturę amortyzującą</li>
</ul>
`
        }
      ]
    }
  ]
};

// ─── KURS 4: Kompleksowa pielęgnacja stóp ────────────────────────────────────

const courseKompleksowa: CourseData = {
  title: 'Kompleksowa pielęgnacja stóp – od diagnozy do rutyny',
  slug: 'kompleksowa-pielegnacja-stop',
  description: 'Holistyczny przewodnik po pielęgnacji stóp dla każdego. Naucz się oceniać stan swoich stóp, wykonywać kąpiele lecznicze, prawidłowo nawilżać i masować stopy. Dowiedz się, kiedy niezbędna jest wizyta u podologa.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 80,
  tags: ['stopy', 'pielęgnacja', 'kąpiele', 'masaż', 'nawilżanie', 'podologia', 'zdrowie stóp'],
  modules: [
    {
      title: 'Ocena stanu stóp i diagnostyka domowa',
      lessons: [
        {
          title: 'Jak samodzielnie ocenić stan swoich stóp',
          slug: 'samoocena-stanu-stop',
          type: 'TEXT',
          estimatedMinutes: 14,
          contentHtml: `
<h2>Dlaczego warto regularnie oceniać swoje stopy?</h2>
<p>Stopy są najdalej wysuniętą częścią ciała i często pomijaną w codziennej pielęgnacji. Tymczasem wiele poważnych chorób ogólnoustrojowych (cukrzyca, choroby układu krążenia, niedobory witamin) jako pierwsze daje objawy właśnie na stopach. Regularna, świadoma ocena stóp pozwala wyłapać problemy we wczesnym stadium.</p>

<h2>Badanie stóp – co sprawdzać?</h2>
<p>Raz w tygodniu, w dobrym oświetleniu, obejrzyj swoje stopy (możesz użyć lusterka do trudno dostępnych miejsc):</p>

<h3>Skóra</h3>
<ul>
  <li><strong>Kolor</strong> – prawidłowa skóra stóp jest różowawa. Zaczerwienienie, sinienie, bielenie lub żółknięcie mogą sygnalizować problemy krążeniowe, zakażenia lub anemię.</li>
  <li><strong>Suchość i pęknięcia</strong> – pięty i boki stóp naturalnie mają tendencję do wysychania. Głębokie pęknięcia (szczeliny) mogą się zakażać.</li>
  <li><strong>Modzele i odciski</strong> – zanotuj, gdzie się pojawiają. To cenne wskazówki o nieprawidłowym obciążeniu stopy.</li>
  <li><strong>Pęcherzyki lub zmiany</strong> – między palcami, na podeszwie. Mogą sugerować grzybicę, alergię kontaktową lub infekcję wirusową (brodawki podeszwowe).</li>
  <li><strong>Obrzęki</strong> – jednostronny obrzęk stopy lub kostki wymaga diagnostyki lekarskiej.</li>
</ul>

<h3>Paznokcie</h3>
<ul>
  <li><strong>Kolor</strong> – prawidłowo jasnoróżowy lub lekko przezroczysty. Żółty, brązowy lub biały kolor może wskazywać na grzybicę.</li>
  <li><strong>Grubość i kruchość</strong> – pogrubiony, kruchy paznokieć – potencjalna grzybica.</li>
  <li><strong>Kształt</strong> – czy krawędzie są proste? Czy boczna krawędź nie wchodzi w wał skórny?</li>
  <li><strong>Wały paznokciowe</strong> – czerwone, opuchnięte, bolesne wały wymagają uwagi.</li>
</ul>

<h3>Struktura stopy</h3>
<ul>
  <li><strong>Łuk podłużny</strong> – między piętą a głowami kości śródstopia powinno być widoczne wklęśnięcie (łuk). Jego brak może wskazywać na płaskostopie.</li>
  <li><strong>Palce</strong> – czy układają się płasko? Palce młotkowate lub szponkowate są częste przy noszeniu za ciasnego obuwia przez lata.</li>
  <li><strong>Hallux valgus</strong> – odchylenie palucha w kierunku pozostałych palców z guzem po wewnętrznej stronie stopy u nasady palucha.</li>
</ul>

<h2>Kiedy iść do podologa?</h2>
<ul>
  <li>Ból stopy utrzymujący się ponad tydzień</li>
  <li>Podejrzenie grzybicy paznokci</li>
  <li>Wrastający paznokieć stopnia II lub III</li>
  <li>Brodawki podeszwowe (twardy, bolesny guzek z czarnymi punktami – zatkane naczynia krwionośne)</li>
  <li>Pęknięcia pięt z krwawieniem lub głębokie, bolesne szczeliny</li>
  <li>Cukrzyca – każda zmiana na stopach wymaga kontroli</li>
</ul>
`
        },
        {
          title: 'Kąpiele stóp – rodzaje, składniki i technika',
          slug: 'kapiele-stop',
          type: 'TEXT',
          estimatedMinutes: 14,
          contentHtml: `
<h2>Kąpiel stóp – więcej niż higiena</h2>
<p>Kąpiel stóp to nie tylko mycie – to terapeutyczny zabieg, który zmiękcza skórę, poprawia krążenie, rozluźnia mięśnie i działa relaksacyjnie na układ nerwowy. Przy odpowiednich dodatkach ma też działanie lecznicze.</p>

<h2>Podstawowe zasady kąpieli</h2>
<ul>
  <li><strong>Temperatura</strong> – 37–40°C. Zbyt gorąca woda (powyżej 42°C) podrażnia skórę, rozszerza naczynia krwionośne (ryzyko przy żylakach) i wysusza naskórek. Zbyt zimna nie zmiękcza rogowacenia.</li>
  <li><strong>Czas</strong> – 10–20 minut. Dłuższy czas maceruje skórę, co może zwiększać podatność na zakażenia grzybicze (szczególnie między palcami).</li>
  <li><strong>Po kąpieli</strong> – zawsze dokładnie osusz stopy, szczególnie między palcami, i nałóż odpowiedni krem.</li>
</ul>

<h2>Rodzaje kąpieli i składniki</h2>

<h3>Kąpiel z solą morską lub himalajską</h3>
<p>1–3 łyżki na miskę wody. Działanie: oczyszczające, przeciwobrzękowe, mineralizujące. Polecana po długim dniu w butach BHP lub przy obrzękniętych stopach.</p>

<h3>Kąpiel z sodą oczyszczoną</h3>
<p>2–3 łyżki na miskę. Działanie: łagodzi zmęczenie (neutralizuje kwas mlekowy), delikatnie złuszcza, zmiękcza modzele. Dobra wieczorna kąpiel regeneracyjna.</p>

<h3>Kąpiel z octem jabłkowym</h3>
<p>3–4 łyżki na miskę. Działanie: zmienia pH środowiska stopy na kwaśne (niekorzystne dla grzybów i bakterii), dezodoryzuje. Polecana profilaktycznie lub przy tendencji do grzybicy i nieprzyjemnego zapachu.</p>

<h3>Kąpiel z olejkami eterycznymi</h3>
<ul>
  <li><strong>Olejek z drzewa herbacianego</strong> (3–4 krople) – antybakteryjny, przeciwgrzybiczy</li>
  <li><strong>Olejek lawendowy</strong> (5 kropli) – relaksacyjny, łagodzi zmęczenie i bóle mięśniowe</li>
  <li><strong>Olejek miętowy</strong> (3 krople) – chłodzący, odświeżający przy uczuciu ciężkich nóg</li>
  <li><strong>Olejek eukaliptusowy</strong> (3 krople) – rozluźnia, łagodzi bóle stawów i mięśni</li>
</ul>
<p>Olejki eteryczne przed dodaniem do wody rozcieńcz w łyżce oliwy z oliwek lub mleka – nie są rozpuszczalne w wodzie.</p>

<h3>Kąpiel ze świeżego imbiru</h3>
<p>5 cm korzenia startego na tarce + łyżka soli. Działanie: silnie rozgrzewające, poprawia krążenie. Polecana przy zimnych stopach i przewlekłym zmęczeniu.</p>

<h2>Czego unikać w kąpielach stóp</h2>
<ul>
  <li>Płynów do naczyń i detergentów – wysuszają skórę</li>
  <li>Gorącej wody przy żylakach – rozszerza naczynia, ryzyko dolegliwości</li>
  <li>Zbyt długiego moczenia – maceruje skórę między palcami</li>
  <li>Kąpieli z solą przy otwartych ranach, pęknięciach z krwawieniem</li>
</ul>
`,
          quiz: {
            title: 'Sprawdź wiedzę – kąpiele stóp',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Jaka temperatura wody jest optymalna do kąpieli stóp?',
                explanation: 'Optymalna temperatura to 37–40°C – zbliżona do ciepłoty ciała lub nieco wyższa. Zbyt gorąca woda (powyżej 42°C) podrażnia skórę, wysusza ją i może być niebezpieczna przy żylakach lub zaburzeniach czucia (np. przy cukrzycy).',
                options: [
                  { text: 'Jak najgorętsza – zabija zarazki skuteczniej', isCorrect: false },
                  { text: '37–40°C – ciepła, ale nie parząca', isCorrect: true },
                  { text: 'Zimna – najlepsza dla krążenia', isCorrect: false },
                  { text: 'Temperatura nie ma znaczenia', isCorrect: false },
                ]
              },
              {
                text: 'Który składnik kąpieli stóp ma działanie przeciwgrzybicze?',
                explanation: 'Olejek z drzewa herbacianego (tea tree oil) ma udokumentowane naukowo działanie przeciwgrzybicze i antybakteryjne. Ocet jabłkowy zmienia pH na kwaśne, tworząc niekorzystne środowisko dla grzybów. Oba są dobrym wyborem profilaktycznym.',
                options: [
                  { text: 'Soda oczyszczona', isCorrect: false },
                  { text: 'Olejek lawendowy', isCorrect: false },
                  { text: 'Olejek z drzewa herbacianego lub ocet jabłkowy', isCorrect: true },
                  { text: 'Sól himalajska', isCorrect: false },
                ]
              }
            ]
          }
        }
      ]
    },
    {
      title: 'Nawilżanie, masaż i regeneracja stóp',
      lessons: [
        {
          title: 'Prawidłowe nawilżanie stóp – produkty i techniki',
          slug: 'nawilzanie-stop',
          type: 'TEXT',
          estimatedMinutes: 12,
          contentHtml: `
<h2>Skóra stóp i jej specyfika</h2>
<p>Skóra podeszwy stóp jest najgrubszym naskórkiem w całym ciele – nawet 4–5 mm na podeszwie, w porównaniu do 0,5–1 mm na twarzy. Nie posiada gruczołów łojowych, przez co jest szczególnie podatna na <strong>suchość, rogowacenie i pęknięcia</strong>. Regularne nawilżanie jest absolutną koniecznością.</p>

<h2>Składniki aktywne w kremach do stóp</h2>
<ul>
  <li><strong>Mocznik (urea)</strong> – kluczowy składnik. Mocznik 5–10% intensywnie nawilża; mocznik 15–25% zmiękcza modzele i rogowacenie; mocznik 30–40%+ ma działanie keratolotyczne (używany pod kontrolą lub przez podologa). Wybieraj krem z mocznikiem jako głównym aktywnym składnikiem.</li>
  <li><strong>Kwas mlekowy (lactic acid)</strong> – złuszcza zrogowaciały naskórek, nawilża. Dobrze działa w połączeniu z mocznikiem.</li>
  <li><strong>Kwas salicylowy</strong> – keratolotyczny, usuwa rogowacenie. Nie stosuj między palcami ani na uszkodzonej skórze.</li>
  <li><strong>Pantenol (witamina B5)</strong> – regeneruje, łagodzi podrażnienia, przyspiesza gojenie mikrourazów.</li>
  <li><strong>Alantoina</strong> – łagodząca, przeciwzapalna, pomaga w gojeniu.</li>
  <li><strong>Masło shea</strong> – bogaty emollient, tworzy warstwę ochronną i głęboko nawilża.</li>
  <li><strong>Olejek z drzewa herbacianego lub lawendowy</strong> – dodatek o działaniu antyseptycznym lub relaksacyjnym.</li>
</ul>

<h2>Jak aplikować krem do stóp?</h2>
<ol>
  <li>Aplikuj po kąpieli lub wieczornej pielęgnacji – skóra jest wtedy czysta i lekko wilgotna, krem wchłania się lepiej.</li>
  <li>Nakładaj krem na <strong>całą podeszwę, pięty i wierzch stopy</strong> – masując okrężnymi ruchami.</li>
  <li><strong>Omijaj przestrzenie między palcami</strong> – nadmierna wilgoć tam prowadzi do maceracji i grzybicy.</li>
  <li>Paznokcie i wały – możesz osobno nałożyć olejek (np. jojoba, drzewa herbacianego) na okolice paznokci.</li>
  <li>Zakładaj bawełniane skarpety po aplikacji kremu na noc – metoda okluzyjna znacząco zwiększa skuteczność nawilżania.</li>
</ol>

<h2>Częstotliwość</h2>
<ul>
  <li>Codziennie wieczorem – podstawa</li>
  <li>Rano – lekki krem ochronny na podeszwę przed pracą</li>
  <li>Raz w tygodniu – intensywna maska lub maść z mocznikiem 30% na noc w skarpetach</li>
</ul>
`
        },
        {
          title: 'Masaż stóp – techniki relaksacyjne i lecznicze',
          slug: 'masaz-stop-techniki',
          type: 'TEXT',
          estimatedMinutes: 14,
          contentHtml: `
<h2>Dlaczego masaż stóp jest ważny?</h2>
<p>Stopy to niezwykła struktura: 26 kości, 33 stawy, ponad 100 mięśni, ścięgien i więzadeł – i ponad <strong>7000 zakończeń nerwowych</strong> na cm². Masaż stóp:</p>
<ul>
  <li>Poprawia krążenie krwi i limfy</li>
  <li>Rozluźnia przeciążone mięśnie i powięź</li>
  <li>Zmniejsza obrzęki</li>
  <li>Stymuluje zakończenia nerwowe, działając relaksacyjnie na cały układ nerwowy</li>
  <li>Przyspiesza regenerację mikrourazów</li>
</ul>
<p>Już <strong>5–10 minut masażu</strong> dziennie przynosi odczuwalne efekty po tygodniu regularności.</p>

<h2>Przygotowanie</h2>
<ul>
  <li>Wykonuj masaż po kąpieli, gdy skóra jest miękka</li>
  <li>Użyj kilku kropel olejku do masażu (jojoba, migdałowy, kokosowy) lub kremu do stóp jako poślizgu</li>
  <li>Siądź wygodnie, połóż stopę na przeciwległym kolanie</li>
</ul>

<h2>Podstawowe techniki masażu stóp</h2>

<h3>1. Rozcieranie podeszwy kciukami</h3>
<p>Chwyć stopę obiema dłońmi, kciuki ułóż na podeszwie. Wykonuj głębokie, okrężne ruchy kciukami, posuwając się od pięty ku głowom kości śródstopia. Nacisk: umiarkowany do mocnego. Czas: 1–2 minuty.</p>

<h3>2. Rozciąganie powięzi podeszwowej</h3>
<p>Chwyć piętę jedną ręką, drugą zegnij palce stopy ku górze (grzbietowo). Poczujesz rozciąganie na podeszwie. Utrzymaj przez 15–20 sekund. Powtórz 5–6 razy. To kluczowe ćwiczenie przy bólu pięty (fasciitis plantaris).</p>

<h3>3. Rotacja i mobilizacja stawów śródstopia</h3>
<p>Jedną ręką stabilizuj piętę, drugą chwyć śródstopie i delikatnie rotuj w jedną i drugą stronę. Następnie wykonaj delikatne ruchy zgięcia i wyprostu. Poprawia elastyczność stawów i zmniejsza sztywność.</p>

<h3>4. Masaż pojedynczych palców</h3>
<p>Każdy palec chwyć między kciuk i palec wskazujący. Wykonuj okrężne ruchy u nasady palca, a potem pociągnij lekko i delikatnie za palec. Rozluźnia stawy i zmniejsza napięcie.</p>

<h3>5. Ugniatanie łydki</h3>
<p>Masaż stóp warto uzupełnić o ugniatanie łydek – napięte łydki obciążają ścięgno Achillesa i powięź podeszwową. Obema rękami ugniataj mięsień łydki od kostki ku kolanu przez 2–3 minuty.</p>

<h2>Akcesoria wspomagające masaż</h2>
<ul>
  <li><strong>Piłka do masażu lub jeżyk</strong> – toczenie stopą po piłce (pod biurkiem w pracy lub wieczorem w domu) rozluźnia powięź i stymuluje zakończenia nerwowe</li>
  <li><strong>Masażer elektryczny do stóp</strong> – wygodny po długiej zmianie, szczególnie modele z funkcją podgrzewania</li>
  <li><strong>Kąpiel naprzemienno-temperaturowa</strong> – na zmianę ciepła (1 minuta) i chłodna (30 sekund) woda – silnie poprawia krążenie</li>
</ul>

<blockquote>
  <strong>Uwaga:</strong> Przy żylakach, zakrzepicy lub otwartych ranach na stopach masaż głębki jest przeciwwskazany. Skonsultuj się z lekarzem.
</blockquote>
`,
          quiz: {
            title: 'Sprawdź wiedzę – nawilżanie i masaż stóp',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Jaki składnik kremu do stóp najskuteczniej usuwa modzele i nadmierne rogowacenie?',
                explanation: 'Mocznik w wyższych stężeniach (15–25%) jest najskuteczniejszym dostępnym bez recepty składnikiem keratolotycznym – rozbija wiązania keratynowe w zrogowaciałym naskórku, zmiękczając modzele. Wyższe stężenia (30%+) mają jeszcze silniejsze działanie.',
                options: [
                  { text: 'Masło shea', isCorrect: false },
                  { text: 'Mocznik (urea) 15–25%', isCorrect: true },
                  { text: 'Pantenol', isCorrect: false },
                  { text: 'Olejek lawendowy', isCorrect: false },
                ]
              },
              {
                text: 'Dlaczego nie należy nakładać kremu między palce stóp?',
                explanation: 'Przestrzenie między palcami naturalnie są bardziej wilgotne. Nakładanie kremów (szczególnie tłustych) między palce zwiększa tę wilgoć, co sprzyja maceracji skóry i tworzeniu środowiska idealnego dla grzybów i bakterii.',
                options: [
                  { text: 'Bo krem między palcami parzy skórę', isCorrect: false },
                  { text: 'Bo nadmierna wilgoć między palcami sprzyja grzybicy i maceracji', isCorrect: true },
                  { text: 'Krem można nakładać wszędzie, nie ma przeciwwskazań', isCorrect: false },
                  { text: 'Bo tam skóra wchłania krem zbyt szybko i to szkodzi', isCorrect: false },
                ]
              },
              {
                text: 'Jakie ćwiczenie jest kluczowe przy bólu pięty (fasciitis plantaris)?',
                explanation: 'Rozciąganie powięzi podeszwowej poprzez bierne zgięcie grzbietowe palców (pociąganie palców ku górze) jest najważniejszym ćwiczeniem terapeutycznym przy zapaleniu powięzi podeszwowej. Najlepiej wykonywać je rano przed pierwszymi krokami i po długim siedzeniu.',
                options: [
                  { text: 'Masaż samej pięty twardą szczotką', isCorrect: false },
                  { text: 'Rozciąganie powięzi – zginanie palców ku górze przy stabilizacji pięty', isCorrect: true },
                  { text: 'Chodzenie na czubkach palców przez 10 minut', isCorrect: false },
                  { text: 'Gorące okłady bezpośrednio na piętę', isCorrect: false },
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── Seed function ─────────────────────────────────────────────────────────────

async function seedCourse(data: CourseData) {
  const existing = await prisma.course.findUnique({ where: { slug: data.slug } });
  if (existing) {
    console.log(`  Kurs juz istnieje, pomijam: ${data.title}`);
    return;
  }

  const course = await prisma.course.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      status: 'PUBLISHED' as CourseStatus,
      difficulty: data.difficulty,
      estimatedMinutes: data.estimatedMinutes,
      tags: data.tags,
    }
  });

  for (let mi = 0; mi < data.modules.length; mi++) {
    const mod = data.modules[mi];
    const courseModule = await prisma.courseModule.create({
      data: { courseId: course.id, title: mod.title, order: mi + 1 }
    });

    for (let li = 0; li < mod.lessons.length; li++) {
      const lesson = mod.lessons[li];
      const createdLesson = await prisma.lesson.create({
        data: {
          moduleId: courseModule.id,
          title: lesson.title,
          slug: lesson.slug,
          type: lesson.type,
          contentHtml: lesson.contentHtml ?? null,
          estimatedMinutes: lesson.estimatedMinutes,
          order: li + 1,
          isRequired: true,
        }
      });

      if (lesson.quiz) {
        const q = lesson.quiz;
        const quiz = await prisma.academyQuiz.create({
          data: {
            lessonId: createdLesson.id,
            title: q.title,
            passingScore: q.passingScore,
            maxAttempts: q.maxAttempts,
            isPublished: true,
          }
        });

        for (let qi = 0; qi < q.questions.length; qi++) {
          const qData = q.questions[qi];
          const question = await prisma.academyQuizQuestion.create({
            data: {
              quizId: quiz.id,
              text: qData.text,
              type: 'SINGLE_CHOICE' as QuestionType,
              order: qi + 1,
              explanation: qData.explanation,
            }
          });

          for (let oi = 0; oi < qData.options.length; oi++) {
            await prisma.academyQuizOption.create({
              data: {
                questionId: question.id,
                text: qData.options[oi].text,
                isCorrect: qData.options[oi].isCorrect,
                order: oi + 1,
              }
            });
          }
        }
      }
    }
  }

  console.log(`  Kurs utworzony: ${data.title}`);
}

async function main() {
  console.log('Seedowanie kursow o pielegnacji stop...\n');

  const courses = [courseWrastajace, courseGrzybica, courseBHP, courseKompleksowa];
  for (const course of courses) {
    await seedCourse(course);
  }

  console.log('\nSeedowanie zakonczone pomyslnie. Dodano ' + courses.length + ' kursy o stopach.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

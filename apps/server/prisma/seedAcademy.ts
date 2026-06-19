import { PrismaClient, Difficulty, CourseStatus, LessonType, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

interface QuizOption { text: string; isCorrect: boolean; }
interface QuizQuestion { text: string; explanation: string; options: QuizOption[]; }
interface QuizData { title: string; passingScore: number; maxAttempts: number; questions: QuizQuestion[]; }
interface LessonData { title: string; slug: string; type: LessonType; contentHtml?: string; estimatedMinutes: number; quiz?: QuizData; }
interface ModuleData { title: string; lessons: LessonData[]; }
interface CourseData { title: string; slug: string; description: string; difficulty: Difficulty; estimatedMinutes: number; tags: string[]; modules: ModuleData[]; }

// ─── COURSE 1: Sztuka Pielęgnacji Brwi ───────────────────────────────────────

const course1: CourseData = {
  title: 'Sztuka Pielęgnacji Brwi',
  slug: 'sztuka-pielegnacji-brwi',
  description: 'Poznaj anatomię brwi, metody stylizacji i profesjonalną pielęgnację. Dowiedz się, jak dobrać kształt brwi do twarzy i dlaczego codzienna rutyna ma znaczenie.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 90,
  tags: ['brwi', 'stylizacja', 'henna'],
  modules: [
    {
      title: 'Anatomia i typy brwi',
      lessons: [
        {
          title: 'Budowa brwi – jak rośnie włos i dlaczego to ważne',
          slug: 'budowa-brwi',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Czym właściwie są brwi?</h2>
<p>Brwi to znacznie więcej niż estetyczny element twarzy. Pełnią funkcję ochronną – chronią oczy przed potem, kurzem i światłem – ale przede wszystkim są kluczowym narzędziem komunikacji niewerbalnej. Badania pokazują, że brwi odgrywają ważniejszą rolę w rozpoznawaniu twarzy niż oczy.</p>

<h2>Budowa włosa brwiowego</h2>
<p>Każdy włos brwiowy składa się z trzech warstw:</p>
<ul>
  <li><strong>Rdzeń (medulla)</strong> – centralna część, odpowiada za grubość i sztywność włosa</li>
  <li><strong>Kora (cortex)</strong> – zawiera melaninę, która nadaje włosowi kolor</li>
  <li><strong>Łuska (cuticula)</strong> – zewnętrzna warstwa z łuseczek keratynowych; zdrowa łuska sprawia, że włos jest gładki i lśniący</li>
</ul>
<p>Włos wyrasta z <strong>mieszka włosowego</strong>, który jest osadzony w skórze właściwej. Na dnie mieszka znajduje się brodawka włosowa – bogato unaczyniona struktura odpowiadająca za odżywianie i wzrost włosa.</p>

<h2>Cykl wzrostu włosa brwiowego</h2>
<p>Włos brwiowy przechodzi przez trzy fazy cyklu życia, które różnią się od włosów głowy – przede wszystkim znacznie krótszą fazą wzrostu:</p>
<ul>
  <li><strong>Anagen (wzrost)</strong> – trwa 30–45 dni. Włos aktywnie rośnie, wydłużając się średnio o 0,16 mm dziennie. To dlatego brwi wymagają regularnej pielęgnacji.</li>
  <li><strong>Katagen (przejście)</strong> – trwa kilka dni. Wzrost ustaje, brodawka włosowa odsuwa się od mieszka.</li>
  <li><strong>Telogen (spoczynek)</strong> – trwa 3–4 miesiące. Włos pozostaje w mieszku, po czym naturalnie wypada, robiąc miejsce nowemu.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Wiedza o fazie anagenowej to klucz do zarządzania depilacją. Wyrywanie brwi w zbyt krótkich odstępach zaburza synchronizację faz wzrostu, co prowadzi do nierównomiernego odrostu i osłabienia mieszków.
</blockquote>

<h2>Dlaczego włosy brwiowe „nie rosną" po nadmiernej depilacji?</h2>
<p>To mit – ale tylko częściowo. Jednorazowe lub kilkukrotne wyrwanie włosa nie niszczy mieszka trwale. Jednak <strong>wieloletnia, agresywna depilacja</strong> może prowadzić do mikrourazów brodawki włosowej i trwałego zaniku części mieszków. Efektem jest rzedkowienie brwi, szczególnie w części ogonkowej.</p>
<p>Ważna jest też genetyka: gęstość, kształt i naturalny przebieg brwi są w dużej mierze zdeterminowane przez geny. Dobry kosmetolog pracuje z tym, co dała natura, a nie przeciwko temu.</p>

<h2>Skóra pod brwiami</h2>
<p>Okolica brwiowa to cienka, delikatna skóra z dużą ilością naczyń krwionośnych i nerwów. Zabiegi depilacji (szczególnie wosk) mogą tymczasowo podrażniać tę strefę. Po każdej depilacji warto zastosować preparat kojący – na przykład żel aloesowy lub krem z pantenolem.</p>
`
        },
        {
          title: 'Kształty brwi – jak dobrać do twarzy',
          slug: 'ksztalty-brwi',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Zasada złotego trójkąta</h2>
<p>Prawidłowe wyznaczenie kształtu brwi opiera się na trzech punktach odniesienia. Do ich wyznaczenia używamy cienkiego patyczka (lub pędzla) przykładanego do twarzy:</p>
<ul>
  <li><strong>Punkt początkowy</strong> – patyczek pionowo przy skrzydle nosa, linia biegnie przez wewnętrzny kącik oka. Tu zaczyna się brew.</li>
  <li><strong>Punkt łuku</strong> – patyczek od skrzydła nosa przez źrenicę (lub zewnętrzny rąbek tęczówki). Tu brew osiąga najwyższy punkt.</li>
  <li><strong>Punkt końcowy</strong> – patyczek od skrzydła nosa przez zewnętrzny kącik oka. Tu kończy się brew.</li>
</ul>

<h2>Typy kształtów brwi</h2>
<ul>
  <li><strong>Łukowata</strong> – miękki, okrągły łuk. Dodaje twarzy miękkości i kobiecości. Idealna dla twarzy kwadratowej i prostokątnej.</li>
  <li><strong>Prosta</strong> – minimalne wysklepienie lub jego brak. Optycznie skraca twarz i powiększa oczy. Popularna w stylizacji koreańskiej.</li>
  <li><strong>Kątowa (angularna)</strong> – ostry łuk z wyraźnym kątem. Dodaje wyrazistości i dramatyzmu. Pasuje do twarzy okrągłej i owalnej.</li>
  <li><strong>S-kształt</strong> – delikatna fala z subtelnym wysklepieniem. Nowoczesna, modna forma dla twarzy owalnej.</li>
</ul>

<h2>Kształt brwi a typ twarzy</h2>
<p>Dobór kształtu brwi powinien uwzględniać owal twarzy:</p>
<ul>
  <li><strong>Twarz owalna</strong> – praktycznie każdy kształt działa. Polecane brwi z delikatnym łukiem.</li>
  <li><strong>Twarz okrągła</strong> – wysoki łuk lub kątowy kształt wydłuża twarz i wyszczupla.</li>
  <li><strong>Twarz kwadratowa</strong> – miękki, łukowaty kształt łagodzi kanciaste rysy szczęki.</li>
  <li><strong>Twarz serduszko</strong> – zaokrąglony, niski łuk równoważy szerokie czoło.</li>
  <li><strong>Twarz diament</strong> – mocny łuk lub prosta brew podkreśla wyjątkowe kości policzkowe.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Zanim zaczniesz stylizację, zawsze zrób zdjęcie klientce bez makijażu i w neutralnym oświetleniu. Możesz narysować oś symetrii – wiele twarzy jest naturalnie asymetrycznych, co należy uwzględnić przy projektowaniu brwi.
</blockquote>

<h2>Grubość brwi</h2>
<p>Trend na brwi ewoluował przez dekady – od ultra-cienkich lat 90. do gęstych "brow goals" lat 2020. Dziś dominuje <strong>naturalizm</strong>: brwi dobrze wypełnione, ale nie przesadnie sztuczne. Grubość powinna być proporcjonalna do wielkości oczu i gęstości włosów.</p>
<p>Zasada kciuka: grubość brwi w części środkowej powinna być zbliżona do szerokości powieki górnej (zmierzona pionowo przy zamkniętym oku).</p>
`
        }
      ]
    },
    {
      title: 'Metody stylizacji',
      lessons: [
        {
          title: 'Depilacja nitką i pęsetą – technika krok po kroku',
          slug: 'depilacja-nitka-pyseta',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Depilacja pęsetą</h2>
<p>Pęseta to najbardziej precyzyjne narzędzie do kształtowania brwi. Pozwala usunąć pojedyncze włosy z dokładnością niemożliwą do uzyskania żadną inną metodą.</p>

<h2>Rodzaje pęset</h2>
<ul>
  <li><strong>Ukośna (slanted)</strong> – najlepsza do brwi. Skośna końcówka łapie zarówno pojedyncze włosy, jak i kilka naraz.</li>
  <li><strong>Prosta (flat)</strong> – dobra do grubszych, twardszych włosów. Mniej precyzyjna przy cienkich włoskach.</li>
  <li><strong>Szpiczasta (pointed)</strong> – idealna do wrastających włosów. Wymaga wprawy, by nie skaleczyć skóry.</li>
</ul>

<h2>Technika depilacji pęsetą – krok po kroku</h2>
<ul>
  <li><strong>Krok 1:</strong> Oczyść skórę tonikiem bezalkoholowym. Zdezynfekuj pęsetę spirytusem.</li>
  <li><strong>Krok 2:</strong> Wyznacz kształt – użyj białej kredki kosmetycznej jako szablonu.</li>
  <li><strong>Krok 3:</strong> Naciągnij skórę palcem wskazującym i kciukiem – zmniejsza to ból i zapobiega mikrozranieniom.</li>
  <li><strong>Krok 4:</strong> Chwytaj włos jak najbliżej skóry, zgodnie z kierunkiem jego wzrostu.</li>
  <li><strong>Krok 5:</strong> Wyrywaj zdecydowanym, płynnym ruchem w kierunku wzrostu – nigdy prostopadle do skóry.</li>
  <li><strong>Krok 6:</strong> Po zakończeniu nałóż żel kojący lub lód owinięty w gazę.</li>
</ul>

<h2>Depilacja nitką (threading)</h2>
<p>Technika wywodząca się z Bliskiego Wschodu i Azji Południowej. Zwinięta bawełniana nić "toczy się" po skórze, chwytając i usuwając kilka włosów jednocześnie.</p>

<h2>Zalety nitki nad pęsetą</h2>
<ul>
  <li>Szybsza – można usunąć rząd włosów jednym ruchem</li>
  <li>Precyzyjna – pozwala tworzyć bardzo ostre, czyste linie</li>
  <li>Delikatna dla skóry – nić nie dotyka mocno skóry, minimalne ryzyko podrażnień</li>
  <li>Nie wymaga chemii – naturalna metoda</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Depilacja nitką jest szczególnie polecana przy skórze wrażliwej, trądzikowej lub stosującej miejscowo retinoidy i kwasy – w tych przypadkach wosk i depilatory chemiczne są przeciwwskazane.
</blockquote>

<h2>Kiedy stosować, kiedy unikać</h2>
<p>Unikaj depilacji bezpośrednio przed lub po ekspozycji słonecznej, soląrium i intensywnym wysiłkiem fizycznym. Skóra jest wtedy bardziej reaktywna. Optymalna pora to wieczór – podrażnienia mają noc na ustąpienie.</p>
`
        },
        {
          title: 'Henna brwiowa – pigment, aplikacja, trwałość',
          slug: 'henna-brwiowa',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym jest henna brwiowa?</h2>
<p>Henna brwiowa to tymczasowa metoda barwienia brwi przy użyciu naturalnego lub syntetycznego pigmentu. W przeciwieństwie do farby oksydacyjnej do brwi, henna barwi zarówno włosy, jak i skórę pod brwiami – tworząc efekt "wypełnionych" brwi, nawet w miejscach z przerwami lub rzadkim owłosieniem.</p>

<h2>Rodzaje henny</h2>
<ul>
  <li><strong>Henna naturalna</strong> – otrzymywana z rośliny <em>Lawsonia inermis</em>. Daje ciepłe, brązowo-rudawe odcienie. Ograniczona paleta kolorów, ale w pełni naturalna i bezpieczna.</li>
  <li><strong>Henna syntetyczna (kompozytowa)</strong> – zawiera syntetyczne pigmenty. Szeroka paleta kolorów (od jasnego blondu po czerń), lepsza kontrola odcienia. Najczęściej stosowana w salonach.</li>
  <li><strong>Henna pudrowa</strong> – w formie proszku, mieszona z wodą lub perhydrolem. Bardzo popularna, intensywne zabarwienie skóry.</li>
</ul>

<h2>Technika aplikacji krok po kroku</h2>
<ul>
  <li><strong>1. Przygotowanie:</strong> Odtłuść skórę brwi tonikiem lub acetonem na waciku. Usuń wszystkie ślady kremów i makijażu.</li>
  <li><strong>2. Wyznaczenie kształtu:</strong> Narysuj szablon białą kredką lub woskiem ochronnym wokół brwi – zapobiegnie to plamom na skórze poza obrębem brwi.</li>
  <li><strong>3. Przygotowanie masy:</strong> Wymieszaj hennę według instrukcji producenta – zwykle z wodą lub perhydrolem do konsystencji pasty.</li>
  <li><strong>4. Aplikacja:</strong> Nakładaj pędzelkiem skośnym lub aplikatorem w kierunku wzrostu włosów. Warstwa powinna być równomiernie gruba – ok. 1–2 mm.</li>
  <li><strong>5. Czas działania:</strong> Zazwyczaj 10–20 minut. Im dłużej, tym intensywniejsze zabarwienie skóry.</li>
  <li><strong>6. Usuwanie:</strong> Ścieramy suchym wacikiem lub gazikiem – nigdy mokrym, bo rozmazuje pigment. Płuczemy wodą.</li>
</ul>

<h2>Trwałość i czynniki wpływające na zanik</h2>
<p>Na włosach henna trzyma się <strong>3–4 tygodnie</strong>. Na skórze znacznie krócej – <strong>1–2 tygodnie</strong>, w zależności od:</p>
<ul>
  <li>Aktywności łojowej skóry (cera tłusta = szybszy zanik)</li>
  <li>Częstości mycia twarzy i stosowania peelingów</li>
  <li>Ekspozycji słonecznej i chlorowanej wody w basenie</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Przed nałożeniem henny zawsze wykonaj test alergiczny za uchem – 48 godzin przed zabiegiem. Dotyczy to zwłaszcza henn syntetycznych zawierających PPD (para-phenylenediamine), który może wywoływać silne reakcje alergiczne.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Pielęgnacja i quiz',
      lessons: [
        {
          title: 'Serum i olejki do brwi – składniki, które działają',
          slug: 'serum-i-olejki-do-brwi',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Po co stosować serum do brwi?</h2>
<p>Serum do brwi to skoncentrowany preparat, który odżywia mieszki włosowe, wzmacnia włosy i – przy odpowiednich składnikach – może stymulować ich wzrost. Jest szczególnie polecane po nadmiernej depilacji, po zabiegach farbowania lub gdy brwi są naturalnie rzadkie.</p>

<h2>Kluczowe składniki aktywne</h2>
<ul>
  <li><strong>Biotyna (witamina B7)</strong> – niezbędna do produkcji keratyny. Jej niedobór bezpośrednio przekłada się na wypadanie włosów. W serum działa miejscowo, wspierając metabolizm mieszka.</li>
  <li><strong>Peptyd bimatoprost</strong> – analog prostaglandyny, przedłuża fazę anagenu. Stosowany w preparatach medycznych na rzęsy (Latisse), w kosmetycznych dawkach bezpieczny do użytku domowego.</li>
  <li><strong>Ekstrakt z czerwonej koniczyny (izoflawonoidy)</strong> – stymuluje mikrokrążenie w brodawce włosowej.</li>
  <li><strong>Pantenol (prowitamina B5)</strong> – wzmacnia strukturę włosa, uszczelnia łuskę, zapobiega łamaniu.</li>
  <li><strong>Kwas hialuronowy</strong> – nawilża skórę wokół mieszka, tworząc optymalne środowisko dla wzrostu.</li>
</ul>

<h2>Olejki do brwi – naturalna alternatywa</h2>
<ul>
  <li><strong>Olej rycynowy (castor oil)</strong> – najpopularniejszy wybór. Bogaty w kwas rycynolowy, wykazuje właściwości przeciwzapalne i antygrzybicze. Badania naukowe są niejednoznaczne, ale anegdotyczne dowody mocno potwierdzają skuteczność.</li>
  <li><strong>Olej ze słodkich migdałów</strong> – lekki, bogaty w witaminę E. Doskonały do codziennej pielęgnacji jako baza do innych składników.</li>
  <li><strong>Olej arganowy</strong> – zawiera skwalen i tokoferole. Chroni przed oksydacyjnym stresem i uszkodzeniami po UV.</li>
  <li><strong>Olej z pestek dyni</strong> – bogaty w cynk, który reguluje metabolizm keratyny.</li>
</ul>

<h2>Jak stosować</h2>
<p>Serum nakładaj czystym aplikatorem (najczęściej szczoteczką lub patyczkiem) na suche, oczyszczone brwi, <strong>raz lub dwa razy dziennie</strong>. Wmasuj delikatnie opuszkami palców, aby pobudzić mikrokrążenie. Efekty są widoczne po 4–8 tygodniach regularnego stosowania.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Olej rycynowy nakładaj tylko na noc – jest gęsty i może kleić się w ciągu dnia. Rano możesz go wymyć łagodnym żelem lub olejem do demakijażu metodą "oil cleansing".
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Brwi',
          slug: 'quiz-brwi',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Pielęgnacja Brwi',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Ile trwa faza anagenowa włosa brwiowego?',
                explanation: 'Faza anagenu (wzrostu) brwi trwa 30–45 dni, co jest znacznie krótsze niż w przypadku włosów głowy (2–6 lat).',
                options: [
                  { text: '30–45 dni', isCorrect: true },
                  { text: '2–6 miesięcy', isCorrect: false },
                  { text: '7–14 dni', isCorrect: false },
                  { text: '3–5 lat', isCorrect: false }
                ]
              },
              {
                text: 'Który punkt wyznacza miejsce najwyższego łuku brwi?',
                explanation: 'Łuk brwi wyznaczamy przykładając patyczek od skrzydła nosa przez zewnętrzny rąbek tęczówki (lub źrenicę).',
                options: [
                  { text: 'Patyczek od skrzydła nosa przez tęczówkę', isCorrect: true },
                  { text: 'Patyczek pionowo przy skrzydle nosa', isCorrect: false },
                  { text: 'Patyczek od skrzydła nosa przez zewnętrzny kącik oka', isCorrect: false },
                  { text: 'Środek czoła wyznaczony symetrycznie', isCorrect: false }
                ]
              },
              {
                text: 'Jaką technikę depilacji polecisz klientce stosującej miejscowo retinol na okolice oczu?',
                explanation: 'Przy stosowaniu retinoidów skóra jest bardziej wrażliwa i cienka. Wosk i depilatory chemiczne są przeciwwskazane – nitka jest bezpieczną alternatywą.',
                options: [
                  { text: 'Nitkę (threading)', isCorrect: true },
                  { text: 'Wosk na gorąco', isCorrect: false },
                  { text: 'Depilator chemiczny', isCorrect: false },
                  { text: 'Wosk na zimno (paski)', isCorrect: false }
                ]
              },
              {
                text: 'Henna brwiowa barwi:',
                explanation: 'Henna barwi zarówno włosy (trwałość 3–4 tygodnie), jak i skórę pod brwiami (trwałość 1–2 tygodnie).',
                options: [
                  { text: 'Włosy i skórę pod brwiami', isCorrect: true },
                  { text: 'Tylko włosy brwiowe', isCorrect: false },
                  { text: 'Tylko skórę pod brwiami', isCorrect: false },
                  { text: 'Cały naskórek twarzy', isCorrect: false }
                ]
              },
              {
                text: 'Który składnik serum do brwi jest analogiem prostaglandyny i przedłuża fazę anagenu?',
                explanation: 'Bimatoprost to analog prostaglandyny stosowany w medycynie (Latisse) i kosmetyce do wydłużania fazy wzrostu włosa.',
                options: [
                  { text: 'Peptyd bimatoprost', isCorrect: true },
                  { text: 'Biotyna', isCorrect: false },
                  { text: 'Pantenol', isCorrect: false },
                  { text: 'Kwas hialuronowy', isCorrect: false }
                ]
              },
              {
                text: 'Jak długo na skórze utrzymuje się henna brwiowa?',
                explanation: 'Na skórze henna utrzymuje się 1–2 tygodnie, a na włosach 3–4 tygodnie.',
                options: [
                  { text: '1–2 tygodnie', isCorrect: true },
                  { text: '3–4 tygodnie', isCorrect: false },
                  { text: '6–8 tygodni', isCorrect: false },
                  { text: '2–3 dni', isCorrect: false }
                ]
              },
              {
                text: 'Jaki kształt brwi polecisz do twarzy okrągłej?',
                explanation: 'Do twarzy okrągłej poleca się wysoki łuk lub kątowy kształt brwi – wizualnie wydłużają twarz i wyszczuplają rysy.',
                options: [
                  { text: 'Wysoki łuk lub kątowy kształt', isCorrect: true },
                  { text: 'Prostą brew bez łuku', isCorrect: false },
                  { text: 'Miękki, niski łuk', isCorrect: false },
                  { text: 'Brew w kształcie S', isCorrect: false }
                ]
              },
              {
                text: 'W jaki sposób należy usuwać hennę po czasie działania?',
                explanation: 'Hennę usuwa się suchym wacikiem lub gazikiem. Użycie mokrego materiału rozmazuje pigment.',
                options: [
                  { text: 'Suchym wacikiem lub gazikiem', isCorrect: true },
                  { text: 'Mokrym wacikiem z wodą', isCorrect: false },
                  { text: 'Płynem micelarnym natychmiast', isCorrect: false },
                  { text: 'Chusteczką nawilżaną', isCorrect: false }
                ]
              },
              {
                text: 'Który olej do brwi jest bogaty w kwas rycynolowy i wykazuje właściwości przeciwzapalne?',
                explanation: 'Olej rycynowy (castor oil) zawiera kwas rycynolowy, który ma właściwości przeciwzapalne i antygrzybicze.',
                options: [
                  { text: 'Olej rycynowy (castor oil)', isCorrect: true },
                  { text: 'Olej arganowy', isCorrect: false },
                  { text: 'Olej ze słodkich migdałów', isCorrect: false },
                  { text: 'Olej z pestek dyni', isCorrect: false }
                ]
              },
              {
                text: 'Ile wcześniej przed zabiegiem hennowania należy wykonać test alergiczny?',
                explanation: 'Test alergiczny wykonuje się 48 godzin przed zabiegiem, aby mieć wystarczający czas na obserwację ewentualnej reakcji skórnej.',
                options: [
                  { text: '48 godzin', isCorrect: true },
                  { text: '24 godziny', isCorrect: false },
                  { text: '15 minut', isCorrect: false },
                  { text: '1 tydzień', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 2: Rzęsy – Pielęgnacja i Wzmacnianie ─────────────────────────────

const course2: CourseData = {
  title: 'Rzęsy – Pielęgnacja i Wzmacnianie',
  slug: 'rzezy-pielegnacja-wzmacnianie',
  description: 'Zrozum cykl życia rzęsy, poznaj profesjonalne zabiegi liftingu i laminowania oraz naucz się codziennej pielęgnacji, która wzmocni rzęsy i zapobiegnie ich wypadaniu.',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 105,
  tags: ['rzęsy', 'lifting', 'serum'],
  modules: [
    {
      title: 'Budowa i cykl wzrostu',
      lessons: [
        {
          title: 'Cykl życia rzęsy – wzrost, spoczynek, wypadanie',
          slug: 'cykl-zycia-rzezy',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Rzęsy – nie tylko estetyka</h2>
<p>Rzęsy to wyspecjalizowane włosy czujnikowe. Ich zadaniem jest ochrona gałki ocznej przed pyłem, owadami i nadmiernym światłem. Wyposażone w bardzo wrażliwe receptory – impuls dotknięcia rzęsy wywołuje odruchowe zamknięcie powieki w ułamku sekundy.</p>

<h2>Budowa rzęsy</h2>
<p>Rzęsa, podobnie jak włos brwiowy, zbudowana jest z rdzenia, kory i łuski. Wyróżnia ją jednak kilka cech szczególnych:</p>
<ul>
  <li><strong>Brak melanocytów w fazie telogenu</strong> – rzęsy nie siwieją tak wyraźnie jak włosy głowy</li>
  <li><strong>Bardzo krótka faza anagenowa</strong> – zaledwie 30–45 dni</li>
  <li><strong>Głębsze osadzenie mieszka</strong> – mieszki rzęs sięgają tkanki tłuszczowej powieki</li>
  <li><strong>Gruczoły Zeissa i Molla</strong> – gruczoły łojowe i potowe towarzyszące każdej rzęsie; ich infekcja prowadzi do gradówek i jęczmieni</li>
</ul>

<h2>Trzy fazy cyklu rzęsy</h2>
<ul>
  <li><strong>Anagen (wzrost aktywny)</strong> – 30–45 dni. Rzęsa rośnie z prędkością 0,12–0,14 mm/dobę. Tylko ok. 40% rzęs jednocześnie jest w tej fazie.</li>
  <li><strong>Katagen (regresja)</strong> – 2–3 tygodnie. Aktywny wzrost ustaje, brodawka włosowa degeneruje.</li>
  <li><strong>Telogen (spoczynek)</strong> – 3–4 miesiące. Rzęsa pozostaje nieruchoma do czasu wypchnięcia przez nową.</li>
</ul>
<p>Pełny cykl rzęsy trwa <strong>4–6 miesięcy</strong>. Dziennie wypadamy średnio 1–5 rzęs – jest to zjawisko całkowicie fizjologiczne.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Klientki często alarmują się "masowym wypadaniem rzęs" po liftingu lub laminowaniu. Wyjaśnij, że zabiegi te nie niszczą rzęs – ale mogą ujawniać rzęsy w fazie telogenu, które i tak miały wypaść. Poinformowanie klientki z wyprzedzeniem zmniejsza nieuzasadnione obawy.
</blockquote>

<h2>Liczba rzęs</h2>
<p>Górna powieka posiada przeciętnie <strong>150–200 rzęs</strong> w 3–4 rzędach, dolna 75–100 w 2–3 rzędach. Gęstość i długość są genetycznie determinowane, ale odpowiednia pielęgnacja może maksymalizować potencjał każdego mieszka.</p>
`
        },
        {
          title: 'Przyczyny wypadania rzęs i jak im zapobiegać',
          slug: 'przyczyny-wypadania-rzas',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Fizjologiczne vs patologiczne wypadanie rzęs</h2>
<p>Wypadanie 1–5 rzęs dziennie jest normą biologiczną. Mówimy o problemie, gdy rzęsy stają się rzadsze, krótsze lub gdy wypadanie jest jednostronne.</p>

<h2>Najczęstsze przyczyny nadmiernego wypadania rzęs</h2>
<ul>
  <li><strong>Niedobory żywieniowe</strong> – żelazo, cynk, biotyna, witaminy D i B12. Często towarzyszą restrykcyjnym dietom i anemii.</li>
  <li><strong>Choroby tarczycy</strong> – zarówno nadczynność, jak i niedoczynność mogą powodować wypadanie rzęs, szczególnie w części zewnętrznej (objaw Hertoghe'a).</li>
  <li><strong>Alopecia areata</strong> – ogniskowe wyłysienie o podłożu autoimmunologicznym; może dotyczyć rzęs i brwi.</li>
  <li><strong>Infekcje grzybicze lub bakteryjne</strong> – zapalenie brzegów powiek (blepharytis) niszczy mieszki rzęs.</li>
  <li><strong>Mechaniczne uszkodzenia</strong> – agresywny demakijaż, wcieranie oczu, nieumiejętne zdejmowanie sztucznych rzęs.</li>
  <li><strong>Toksyny i leki</strong> – chemioterapia, izotretynoina, niektóre leki przeciwzakrzepowe.</li>
  <li><strong>Stres oksydacyjny i przewlekły stres</strong> – kortyzol zaburza cykl wzrostu mieszków.</li>
</ul>

<h2>Zapobieganie – działania na co dzień</h2>
<ul>
  <li>Delikatny demakijaż – nigdy nie trzyj oczu. Używaj płynu micelarnego lub olejku, przykładając wacik na 20–30 sekund, a nie pocierając.</li>
  <li>Regularny masaż powiek – stymuluje mikrokrążenie. Wykonuj okrężne ruchy opuszkami palców przez 1–2 minuty dziennie.</li>
  <li>Dieta bogata w białko, żelazo i biotynę – włosy budowane są z keratyny, a keratyna wymaga aminokwasów.</li>
  <li>Nie śpij z tuszem do rzęs – rozłamuje rzęsy i zatyka mieszki.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Jeśli klientka zgłasza gwałtowne i asymetryczne wypadanie rzęs, skieruj ją do okulisty lub dermatologa. Może to być objaw blepharytis lub zaburzeń hormonalnych wymagających leczenia.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Zabiegi profesjonalne',
      lessons: [
        {
          title: 'Lifting rzęs – etapy zabiegu i efekty',
          slug: 'lifting-rzas',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Czym jest lifting rzęs?</h2>
<p>Lifting (keratin lash lift) to zabieg modelowania rzęs z użyciem chemicznych preparatów utrwalających. Rzęsy są zaginane na wałeczkach silikonowych, a następnie utrwalane, dzięki czemu zachowują podgięcie przez 6–8 tygodni bez konieczności codziennego używania zalotki.</p>

<h2>Jak działa lifting chemicznie?</h2>
<p>Rzęsy zbudowane są z keratyny – białka bogatego w wiązania disiarczkowe (–S–S–) pomiędzy aminokwasami cysteinowymi. Lifting polega na:</p>
<ul>
  <li><strong>Faza 1 (breaking)</strong> – preparat alkaliczny (np. tiomleczan amonu) rozbija wiązania disiarczkowe, zmiękczając rzęsę i umożliwiając nadanie jej nowego kształtu.</li>
  <li><strong>Faza 2 (fixing)</strong> – preparat utleniający (zazwyczaj z nadtlenkiem wodoru) odbudowuje wiązania disiarczkowe w nowej pozycji, "zamrażając" podgięcie.</li>
  <li><strong>Faza 3 (odżywienie)</strong> – keratynowa lub proteinowa maska uzupełnia ubytki w strukturze włosa i zamyka łuskę.</li>
</ul>

<h2>Etapy zabiegu – krok po kroku</h2>
<ul>
  <li><strong>1. Konsultacja i wywiad:</strong> Sprawdź stan rzęs, historię zabiegów (rozluźnienie po poprzednim liftingu), ewentualne alergie.</li>
  <li><strong>2. Oczyszczenie:</strong> Odtłuść rzęsy i powieki tonikiem bezalkoholowym. Ślady tłuszczu blokują wnikanie preparatu.</li>
  <li><strong>3. Zabezpieczenie dolnych powiek:</strong> Przykryj dolne rzęsy żelowymi podkładkami lub taśmą kosmetyczną.</li>
  <li><strong>4. Dobór wałeczka:</strong> Mały = silniejsze podgięcie, duży = delikatny, naturalny efekt. Dostosuj do długości rzęs i preferencji klientki.</li>
  <li><strong>5. Przyklejenie wałeczka:</strong> Klejem sylikon przyklejasz wałeczek do skóry powieki. Rzęsy układasz na wałeczku pojedynczo przy pomocy pinezki lub grzebyczka.</li>
  <li><strong>6. Aplikacja preparatu no 1:</strong> Nakładasz cienką warstwę od nasady (nie na końce!). Czas działania 8–12 min (zależy od preparatu i grubości rzęs).</li>
  <li><strong>7. Aplikacja preparatu no 2:</strong> Usuń preparat 1 bez przesuwania rzęs. Nałóż utrwalacz na 6–8 minut.</li>
  <li><strong>8. Odżywka:</strong> Maska keratynowa lub olejek rycynowy na 3–5 minut.</li>
  <li><strong>9. Usunięcie:</strong> Wałeczki usuwa się mokrym wacikiem ruchem rotacyjnym – nigdy pociągając.</li>
</ul>

<h2>Efekty i czas trwania</h2>
<p>Podgięcie utrzymuje się <strong>6–8 tygodni</strong>, po czym naturalne wypadanie i odrost przywracają rzęsy do stanu wyjściowego. Efekt może być krótszy przy silnie przetłuszczonych lub uszkodzonych rzęsach.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Zalecaj klientkom, by przez 24–48 godzin po zabiegu unikały wilgoci (para, łaźnia, basen). Wiązania disiarczkowe potrzebują czasu na pełne utwardzenie.
</blockquote>
`
        },
        {
          title: 'Laminowanie rzęs – wskazania i różnice',
          slug: 'laminowanie-rzas',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Lifting vs laminowanie – kluczowa różnica</h2>
<p>Oba zabiegi używają podobnej chemii, ale mają inny cel:</p>
<ul>
  <li><strong>Lifting</strong> – nadaje podgięcie w górę. Skupiony na zmianie kąta rzęsy względem powieki.</li>
  <li><strong>Laminowanie</strong> – wyrównuje rzęsy, układa je w jednym kierunku i nadaje im połysk. Skupiony na estetyce i ułożeniu.</li>
</ul>
<p>W praktyce granica zaciera się – wiele preparatów "do liftingu" jednocześnie laminuje, a efekt końcowy zależy od techniki aplikacji.</p>

<h2>Wskazania do laminowania</h2>
<ul>
  <li>Rzęsy rosnące w różnych kierunkach – laminowanie "czesze" je jednolicie</li>
  <li>Rzęsy porowate i matowe – błona laminująca nadaje połysk i gładkość</li>
  <li>Klientki ceniące naturalny efekt bez wyraźnego podgięcia</li>
  <li>Rzęsy po uszkodzeniach (np. po przedłużaniu) – laminowanie tworzy warstwę ochronną</li>
</ul>

<h2>Składniki preparatów laminujących</h2>
<p>Profesjonalne preparaty do laminowania zawierają:</p>
<ul>
  <li><strong>Hydrolizaty keratyny i jedwabiu</strong> – wypełniają mikropęknięcia w łusce włosa</li>
  <li><strong>Oleje roślinne (argan, rycynowy)</strong> – uszczelniają i nadają połysk</li>
  <li><strong>Panthenol i biotin</strong> – wzmacniają i odżywiają</li>
</ul>

<h2>Przeciwwskazania</h2>
<ul>
  <li>Aktywne zapalenie powiek lub oczu</li>
  <li>Niedawne zabiegi chirurgiczne okolicy oka</li>
  <li>Alergia na składniki preparatu (test 48 h wcześniej)</li>
  <li>Ciąża (ostrożność – nie zakaz absolutny, ale zalecana konsultacja z lekarzem)</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Nie wykonuj liftingu ani laminowania rzęs krótszych niż 4 mm – zbyt krótkie rzęsy nie dają się prawidłowo ułożyć na wałeczku i ryzyko kontaktu preparatu z okolicą oka jest zbyt duże.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Codzienna pielęgnacja i quiz',
      lessons: [
        {
          title: 'Serum i olejki do rzęs – co wybrać',
          slug: 'serum-do-rzas',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Jak działa serum do rzęs?</h2>
<p>Serum do rzęs to preparat nakładany u nasady rzęs (jak eyeliner) lub na całą długość rzęsy. Jego składniki wnikają w mieszki włosowe i łuskę rzęsy, stymulując wzrost i wzmacniając strukturę.</p>

<h2>Najskuteczniejsze składniki</h2>
<ul>
  <li><strong>Bimatoprost i analog prostaglandyny</strong> – klinicznie udowodnione wydłużenie fazy anagenowej. Mogą powodować przebarwienia tęczówki przy długotrwałym stosowaniu – stosuj wyłącznie u nasady, unikaj kontaktu z gałką oczną.</li>
  <li><strong>Biotyna</strong> – wspiera syntezę keratyny, wzmacnia strukturę włosa.</li>
  <li><strong>Peptydy (np. myristoyl pentapeptide-17)</strong> – stymulują ekspresję genów keratyny w komórkach mieszka.</li>
  <li><strong>Ekstrakty roślinne</strong> – ekstrakt z bambusa (krzem), z czerwonej koniczyny (izoflawonoidy), z niacynamidem wzmacniającym barierę skórną.</li>
</ul>

<h2>Jak porównać serum do rzęs?</h2>
<p>Przy wyborze serum sprawdź kolejność składników na INCI. Składniki aktywne powinny znaleźć się na początku listy. Unikaj preparatów, w których substancje czynne wymienione są na samym końcu (czyli w śladowych ilościach).</p>

<h2>Olejki do rzęs – naturalna pielęgnacja</h2>
<ul>
  <li><strong>Olej rycynowy</strong> – stosowany od dziesięcioleci. Kwas rycynolowy wzmacnia i nawilża. Nakładaj czystą maskarą (bez tuszu) lub patyczkiem na nasadę rzęs.</li>
  <li><strong>Olej ze słodkich migdałów</strong> – lekki, bogaty w witaminę E. Chroni przed uszkodzeniami mechanicznymi i UV.</li>
  <li><strong>Olej arganowy</strong> – odbudowuje łuskę rzęsy, doskonały po zabiegach chemicznych (lifting, laminowanie).</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Efekty serum do rzęs są widoczne po minimum 8–12 tygodniach regularnego stosowania. Poinformuj klientkę o tym z góry – wiele osób oczekuje zmian po 2 tygodniach i rezygnuje zbyt szybko.
</blockquote>
`
        },
        {
          title: 'Bezpieczny demakijaż oczu',
          slug: 'bezpieczny-demakijaz-oczu',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Dlaczego demakijaż oczu jest tak ważny?</h2>
<p>Skóra wokół oczu jest <strong>40% cieńsza</strong> niż skóra reszty twarzy. Intensywne tarcie podczas demakijażu przyspiesza powstawanie zmarszczek, rozciąga powieki i łamie rzęsy. Pozostawiony tusz zatyka mieszki rzęs i prowadzi do ich wypadania.</p>

<h2>Wybór produktu do demakijażu oczu</h2>
<ul>
  <li><strong>Olejowy płyn micelarny</strong> – najdelikatniejszy wybór. Micele olejowe otaczają cząsteczki makijażu i unoszą je bez tarcia.</li>
  <li><strong>Dwufazowy płyn do demakijażu</strong> – faza olejowa (tłuszcz) + faza wodna. Przed użyciem zawsze wstrząśnij.</li>
  <li><strong>Olejek balsamiczny</strong> – metoda "oil cleansing". Olejek roślinny (rycynowy, migdałowy) naniesiony na suche rzęsy rozpuszcza tusz i maskarę wodoodporną.</li>
</ul>

<h2>Prawidłowa technika demakijażu – krok po kroku</h2>
<ul>
  <li><strong>Krok 1:</strong> Nasącz wacik lub gazik płynem demakijażowym.</li>
  <li><strong>Krok 2:</strong> Połóż na zamkniętą powiekę i rzęsy. Odczekaj 20–30 sekund – to czas potrzebny na rozpuszczenie tuszu.</li>
  <li><strong>Krok 3:</strong> Przesuń wacik od wewnętrznego kącika oka ku zewnętrznemu, jednym delikatnym ruchem.</li>
  <li><strong>Krok 4:</strong> Użyj patyczka kosmetycznego do oczyszczenia linii rzęs u nasady.</li>
  <li><strong>Krok 5:</strong> Nałóż krem pod oczy lub olejek odżywczy na rzęsy (olej rycynowy).</li>
</ul>

<h2>Częste błędy</h2>
<ul>
  <li>Pocieranie powiek – rozciąga skórę i łamie rzęsy</li>
  <li>Używanie chusteczek do twarzy – za szorstkie dla okolicy oka</li>
  <li>Pomijanie demakijażu "bo makijaż był lekki" – utleniony tusz blokuje mieszki</li>
  <li>Używanie zwykłego żelu do mycia twarzy na okolice oczu – detergenty wysuszają</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Maskary wodoodporne wymagają specjalnych środków demakijażowych – zwykły płyn micelarny jest niewystarczający. Polecaj klientkom demakijaż dwuetapowy: najpierw olejek/dwufaza, potem łagodne oczyszczanie micelarne.
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Rzęsy',
          slug: 'quiz-rzezy',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Pielęgnacja i Zabiegi Rzęs',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Ile rzęs wypadanie dziennie jest zjawiskiem fizjologicznym?',
                explanation: 'Dziennie wypada 1–5 rzęs – jest to naturalna konsekwencja cyklu wzrostu.',
                options: [
                  { text: '1–5 rzęs', isCorrect: true },
                  { text: '10–15 rzęs', isCorrect: false },
                  { text: '20–30 rzęs', isCorrect: false },
                  { text: '0 – żadne wypadanie nie jest normą', isCorrect: false }
                ]
              },
              {
                text: 'Jak długo trwa pełny cykl rzęsy (od wzrostu do wypadnięcia)?',
                explanation: 'Pełny cykl wzrostu rzęsy trwa 4–6 miesięcy.',
                options: [
                  { text: '4–6 miesięcy', isCorrect: true },
                  { text: '2–4 tygodnie', isCorrect: false },
                  { text: '2–3 lata', isCorrect: false },
                  { text: '1–2 miesiące', isCorrect: false }
                ]
              },
              {
                text: 'Który typ preparatu stosuje się w fazie 1 liftingu rzęs (faza breaking)?',
                explanation: 'Faza breaking używa preparatu alkalicznego (np. tiomleczan amonu), który rozbija wiązania disiarczkowe w keratynie rzęsy.',
                options: [
                  { text: 'Preparat alkaliczny (np. tiomleczan amonu)', isCorrect: true },
                  { text: 'Preparat utleniający (nadtlenek wodoru)', isCorrect: false },
                  { text: 'Maska keratynowa', isCorrect: false },
                  { text: 'Serum z biotyną', isCorrect: false }
                ]
              },
              {
                text: 'Jak długo należy unikać wilgoci po zabiegu liftingu rzęs?',
                explanation: 'Przez 24–48 godzin po liftingu należy unikać wilgoci (para, basen, deszcz), aby wiązania disiarczkowe mogły w pełni się utwardzić.',
                options: [
                  { text: '24–48 godzin', isCorrect: true },
                  { text: '15 minut', isCorrect: false },
                  { text: '1 tydzień', isCorrect: false },
                  { text: 'Brak ograniczeń', isCorrect: false }
                ]
              },
              {
                text: 'Jaka jest minimalna długość rzęs do wykonania bezpiecznego liftingu?',
                explanation: 'Rzęsy krótsze niż 4 mm nie nadają się do liftingu – nie można ich prawidłowo ułożyć na wałeczku.',
                options: [
                  { text: '4 mm', isCorrect: true },
                  { text: '2 mm', isCorrect: false },
                  { text: '10 mm', isCorrect: false },
                  { text: '1 cm', isCorrect: false }
                ]
              },
              {
                text: 'Jaka jest główna różnica między liftingiem a laminowaniem rzęs?',
                explanation: 'Lifting nadaje podgięcie w górę, laminowanie wyrównuje i układa rzęsy w jednym kierunku, nadając im połysk.',
                options: [
                  { text: 'Lifting podgina rzęsy w górę, laminowanie układa i wyrównuje', isCorrect: true },
                  { text: 'Lifting wydłuża rzęsy, laminowanie pogrubia', isCorrect: false },
                  { text: 'Laminowanie podgina rzęsy, lifting tylko odżywia', isCorrect: false },
                  { text: 'Nie ma żadnej różnicy – to te same zabiegi', isCorrect: false }
                ]
              },
              {
                text: 'Który składnik serum do rzęs może powodować przebarwienia tęczówki przy nieodpowiednim stosowaniu?',
                explanation: 'Bimatoprost (analog prostaglandyny) może powodować przebarwienia tęczówki, dlatego należy stosować go wyłącznie u nasady rzęs.',
                options: [
                  { text: 'Bimatoprost (analog prostaglandyny)', isCorrect: true },
                  { text: 'Biotyna', isCorrect: false },
                  { text: 'Pantenol', isCorrect: false },
                  { text: 'Ekstrakt z bambusa', isCorrect: false }
                ]
              },
              {
                text: 'Który olej jest szczególnie polecany po zabiegach chemicznych (lifting, laminowanie) do odbudowy łuski rzęsy?',
                explanation: 'Olej arganowy odbudowuje łuskę rzęsy i jest polecany po chemicznych zabiegach pielęgnacyjnych.',
                options: [
                  { text: 'Olej arganowy', isCorrect: true },
                  { text: 'Olej rycynowy', isCorrect: false },
                  { text: 'Olej kokosowy', isCorrect: false },
                  { text: 'Olejek z drzewa herbacianego', isCorrect: false }
                ]
              },
              {
                text: 'Jak długo należy trzymać wacik z demakijażem na rzęsach przed usunięciem tuszu?',
                explanation: 'Wacik nasączony płynem demakijażowym należy trzymać na rzęsach 20–30 sekund, co pozwala produktowi rozpuścić tusz bez konieczności pocierania.',
                options: [
                  { text: '20–30 sekund', isCorrect: true },
                  { text: '2–3 sekundy', isCorrect: false },
                  { text: '5 minut', isCorrect: false },
                  { text: 'Czas nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Który z objawów może wskazywać na chorobę tarczycy jako przyczynę wypadania rzęs?',
                explanation: 'Objaw Hertoghe\'a – wypadanie zewnętrznej 1/3 brwi i rzęs – jest klasycznym objawem niedoczynności tarczycy.',
                options: [
                  { text: 'Wypadanie zewnętrznej 1/3 rzęs (objaw Hertoghe\'a)', isCorrect: true },
                  { text: 'Wypadanie wyłącznie górnych rzęs', isCorrect: false },
                  { text: 'Sinienie rzęs', isCorrect: false },
                  { text: 'Łamanie rzęs w połowie długości', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 3: Podstawy Pielęgnacji Skóry Twarzy ─────────────────────────────

const course3: CourseData = {
  title: 'Podstawy Pielęgnacji Skóry Twarzy',
  slug: 'podstawy-pielegnacji-skory-twarzy',
  description: 'Naucz się określać typ cery, zrozum różnicę między skórą suchą a odwodnioną i zbuduj skuteczną codzienną rutynę pielęgnacyjną opartą na wiedzy, a nie reklamach.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 105,
  tags: ['cera', 'oczyszczanie', 'nawilżanie'],
  modules: [
    {
      title: 'Poznaj swoją skórę',
      lessons: [
        {
          title: 'Jak określić swój typ cery',
          slug: 'jak-okreslic-typ-cery',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Dlaczego warto znać swój typ cery?</h2>
<p>Dobór kosmetyków, które nie pasują do Twojego typu cery, to jeden z najczęstszych powodów problemów skórnych. Tłusta cera traktowana kremami dla skóry suchej będzie zatkana. Sucha cera oczyszczana agresywnymi żelami – przesuszona i podrażniona. Prawidłowe określenie typu cery to fundament skutecznej pielęgnacji.</p>

<h2>Cztery podstawowe typy cery</h2>
<ul>
  <li><strong>Cera normalna</strong> – idealna równowaga sebum i nawilżenia. Pory niewidoczne, skóra gładka, elastyczna, bez wypryskόw. Rzadkość u dorosłych.</li>
  <li><strong>Cera sucha</strong> – niedostateczna produkcja sebum. Skóra matowa, ściągnięta, często łuszcząca się, ze skłonnością do podrażnień i wczesnych zmarszczek.</li>
  <li><strong>Cera tłusta</strong> – nadmiar sebum. Lśniąca cera, rozszerzone pory, skłonność do zaskórników i wyprysków.</li>
  <li><strong>Cera mieszana</strong> – strefa T (czoło, nos, broda) tłusta, policzki normalne lub suche. Najczęstszy typ.</li>
</ul>

<h2>Test bibułkowy – najprostsza metoda</h2>
<p>Wykonaj rano, po co najmniej 1 godzinie od przebudzenia (skóra musi "pracować" naturalnie):</p>
<ul>
  <li>Umyj twarz łagodnym środkiem wieczorem</li>
  <li>Rano nie nakładaj żadnych kosmetyków</li>
  <li>Po 1–2 godzinach przyłóż bibułę do czoła, nosa, podbródka i policzków</li>
  <li>Oceń ślad tłuszczu na bibule</li>
</ul>
<p><strong>Interpretacja:</strong> Tłusty ślad wszędzie = cera tłusta. Brak śladu = cera sucha. Tłusty ślad tylko ze strefy T = cera mieszana.</p>

<h2>Test obserwacyjny przez 24 godziny</h2>
<p>Bardziej precyzyjny: przez cały dzień obserwuj zachowanie skóry po oczyszczeniu (bez kosmetyków):</p>
<ul>
  <li>Uczucie ściągnięcia przez kilka godzin → cera sucha lub odwodniona</li>
  <li>Lśnienie i tłustość po 2–3 godzinach → cera tłusta</li>
  <li>Ściąganie na policzkach + lśnienie na nosie → cera mieszana</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Typ cery może się zmieniać wraz z wiekiem, porami roku, hormonami i stresem. Warto co 6–12 miesięcy powtarzać ocenę i dostosowywać pielęgnację. Cera mieszana lub tłusta w młodości często staje się normalna lub sucha po 35. roku życia.
</blockquote>

<h2>Skóra wrażliwa – nie typ, lecz cecha</h2>
<p>Ważne rozróżnienie: wrażliwość skóry to cecha, którą może mieć każdy typ cery. Skóra wrażliwa reaguje silniej na kosmetyki, temperaturę, stres. Często towarzyszy jej rumień, pieczenie, swędzenie. Nie jest osobnym typem cery!</p>
`
        },
        {
          title: 'Sucha vs. odwodniona – kluczowe różnice',
          slug: 'sucha-vs-odwodniona',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Powszechna pomyłka</h2>
<p>To jeden z najczęściej popełnianych błędów w pielęgnacji: mylenie skóry suchej z odwodnioną. Błędna diagnoza oznacza błędne kosmetyki – i efekty gorsze od oczekiwanych lub nawet pogłębienie problemu.</p>

<h2>Skóra sucha – stan trwały</h2>
<p><strong>Skóra sucha (xerosis)</strong> to typ cery charakteryzujący się <strong>niedostateczną produkcją sebum</strong>. Jest uwarunkowana genetycznie lub hormonalnie.</p>
<p>Cechy:</p>
<ul>
  <li>Brak lśnienia, matowa przez cały dzień</li>
  <li>Drobne, niewidoczne pory</li>
  <li>Uczucie ściągnięcia zaraz po oczyszczeniu</li>
  <li>Łuszczenie i szorstkość naskórka</li>
  <li>Skłonność do pękania w kącikach ust</li>
  <li>Szybsze powstawanie zmarszczek</li>
</ul>
<p><strong>Rozwiązanie:</strong> Kosmetyki z emolentami (oleje, masła roślinne) i okludentami (wazelina, cerezyna), które zastępują brakujące sebum.</p>

<h2>Skóra odwodniona – stan przejściowy</h2>
<p><strong>Skóra odwodniona</strong> ma niedobór <strong>wody</strong> (nie tłuszczu) w naskórku. To stan, nie typ – może dotknąć każdego, w tym skórę tłustą!</p>
<p>Cechy:</p>
<ul>
  <li>Drobne, siatkowe zmarszczki (widoczne przy ściśnięciu skóry)</li>
  <li>Uczucie ściągnięcia, ale <em>może</em> być jednocześnie lśniąca (tłusta i odwodniona)</li>
  <li>Skóra wygląda "zmęczona" i szara</li>
  <li>Stan zmienia się zależnie od pory roku, diety, snu, stresu</li>
</ul>
<p><strong>Rozwiązanie:</strong> Humektanty – substancje przyciągające wodę: kwas hialuronowy, gliceryna, mocznik, aloes.</p>

<h2>Różnica w jednym zdaniu</h2>
<p>Skóra sucha ma za mało <strong>tłuszczu</strong>. Skóra odwodniona ma za mało <strong>wody</strong>. Skóra tłusta i odwodniona jednocześnie = nadmiar sebum + niedobór wilgoci.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Test szczypty – delikatnie ściśnij policzek w fałd skóry. Jeśli widzisz drobne zmarszczki siatkowe i skóra wolno wraca do poprzedniego stanu – jest odwodniona. Przy skórze dobrze nawodnionej zmarszczki nie są widoczne, a skóra natychmiast wraca do normy.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Codzienna rutyna',
      lessons: [
        {
          title: 'Podwójne oczyszczanie – dlaczego jeden krok nie wystarczy',
          slug: 'podwojne-oczyszczanie',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym jest podwójne oczyszczanie?</h2>
<p>Metoda podwójnego oczyszczania (double cleansing), spopularyzowana przez koreańską pielęgnację, opiera się na zasadzie "podobne rozpuszcza podobne". Polega na użyciu <strong>dwóch produktów</strong> jeden po drugim: najpierw olejowego, potem wodnego.</p>

<h2>Krok 1: Olejowy (lipofilowy)</h2>
<p>Olejek, balsam lub micelarna woda z olejami usuwa <strong>składniki lipofilowe</strong> (tłuszczolubne):</p>
<ul>
  <li>Makijaż, w tym wodoodporny tusz i podkład SPF</li>
  <li>Nadmiar sebum</li>
  <li>Zanieczyszczenia środowiskowe (smog, kurz)</li>
  <li>Filtry UV (szczególnie chemiczne)</li>
</ul>
<p>Wybór: olejek do demakijażu, balm cleansing, micelarna woda dwufazowa.</p>

<h2>Krok 2: Wodny (hydrofilowy)</h2>
<p>Żel, pianka lub mleczko usuwa resztki pierwszego produktu i czyści skórę w głąb. Dopiero po tym kroku skóra jest <strong>naprawdę czysta</strong>:</p>
<ul>
  <li>Resztki olejku z kroku 1</li>
  <li>Pot, bakterie</li>
  <li>Składniki hydrofilowe (np. roztwory tonerów używanych rano)</li>
</ul>
<p>Wybór: żel do mycia twarzy, łagodna pianka, kwasowy cleanser.</p>

<h2>Kiedy podwójne oczyszczanie jest niezbędne?</h2>
<ul>
  <li>Wieczorem – zawsze, gdy byłeś na zewnątrz lub miałeś makijaż</li>
  <li>Po aktywności fizycznej i intensywnym poceniu</li>
  <li>Przy skórze trądzikowej – zatkane pory często wynikają z nieoczyszczenia makijażu SPF</li>
</ul>

<h2>Kiedy wystarczy jedno oczyszczanie?</h2>
<ul>
  <li>Rano – po nocy, gdy skóra "tylko" produkowała sebum. Wystarczy łagodny żel lub mleczko.</li>
  <li>Gdy nie miałeś makijażu i byłeś w domu przez cały dzień.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Dla cer suchych i wrażliwych podwójne oczyszczanie można zastąpić jednym delikatnym balsamem cleansing, który łączy obie fazy. Unika się wtedy ryzyka przesuszenia skóry przez dwa etapy.
</blockquote>
`
        },
        {
          title: 'Tonik, esencja, serum – właściwa kolejność',
          slug: 'tonik-esencja-serum-kolejnosc',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Złota zasada kolejności aplikacji</h2>
<p>Kosmetyki nakłada się od <strong>najrzadszych do najgęstszych</strong>. Produkty o większych cząsteczkach nakładane na lżejsze blokują ich wnikanie. Prawidłowa kolejność zapewnia maksymalną biodostępność składników aktywnych.</p>

<h2>Tonik</h2>
<p>Nakładany bezpośrednio po oczyszczeniu. Zadania:</p>
<ul>
  <li>Przywrócenie pH skóry po myciu (oczyszczacze często mają pH 7–9, skóra optymalna ~5,5)</li>
  <li>Usunięcie resztek środka oczyszczającego</li>
  <li>Pierwsze nawilżenie – przygotowanie do kolejnych warstw</li>
</ul>
<p>Unikaj toników z alkoholem denaturowanym – wysuszają barierę skórną. Szukaj toników z gliceryną, alantoiną, kwasem hialuronowym.</p>

<h2>Esencja (essence)</h2>
<p>Koreański wynalazek. Lżejsza niż serum, ale bogatsza w składniki aktywne niż tonik. Konsystencja: wodnista lub lekko żelowa. Najczęstsze składniki:</p>
<ul>
  <li>Filtraty z fermentacji (galaktomyces, bifida) – naprawiają barierę skórną</li>
  <li>Niacynamid – reguluje sebum, rozjaśnia</li>
  <li>Hialuron – nawilża w głąb naskórka</li>
</ul>
<p>Stosowanie: kilka kropli na dłonie, delikatnie przykładaj do twarzy (nie trzyj).</p>

<h2>Serum</h2>
<p>Skoncentrowany preparat z wysokim stężeniem składników aktywnych. Jeden z ważniejszych kroków rutyny. Wybierasz serum celowane na swój problem:</p>
<ul>
  <li>Serum z witaminą C → rozjaśnianie, antyoksydacja (rano)</li>
  <li>Serum z retinolem → anti-aging, odbudowa (wieczorem)</li>
  <li>Serum z niacynamidem → pory, sebum, przebarwienia</li>
  <li>Serum z kwasem hialuronowym → głębokie nawilżenie</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Nie używaj jednocześnie witaminy C z niacynamidem – choć szkodliwość tej kombinacji jest kontrowersyjna, może powodować zaczerwienienie u wrażliwych skór. Witaminy C używaj rano, niacynamidu wieczorem lub odwrotnie.
</blockquote>
`
        },
        {
          title: 'Krem nawilżający i filtr SPF – fundament każdej rutyny',
          slug: 'krem-nawilzajacy-spf',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Krem nawilżający – ostatni krok oczyszczania</h2>
<p>Krem nawilżający "zamyka" wcześniejsze warstwy pielęgnacji i zapobiega transepidermalnej utracie wody (TEWL). Działa na trzy sposoby:</p>
<ul>
  <li><strong>Humektanty</strong> – przyciągają wodę z powietrza i głębszych warstw skóry (gliceryna, hialuron, aloes)</li>
  <li><strong>Emolenty</strong> – wypełniają przestrzenie między komórkami naskórka, wygładzają (oleje roślinne, skwalan)</li>
  <li><strong>Okludenty</strong> – tworzą fizyczną barierę zapobiegającą odparowaniu wody (wazelina, dimetykon)</li>
</ul>
<p>Bogaty krem = więcej okludentów. Lekki żel = więcej humektantów. Dobieraj zgodnie z typem cery.</p>

<h2>Filtr SPF – najpowszechniej pomijany krok</h2>
<p>Promieniowanie UV to <strong>główna przyczyna fotostarzenia</strong> (80% zmarszczek, przebarwień, utraty elastyczności). Filtry SPF dzielą się na:</p>
<ul>
  <li><strong>Mineralne (fizyczne)</strong> – cynk i tlenek tytanu. Odbijają promieniowanie UV. Bezpieczne dla skóry wrażliwej, mogą zostawiać biały film.</li>
  <li><strong>Chemiczne (organiczne)</strong> – pochłaniają UV i zamieniają w ciepło. Lżejsza tekstura, bez białego śladu. Wymagają aplikacji 20 min przed ekspozycją.</li>
  <li><strong>Hybrydowe</strong> – kombinacja obu typów. Najczęściej stosowane we współczesnych kosmetykach.</li>
</ul>

<h2>Ile SPF wybrać?</h2>
<ul>
  <li><strong>SPF 30</strong> – blokuje ~97% UVB. Dla codziennego stosowania w mieście.</li>
  <li><strong>SPF 50</strong> – blokuje ~98% UVB. Dla długiej ekspozycji, jasnej skóry, po zabiegach.</li>
</ul>
<p>Różnica między SPF 30 a 50 jest mniejsza niż się wydaje, ale konsekwentne codzienne stosowanie jakiegokolwiek SPF daje ogromne długoterminowe korzyści.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Najlepszy krem z SPF to taki, który klientka będzie stosować codziennie. Jeśli tekstura jest nieprzyjemna, zrezygnuje po tygodniu. Pomóż jej znaleźć lekki filtr, który lubi – nawet SPF 30 stosowany codziennie przez rok daje więcej niż SPF 50 stosowany nieregularnie.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Quiz',
      lessons: [
        {
          title: 'Quiz końcowy — Podstawy pielęgnacji',
          slug: 'quiz-podstawy-pielegnacji',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Podstawy Pielęgnacji Skóry Twarzy',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Jaka jest optymalna wartość pH skóry twarzy?',
                explanation: 'Naturalne pH skóry wynosi około 5,5, co odpowiada lekko kwaśnemu środowisku ochronnemu.',
                options: [
                  { text: '~5,5', isCorrect: true },
                  { text: '~7,0 (neutralne)', isCorrect: false },
                  { text: '~9,0', isCorrect: false },
                  { text: '~3,0', isCorrect: false }
                ]
              },
              {
                text: 'Skóra odwodniona różni się od suchej tym, że:',
                explanation: 'Skóra sucha ma za mało sebum (tłuszczu), a odwodniona ma za mało wody. Każdy typ cery może być odwodniony.',
                options: [
                  { text: 'Ma niedobór wody, nie tłuszczu', isCorrect: true },
                  { text: 'Ma nadmiar sebum', isCorrect: false },
                  { text: 'Dotyczy tylko cer tłustych', isCorrect: false },
                  { text: 'Jest typem cery, a nie stanem', isCorrect: false }
                ]
              },
              {
                text: 'W jakiej kolejności nakładamy produkty do pielęgnacji twarzy?',
                explanation: 'Produkty nakłada się od najrzadszych do najgęstszych, by każda warstwa mogła wniknąć w skórę.',
                options: [
                  { text: 'Od najrzadszych do najgęstszych', isCorrect: true },
                  { text: 'Od najgęstszych do najrzadszych', isCorrect: false },
                  { text: 'Od najbardziej aktywnych do bazowych', isCorrect: false },
                  { text: 'Kolejność nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Co usuwa pierwszy krok podwójnego oczyszczania (olejowy)?',
                explanation: 'Olejowy krok oczyszczania usuwa składniki lipofilowe: makijaż, sebum, filtry UV i zanieczyszczenia środowiskowe.',
                options: [
                  { text: 'Makijaż, sebum i filtry UV', isCorrect: true },
                  { text: 'Bakterie i pot', isCorrect: false },
                  { text: 'Martwe komórki naskórka', isCorrect: false },
                  { text: 'Resztki kwasów z pielęgnacji wieczornej', isCorrect: false }
                ]
              },
              {
                text: 'Jaka jest różnica między humektantem a okludentem?',
                explanation: 'Humektanty przyciągają wodę do skóry, okludenty tworzą barierę fizyczną zapobiegającą jej odparowaniu.',
                options: [
                  { text: 'Humektant przyciąga wodę, okluden zapobiega jej utracie', isCorrect: true },
                  { text: 'Humektant jest tłuszczem, okluden wodą', isCorrect: false },
                  { text: 'Okluden stymuluje produkcję kolagenu', isCorrect: false },
                  { text: 'Obie substancje działają identycznie', isCorrect: false }
                ]
              },
              {
                text: 'O której porze dnia najlepiej stosować serum z witaminą C?',
                explanation: 'Witamina C jest antyoksydantem i chroni skórę przed wolnymi rodnikami z promieniowania UV – dlatego stosuje się ją rano.',
                options: [
                  { text: 'Rano – chroni przed UV i wolnymi rodnikami', isCorrect: true },
                  { text: 'Wieczorem – działa w nocy', isCorrect: false },
                  { text: 'Tylko raz w tygodniu', isCorrect: false },
                  { text: 'Pora nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'SPF 50 blokuje jaki procent promieniowania UVB?',
                explanation: 'SPF 50 blokuje około 98% promieniowania UVB, SPF 30 blokuje około 97%.',
                options: [
                  { text: '~98%', isCorrect: true },
                  { text: '~100%', isCorrect: false },
                  { text: '~50%', isCorrect: false },
                  { text: '~75%', isCorrect: false }
                ]
              },
              {
                text: 'Czym charakteryzuje się cera mieszana?',
                explanation: 'Cera mieszana ma tłustą strefę T (czoło, nos, broda) i normalne lub suche policzki.',
                options: [
                  { text: 'Tłusta strefa T, normalne lub suche policzki', isCorrect: true },
                  { text: 'Tłusta tylko na policzkach', isCorrect: false },
                  { text: 'Jednakowo sucha w całej twarzy', isCorrect: false },
                  { text: 'Zmienna tekstura bez wzorca', isCorrect: false }
                ]
              },
              {
                text: 'Który filtr słoneczny jest szczególnie polecany dla skóry wrażliwej?',
                explanation: 'Filtry mineralne (tlenek cynku, tlenek tytanu) są fizyczne, nie wchłaniają się w skórę i rzadziej powodują podrażnienia.',
                options: [
                  { text: 'Mineralny (fizyczny) – tlenek cynku lub tytanu', isCorrect: true },
                  { text: 'Chemiczny – pochłania UV', isCorrect: false },
                  { text: 'Hybrydowy z olejkami eterycznymi', isCorrect: false },
                  { text: 'Dla skóry wrażliwej nie ma odpowiedniego filtra', isCorrect: false }
                ]
              },
              {
                text: 'Jak działa test szczypty do oceny nawodnienia skóry?',
                explanation: 'Ściśnięcie policzka w fałd i obserwacja zmarszczek siatkowych wskazuje odwodnienie. Skóra nawodniona wraca szybko do normy bez widocznych zmarszczek.',
                options: [
                  { text: 'Ściskamy policzek – drobne zmarszczki siatkowe wskazują odwodnienie', isCorrect: true },
                  { text: 'Przykładamy bibułkę i mierzymy ilość sebum', isCorrect: false },
                  { text: 'Mierzymy wilgotność skóry specjalnym miernikiem', isCorrect: false },
                  { text: 'Obserwujemy kolor skóry po wysiłku fizycznym', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 4: Cera Tłusta i Mieszana ────────────────────────────────────────

const course4: CourseData = {
  title: 'Cera Tłusta i Mieszana – Jak Okiełznać Łojotok',
  slug: 'cera-tlusta-mieszana-lojotok',
  description: 'Poznaj biologię cery tłustej, zrozum dlaczego "wysuszanie" skóry nie działa i naucz się budować skuteczną rutynę ze składnikami aktywnymi, które naprawdę regulują sebum.',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 105,
  tags: ['cera tłusta', 'pory', 'sebum'],
  modules: [
    {
      title: 'Biologia tłustej skóry',
      lessons: [
        {
          title: 'Sebum – czym jest i dlaczego skóra go produkuje',
          slug: 'sebum-czym-jest',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym jest sebum?</h2>
<p>Sebum to mieszanina lipidów produkowana przez gruczoły łojowe. Jest niezbędny dla prawidłowego funkcjonowania skóry – tworzy hydrolipidowy film powierzchniowy, który chroni skórę przed patogenami, reguluje pH i zapobiega transepidermalnej utracie wody (TEWL).</p>

<h2>Skład sebum</h2>
<ul>
  <li><strong>Trójglicerydy (~57%)</strong> – przekształcane przez bakterie skórne w wolne kwasy tłuszczowe; ich nadmiar wzmaga trądzik</li>
  <li><strong>Woski estrowe (~26%)</strong> – nadają sebum oleistą konsystencję</li>
  <li><strong>Skwalen (~12%)</strong> – naturalny antyoksydant; w nadmiarze utlenia się i sprzyja tworzeniu zaskórników</li>
  <li><strong>Estry cholesterolu i cholesterol (~5%)</strong></li>
</ul>

<h2>Co stymuluje produkcję sebum?</h2>
<ul>
  <li><strong>Androgeny (testosteron, DHT)</strong> – główny czynnik. Gruczoły łojowe mają receptory androgenowe; wyższy poziom androgenów = więcej sebum. Dlatego skóra tłusta jest częstsza w okresie dojrzewania i u mężczyzn.</li>
  <li><strong>Stres (kortyzol)</strong> – kortyzol nasila produkcję sebum przez aktywację osi HPA → androgeny nadnerczowe.</li>
  <li><strong>Dieta wysokoglikemiczna i mleko</strong> – podnoszą insulinę i IGF-1, które stymulują gruczoły łojowe.</li>
  <li><strong>Ciepło i wilgotność</strong> – gruczoły łojowe produkują więcej sebum w wyższej temperaturze.</li>
  <li><strong>Przesuszenie skóry</strong> – paradoks: wysuszając skórę agresywnymi środkami, prowokami jej do kompensacyjnej nadprodukcji sebum.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Najczęstszy błąd klientek z cerą tłustą to agresywne wysuszanie – alkoholowe toniki, mydło, peelingi mechaniczne codziennie. Skóra odpowiada nadprodukcją sebum. Zamiast "walczyć" z tłustą cerą, należy ją delikatnie regulować i dobrze nawilżać.
</blockquote>

<h2>Sebum a trądzik</h2>
<p>Sama produkcja sebum nie wywołuje trądziku. Trądzik to choroba wieloczynnikowa: nadmiar sebum + namnażanie bakterii <em>Cutibacterium acnes</em> (dawniej <em>P. acnes</em>) + stan zapalny + rogowacenie ujść mieszków = zaskórniki i grudki. Leczenie musi uwzględniać wszystkie te czynniki.</p>
`
        },
        {
          title: 'Rozszerzone pory – przyczyny i jak je minimalizować',
          slug: 'rozszerzone-pory',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym są "pory" widoczne na skórze?</h2>
<p>Pory to ujścia mieszków włosowych i gruczołów łojowych. Każda pора składa się z kanału mieszka, przez który wypływa sebum i w którym rośnie włos (lub puszek). Pory <strong>nie otwierają się ani nie zamykają</strong> – to popularny mit. Można jednak wpłynąć na ich widoczność.</p>

<h2>Dlaczego pory się powiększają?</h2>
<ul>
  <li><strong>Nadmiar sebum</strong> – rozciąga ściany pory, szczególnie przy zastoju (zaskórniki)</li>
  <li><strong>Utrata elastyczności skóry</strong> – z wiekiem kolagen degraduje, a skóra nie "trzyma" ścian pory tak mocno. Pory wyglądają na większe.</li>
  <li><strong>Słońce (fotostarzenie)</strong> – promieniowanie UVA degraduje kolagen i elastynę wokół porów</li>
  <li><strong>Niedostateczne oczyszczanie</strong> – zatykanie sebumem i keratyną rozciąga ściany pory</li>
  <li><strong>Genetyka</strong> – decyduje o naturalnej gęstości gruczołów łojowych i ich rozmiarze</li>
</ul>

<h2>Co naprawdę minimalizuje wygląd porów</h2>
<ul>
  <li><strong>Kwas salicylowy (BHA)</strong> – lipofilowy, wnika w por i rozpuszcza sebum oraz martwe komórki od środka. Najskuteczniejszy składnik do porów.</li>
  <li><strong>Niacynamid</strong> – badania kliniczne potwierdzają zmniejszenie widoczności porów przy stosowaniu 2–5% niacynamidu przez 4+ tygodnie.</li>
  <li><strong>Retinol</strong> – stymuluje produkcję kolagenu wokół porów, dzięki czemu skóra "trzyma" je ściślej.</li>
  <li><strong>AHA (kwas glikolowy, mlekowy)</strong> – złuszczają powierzchnię, usuwają martwice zatykające pory i wygładzają ich obrzeża.</li>
  <li><strong>Filtry SPF</strong> – zapobiegają fotostarzeniu, które powiększa pory z czasem.</li>
</ul>

<h2>Czego unikać</h2>
<ul>
  <li>Ściskania i wyciskania – mechaniczne urazy powodują stan zapalny i blizny, które trwale powiększają pory</li>
  <li>Grubych kremów z woliną lub kokosem na strefę T – zatykają pory</li>
  <li>Peelingów mechanicznych z dużymi granulkami – rysują naskórek</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Pory nie "kurczą się" pod wpływem zimnej wody ani lodu – to odczucie ściągnięcia to chwilowe zwężenie naczyń. Jedyne trwałe zmniejszenie widoczności porów daje regularne stosowanie BHA, niacynamidu i retinolu przez minimum 3 miesiące.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Składniki aktywne',
      lessons: [
        {
          title: 'Kwas salicylowy i niacynamid – duet dla cery tłustej',
          slug: 'kwas-salicylowy-niacynamid',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Kwas salicylowy (BHA)</h2>
<p>Kwas salicylowy należy do grupy BHA (beta-hydroxy acids). Jego unikalna właściwość to <strong>lipofilowość</strong> – jest rozpuszczalny w tłuszczach, co umożliwia mu wnikanie w por wypełniony sebumem.</p>

<h2>Jak działa kwas salicylowy?</h2>
<ul>
  <li><strong>Keratolityczny</strong> – rozluźnia i usuwa martwe komórki naskórka (korneocyty), odblokowuje pory</li>
  <li><strong>Przeciwzapalny</strong> – pochodzi od aspiryny (kwas acetylosalicylowy); hamuje cyklooksygenazę i zmniejsza stan zapalny w zaskórnikach</li>
  <li><strong>Przeciwbakteryjny</strong> – hamuje namnażanie <em>C. acnes</em> w porach</li>
  <li><strong>Sebum-regulujący</strong> – zmniejsza lepkość sebum, ułatwiając jego odpływ</li>
</ul>

<h2>Stężenia i stosowanie</h2>
<ul>
  <li><strong>0,5–1%</strong> – do codziennego stosowania (toniki, esencje), delikatna regulacja</li>
  <li><strong>2%</strong> – optymalne dla cery trądzikowej. Dostępne w kremach, tonikach i lokalizatorach</li>
  <li><strong>3–5%</strong> – peelingi kosmetyczne, aplikowane co 1–2 tygodnie</li>
</ul>

<h2>Niacynamid (witamina B3)</h2>
<p>Niacynamid to jedna z najbardziej przebadanych substancji aktywnych w kosmetologii. Działa wielokierunkowo:</p>
<ul>
  <li><strong>Reguluje sebum</strong> – zmniejsza produkcję lipidów w gruczołach łojowych</li>
  <li><strong>Minimalizuje pory</strong> – widoczne efekty po 4–8 tygodniach przy 2–5%</li>
  <li><strong>Rozjaśnia przebarwienia</strong> – hamuje transfer melanosomów do keratynocytów</li>
  <li><strong>Wzmacnia barierę skórną</strong> – stymuluje syntezę ceramidów, filagryny i keratyny</li>
  <li><strong>Przeciwzapalny</strong> – redukuje zaczerwienienia</li>
</ul>

<h2>Łączenie obu składników</h2>
<p>Kwas salicylowy i niacynamid można stosować razem – uzupełniają się. BHA oczyszcza por, niacynamid reguluje gruczół łojowy i wzmacnia barierę. Klasyczna kombinacja: tonik z BHA rano, serum z niacynamidem wieczorem (lub odwrotnie).</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Zaczynaj od niskiego stężenia BHA (0,5–1%) i stosuj co drugi dzień przez pierwsze 2 tygodnie. Skóra musi się zaadaptować. Zbyt intensywne wprowadzenie może wywołać "BHA purge" – tymczasowe nasilenie wyprysków, które ustępuje po 4–6 tygodniach.
</blockquote>
`
        },
        {
          title: 'Glinki i maseczki oczyszczające – kiedy i jak stosować',
          slug: 'glinki-maseczki-oczyszczajace',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Jak działają glinki?</h2>
<p>Glinki to minerały o strukturze krystalicznej z ujemnym ładunkiem elektrycznym. Dzięki temu <strong>przyciągają i absorbują</strong> naładowane dodatnio cząsteczki: sebum, toksyny, metale ciężkie, bakterie. Jednocześnie działają matująco i łagodnie złuszczająco.</p>

<h2>Rodzaje glinek i ich właściwości</h2>
<ul>
  <li><strong>Biała glinka (kaolin)</strong> – najdelikatniejsza. Oczyszcza i matuje bez przesuszania. Dla cery mieszanej, wrażliwej i tłustej.</li>
  <li><strong>Zielona glinka (illite)</strong> – silne działanie absorbujące, remineralizujące. Bogata w żelazo, magnez, wapń. Dla cery tłustej i z trądzikiem.</li>
  <li><strong>Różowa glinka</strong> – mix białej i czerwonej. Łagodna, oczyszczająca. Dla cery mieszanej i normalnej.</li>
  <li><strong>Bentonit</strong> – wyjątkowo silne działanie absorbujące. Dla cery bardzo tłustej i zanieczyszczonej. Stosować ostrożnie – może przesuszyć.</li>
</ul>

<h2>Kiedy stosować</h2>
<ul>
  <li>1–2 razy w tygodniu – nie częściej. Zbyt częste stosowanie niszczy barierę hydrolipidową.</li>
  <li>Wieczorem – po oczyszczeniu, przed serum i kremem.</li>
  <li>Na strefę T (u cery mieszanej) – nie na całą twarz, jeśli policzki są suche.</li>
</ul>

<h2>Prawidłowe stosowanie</h2>
<ul>
  <li><strong>Nie czekaj, aż maseczka wyschnie do końca</strong> – moment, gdy maseczka jest jeszcze lekko wilgotna, to optimum wchłaniania. Gdy wyschnie całkowicie, zaczyna pobierać wodę ze skóry.</li>
  <li>Nałóż cienką warstwę, nie grubą "maskę od brody do czoła".</li>
  <li>Po zmyciu zawsze zastosuj tonik i krem nawilżający – glinki usunęły sebum, skóra potrzebuje nawilżenia.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Maseczka z glinką nie zastępuje codziennej pielęgnacji. To dodatek – zabieg raz w tygodniu. Skuteczność codziennej rutyny (BHA, niacynamid) jest ważniejsza niż weekendowe maseczki.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Rutyna i quiz',
      lessons: [
        {
          title: 'Budowanie skutecznej rutyny AM/PM dla cery tłustej',
          slug: 'rutyna-am-pm-cera-tlusta',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Zasady rutyny dla cery tłustej</h2>
<p>Cera tłusta wymaga równowagi – zbyt agresywna rutyna paradoksalnie wzmaga produkcję sebum (efekt odbicia), zbyt łagodna nie daje efektów. Kluczowe zasady:</p>
<ul>
  <li>Oczyszczaj delikatnie, ale skutecznie</li>
  <li>Nawilżaj lekko, ale koniecznie</li>
  <li>Stosuj składniki regulujące sebum systematycznie</li>
  <li>Nie pomijaj SPF – filtry dla cery tłustej mają lekką, żelową teksturę</li>
</ul>

<h2>Rutyna poranna (AM)</h2>
<ul>
  <li><strong>1. Oczyszczanie</strong> – łagodny żel z siarczanem sodowym lauretu (SLS-free) lub pianka. Woda letnia, nie gorąca.</li>
  <li><strong>2. Tonik</strong> – z niacynamidem lub BHA 0,5–1%. Bez alkoholu. Aplikuj watą lub dłonią.</li>
  <li><strong>3. Serum</strong> – z niacynamidem 5–10% lub witaminą C (dla antyoksydacji i regulacji melaniny).</li>
  <li><strong>4. Nawilżenie</strong> – lekki żel-krem na bazie wody. Bez olejów mineralnych i silikonów okludujących w składzie.</li>
  <li><strong>5. SPF</strong> – filtr SPF 30–50 o teksturze żelowej lub "invisible". Dla cery tłustej idealny jest SPF z niacynamidem.</li>
</ul>

<h2>Rutyna wieczorna (PM)</h2>
<ul>
  <li><strong>1. Podwójne oczyszczanie</strong> – olejek/micelarna dwufazowa, następnie żel wodny.</li>
  <li><strong>2. Tonik</strong> – można z BHA 2% (co drugi dzień na początku, codziennie po adaptacji).</li>
  <li><strong>3. Serum aktywne</strong> – retinol 0,025–0,1% (2–3 razy w tygodniu) lub serum z kwasem azelainowym (codziennie).</li>
  <li><strong>4. Nawilżenie/barierochronny krem</strong> – możesz użyć lekkiego żelu z aloesem lub hialuronianem sodu.</li>
  <li><strong>5. Maseczka z glinką (1–2× w tygodniu)</strong> – zamiast lub po rutynie, na strefę T.</li>
</ul>

<h2>Produkty do unikania</h2>
<ul>
  <li>Ciężkie masła (shea, kokosowy) – komedogenne dla cery tłustej</li>
  <li>Alkohol denaturat w tonikach – przesusza i wywołuje efekt odbicia</li>
  <li>Mydła alkaliczne – niszczą barierę skórną, podnoszą pH</li>
  <li>Złuszczacze mechaniczne z ostrymi granulkami – mikrourazy pogarszają trądzik</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Efekty rutyny dla cery tłustej są widoczne po 6–8 tygodniach regularnego stosowania. Zachęcaj klientki do robienia zdjęć co tydzień – często postęp jest stopniowy i niewidoczny bez porównania z początkiem.
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Cera tłusta',
          slug: 'quiz-cera-tlusta',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Cera Tłusta i Mieszana',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Co jest głównym hormonalnym czynnikiem stymulującym produkcję sebum?',
                explanation: 'Androgeny (testosteron, DHT) są głównym czynnikiem hormonalnym stymulującym gruczoły łojowe.',
                options: [
                  { text: 'Androgeny (testosteron, DHT)', isCorrect: true },
                  { text: 'Estrogeny', isCorrect: false },
                  { text: 'Insulina', isCorrect: false },
                  { text: 'Melatonina', isCorrect: false }
                ]
              },
              {
                text: 'Dlaczego kwas salicylowy jest szczególnie skuteczny dla cery tłustej?',
                explanation: 'Kwas salicylowy jest lipofilowy (rozpuszczalny w tłuszczach), dzięki czemu wnika w pory wypełnione sebumem.',
                options: [
                  { text: 'Jest lipofilowy i wnika w pory wypełnione sebumem', isCorrect: true },
                  { text: 'Jest hydrofilowy i przemywa pory wodą', isCorrect: false },
                  { text: 'Blokuje receptory androgenowe', isCorrect: false },
                  { text: 'Niszczy gruczoły łojowe', isCorrect: false }
                ]
              },
              {
                text: 'Ile razy w tygodniu należy stosować maseczkę z glinką?',
                explanation: 'Maseczka z glinką powinna być stosowana 1–2 razy w tygodniu. Częstsze używanie niszczy barierę hydrolipidową.',
                options: [
                  { text: '1–2 razy w tygodniu', isCorrect: true },
                  { text: 'Codziennie', isCorrect: false },
                  { text: 'Raz w miesiącu', isCorrect: false },
                  { text: '5–7 razy w tygodniu', isCorrect: false }
                ]
              },
              {
                text: 'Jaki efekt może wystąpić przy zbyt gwałtownym wprowadzeniu kwasu salicylowego?',
                explanation: '"BHA purge" to tymczasowe nasilenie wyprysków spowodowane przyspieszonym oczyszczaniem porów. Ustępuje po 4–6 tygodniach.',
                options: [
                  { text: '"BHA purge" – tymczasowe nasilenie wyprysków', isCorrect: true },
                  { text: 'Trwałe bliznowacenie', isCorrect: false },
                  { text: 'Alergia kontaktowa zawsze', isCorrect: false },
                  { text: 'Całkowite zatrzymanie produkcji sebum', isCorrect: false }
                ]
              },
              {
                text: 'Na czym polega "efekt odbicia" przy agresywnym wysuszaniu cery tłustej?',
                explanation: 'Gdy skóra jest agresywnie wysuszana, reaguje kompensacyjną nadprodukcją sebum, co pogarsza efekty pielęgnacji.',
                options: [
                  { text: 'Skóra produkuje więcej sebum w odpowiedzi na przesuszenie', isCorrect: true },
                  { text: 'Skóra staje się odwodniona i matowa', isCorrect: false },
                  { text: 'Pory całkowicie się zamykają', isCorrect: false },
                  { text: 'Producja łoju całkowicie ustaje', isCorrect: false }
                ]
              },
              {
                text: 'Które stężenie niacynamidu daje widoczne zmniejszenie porów?',
                explanation: 'Stężenie 2–5% niacynamidu wykazuje widoczne efekty po 4–8 tygodniach stosowania.',
                options: [
                  { text: '2–5%', isCorrect: true },
                  { text: '0,01%', isCorrect: false },
                  { text: '20–30%', isCorrect: false },
                  { text: 'Stężenie nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Która glinka ma najsilniejsze właściwości absorbujące sebum?',
                explanation: 'Bentonit ma wyjątkowo silne właściwości absorbujące, ale może przesuszyć skórę – należy stosować ostrożnie.',
                options: [
                  { text: 'Bentonit', isCorrect: true },
                  { text: 'Biała glinka (kaolin)', isCorrect: false },
                  { text: 'Różowa glinka', isCorrect: false },
                  { text: 'Glinka złota', isCorrect: false }
                ]
              },
              {
                text: 'Jaki składnik sebum może utleniać się i sprzyjać tworzeniu zaskórników?',
                explanation: 'Skwalen w sebum ulega utlenieniu pod wpływem powietrza, co sprzyja powstawaniu zatyczek w porach.',
                options: [
                  { text: 'Skwalen', isCorrect: true },
                  { text: 'Trójglicerydy', isCorrect: false },
                  { text: 'Woski estrowe', isCorrect: false },
                  { text: 'Cholesterol', isCorrect: false }
                ]
              },
              {
                text: 'Który produkt jest nieodpowiedni dla cery tłustej ze względu na właściwości komedogenne?',
                explanation: 'Olej kokosowy jest silnie komedogenny i może zatykać pory u osób z cerą tłustą.',
                options: [
                  { text: 'Masło kokosowe', isCorrect: true },
                  { text: 'Żel z kwasem hialuronowym', isCorrect: false },
                  { text: 'Tonik z niacynamidem', isCorrect: false },
                  { text: 'Serum z witaminą C', isCorrect: false }
                ]
              },
              {
                text: 'Przy jakim stężeniu kwasu salicylowego wykonuje się peelingi kosmetyczne?',
                explanation: 'Peelingi kosmetyczne z BHA stosują stężenia 3–5%, natomiast produkty codzienne zawierają 0,5–2%.',
                options: [
                  { text: '3–5%', isCorrect: true },
                  { text: '0,1–0,5%', isCorrect: false },
                  { text: '10–15%', isCorrect: false },
                  { text: '0,01%', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 5: Masaże Twarzy i Techniki Liftingujące ─────────────────────────

const course5: CourseData = {
  title: 'Masaże Twarzy i Techniki Liftingujące',
  slug: 'masaze-twarzy-techniki-liftingujace',
  description: 'Opanuj techniki masażu twarzy – drenaż limfatyczny, masaż Kobido, roller kwarcowy, gua sha i face yoga. Naucz się jak poprawić kontur twarzy bez skalpela.',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 105,
  tags: ['masaż', 'lifting', 'gua sha'],
  modules: [
    {
      title: 'Podstawy masażu',
      lessons: [
        {
          title: 'Drenaż limfatyczny twarzy – jak działa i co daje',
          slug: 'drenaz-limfatyczny-twarzy',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym jest drenaż limfatyczny?</h2>
<p>Drenaż limfatyczny to technika masażu stymulująca przepływ limfy przez naczynia limfatyczne. Limfa to płyn tkankowy transportujący odpadki metaboliczne, toksyny, martwe komórki i patogeny do węzłów chłonnych, gdzie są filtrowane i usuwane.</p>

<h2>Anatomia układu limfatycznego twarzy</h2>
<p>Naczynia limfatyczne twarzy biegną w specyficznych kierunkach:</p>
<ul>
  <li>Z czoła → do węzłów przyusznych</li>
  <li>Z policzków → do węzłów podżuchwowych</li>
  <li>Z okolic nosa i ust → do węzłów szyjnych</li>
  <li>Wszystkie kierunki → ku dołowi, do głównych węzłów szyjnych i obojczykowych</li>
</ul>
<p>Prawidłowy drenaż zawsze odbywa się <strong>w kierunku "serce układu limfatycznego"</strong> – czyli od twarzy ku dołowi, w stronę węzłów szyjnych i nadobojczykowych.</p>

<h2>Efekty drenażu limfatycznego twarzy</h2>
<ul>
  <li><strong>Redukcja opuchliźny</strong> – szczególnie rano, gdy limfa zastyguje podczas snu</li>
  <li><strong>Wyszczuplenie owalu twarzy</strong> – zmniejszenie retencji wody w tkankach</li>
  <li><strong>Rozjaśnienie skóry</strong> – lepsze odżywienie komórek, usunięcie toksyn</li>
  <li><strong>Zmniejszenie cieni pod oczami</strong> – drenaż okolicy oczodołowej</li>
  <li><strong>Poprawa napięcia skóry</strong> – pośrednio przez lepsze mikrokrążenie</li>
</ul>

<h2>Podstawowa technika drenażu – 5 kroków</h2>
<ul>
  <li><strong>1.</strong> Zacznij od węzłów szyjnych – kilka delikatnych ruchów pompowania w dół szyi, "otwierasz" odpływ</li>
  <li><strong>2.</strong> Czoło – delikatne ruchy od środka ku skroniom, następnie ku dołowi</li>
  <li><strong>3.</strong> Okolice oczu – bardzo delikatnie, kółeczkami od wewnętrznego kącika ku zewnętrznemu</li>
  <li><strong>4.</strong> Policzki – od nosa ku uszom, następnie ku węzłom szyjnym</li>
  <li><strong>5.</strong> Szczęka i broda – od środka ku zewnątrz, następnie ku dołowi</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Drenaż wykonuj zawsze na oczyszczonej skórze z olejem lub serum. Ciśnienie powinno być minimalnie wyczuwalne – limfa przepływa tuż pod skórą. Zbyt mocny masaż nie daje lepszych efektów, może natomiast podrażnić naczynia.
</blockquote>
`
        },
        {
          title: 'Masaż japoński Kobido – filozofia i technika',
          slug: 'masaz-kobido',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Historia Kobido</h2>
<p>Kobido (古美道) to japoska technika masażu twarzy sięgająca XV wieku. Dosłownie oznacza "stara droga piękna". Tradycyjnie był zarezerwowany dla japońskiej arystokracji. Łączy elementy akupresury, drenażu limfatycznego i masażu rozluźniającego mięśnie.</p>

<h2>Filozofia</h2>
<p>Kobido opiera się na przekonaniu, że piękno skóry wynika z jej wewnętrznej równowagi – odpowiedniego przepływu energii (ki), krwi i limfy. Masaż nie tylko poprawia wygląd, ale też równoważy napięcie emocjonalne, które "gromadzi się" w mięśniach twarzy.</p>

<h2>Kluczowe techniki Kobido</h2>
<ul>
  <li><strong>Effleurage</strong> – delikatne głaskanie aktywujące układ limfatyczny i naczyniowy</li>
  <li><strong>Petrissage</strong> – ugniatanie mięśni twarzy, szczególnie żwaczy i mięśnia czołowego</li>
  <li><strong>Tapotement</strong> – szybkie opukiwanie palcami, stymulujące produkcję kolagenu</li>
  <li><strong>Pincement</strong> – delikatne uszczypywanie skóry, poprawiające elastyczność</li>
  <li><strong>Wibratcje punktowe</strong> – drżące uciski na punkty akupresury</li>
</ul>

<h2>Efekty Kobido</h2>
<ul>
  <li>Optyczny lifting bez operacji – rozluźnienie napiętych mięśni żwaczy i czoła redukuje zmarszczki mimiczne</li>
  <li>Poprawa napięcia skóry – lepsza cyrkulacja = lepsze odżywienie fibroblastów</li>
  <li>Głęboki relaks – redukcja napięcia mięśniowego i stresu</li>
  <li>Redukcja bruksizmu (zgrzytania zębami) przy regularnych zabiegach</li>
</ul>

<h2>Wskazania i przeciwwskazania</h2>
<p><strong>Wskazania:</strong> zmarszczki mimiczne, obwisający owal, opuchlizna, stres, napięcie mięśniowe.</p>
<p><strong>Przeciwwskazania:</strong> aktywny trądzik, stany zapalne, metalowe implanty w twarzy, Botoks wykonany mniej niż 2 tygodnie temu, ciąża (masaż szyjki macicy – ostrożność).</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Kobido wymaga kilku–kilkunastu sesji, by efekty były trwałe. Pojedynczy zabieg daje efekt "wow" na 3–5 dni. Zalecaj klientkom serię 6–10 zabiegów co tydzień, a następnie comiesięczne utrzymanie.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Narzędzia do masażu',
      lessons: [
        {
          title: 'Roller kwarcowy i gua sha – prawidłowe użytkowanie',
          slug: 'roller-kwarc-gua-sha',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Roller kwarcowy</h2>
<p>Roller to narzędzie masażu z walcem z kamienia (najczęściej kryształ górski lub jadeit) na rączce. Ruch walcowy po skórze stymuluje mikrokrążenie i drenaż limfatyczny.</p>

<h2>Efekty rollera</h2>
<ul>
  <li>Redukcja opuchliźny (przy regularnym stosowaniu)</li>
  <li>Wchłanianie produktów pielęgnacyjnych – wmasowanie serum</li>
  <li>Chłodzący efekt przy zimnym rollerze (przechowywany w lodówce) – zmniejsza zaczerwienienia</li>
  <li>Delikatny relaks mięśni twarzy</li>
</ul>

<h2>Prawidłowa technika rollera</h2>
<ul>
  <li>Zawsze po nałożeniu serum lub olejku – roller nigdy na suchą skórę</li>
  <li>Kierunek: zawsze od środka twarzy ku zewnętrznym krawędziom, od dołu ku górze (drenaż)</li>
  <li>Ciśnienie lekkie – roller się toczy, nie przesuwa</li>
  <li>Czoło: od brwi ku linii włosów, od środka ku skroniom</li>
  <li>Policzki: od nosa ku uszom</li>
  <li>Szyja: zawsze od góry ku dołowi (odprowadzanie limfy)</li>
</ul>

<h2>Gua sha</h2>
<p>Gua sha (刮痧) to narzędzie z płaskiego kamienia (jadeit, bian stone, nefryt) używane do skrobaniowego masażu skóry. Pochodzi z tradycyjnej medycyny chińskiej, gdzie pierwotnie służyło do intensywnego opracowania ciała.</p>

<h2>Technika gua sha na twarz</h2>
<ul>
  <li>Trzymaj pod kątem 15–45° do skóry – im mniejszy kąt, tym mocniejszy drenaż</li>
  <li>Linia szczęki: od brody ku uchu, kilka powtórzeń</li>
  <li>Policzek: od ust ku skroni</li>
  <li>Czoło: od brwi ku linii włosów</li>
  <li>Każde przesunięcie powtórz 3–5 razy przed przejściem do kolejnego obszaru</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Gua sha może pozostawiać ślady (petechie) na skórze przy zbyt mocnym ucisku – szczególnie przy skórze wrażliwej. Zawsze zacznij od delikatnego ciśnienia. Petechie przy masażu twarzy (w odróżnieniu od gua sha ciała) nie powinny się pojawiać.
</blockquote>
`
        },
        {
          title: 'Bańka kosmetyczna – techniki i efekty',
          slug: 'banka-kosmetyczna',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Jak działa bańka kosmetyczna?</h2>
<p>Bańka kosmetyczna do twarzy to miniaturowa wersja baniek stosowanych w masażu ciała. Działa na zasadzie podciśnienia – po ściśnięciu i przyłożeniu do skóry wciąga ją do środka, tworząc efekt odwrotnego ucisku.</p>

<h2>Efekty bańki</h2>
<ul>
  <li><strong>Poprawa mikrokrążenia</strong> – mechaniczne pobudzenie naczyń krwionośnych i limfatycznych</li>
  <li><strong>Lifting tkanek miękkich</strong> – stymulacja fibroblastów i produkcji kolagenu</li>
  <li><strong>Redukcja napięcia mięśniowego</strong> – szczególnie mięśni żwaczy i skroniowych</li>
  <li><strong>Wchłanianie kosmetyków</strong> – podciśnienie ułatwia przenikanie składników aktywnych</li>
</ul>

<h2>Typy baniek kosmetycznych</h2>
<ul>
  <li><strong>Silikonowe</strong> – miękkie, bezpieczne, regulowane ciśnienie przez siłę ściśnięcia</li>
  <li><strong>Szklane z gruszką</strong> – mocniejsze podciśnienie, dla doświadczonych</li>
  <li><strong>Elektryczne (mikro-podciśnieniowe)</strong> – z regulowaną siłą ssania, najłatwiejsze w użyciu</li>
</ul>

<h2>Technika masażu bańką</h2>
<ul>
  <li>Nałóż obfitą warstwę olejku – bańka musi ślizgać się swobodnie</li>
  <li>Ściśnij bańkę przed przyłożeniem, przyłóż do skóry, zwolnij – skóra wejdzie do środka</li>
  <li>Poruszaj bańką po skórze ciągłymi ruchami, nigdy nie zatrzymuj w jednym miejscu (ślad po silnym podciśnieniu = siniak)</li>
  <li>Linia szczęki, policzki, czoło – te same kierunki co przy rollerze (od środka na zewnątrz)</li>
  <li>Unikaj okolic oczu i bezpośrednio pod oczami – skóra zbyt delikatna</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Bańka kosmetyczna jest przeciwwskazana przy rozszerzonych naczyniach (trądzik różowaty, couperose) – podciśnienie może je uszkodzić. Zawsze pytaj klientkę o stan naczyń przed zabiegiem.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Face yoga i quiz',
      lessons: [
        {
          title: 'Face yoga – 8 ćwiczeń na owal twarzy i napięcie mięśni',
          slug: 'face-yoga-cwiczenia',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym jest face yoga?</h2>
<p>Face yoga to zbiór ćwiczeń mięśni twarzy, który łączy elementy jogi, mimiki terapeutycznej i relaksacji. Twarz ma ponad 40 mięśni, które – podobnie jak mięśnie ciała – reagują na regularny trening: stają się silniejsze, bardziej elastyczne i lepiej ukrwione.</p>

<h2>Jak często ćwiczyć?</h2>
<p>Minimum 20 minut dziennie przez co najmniej 20 tygodni, by zaobserwować trwałe efekty. Badanie opublikowane w JAMA Dermatology (2018) wykazało statystycznie istotną poprawę napięcia policzków i wygładzenie owal twarzy po 20 tygodniach face yoga.</p>

<h2>8 ćwiczeń face yoga</h2>
<ul>
  <li><strong>1. "Żyrafa"</strong> – Odchyl głowę do tyłu, wypychając język ku niebu. Trzymaj 10 sekund. Wzmacnia mięśnie szyi i podbródka. 5 powtórzeń.</li>
  <li><strong>2. "Lew"</strong> – Szeroko otwórz usta i oczy, wysuń język maksymalnie. Trzymaj 10 sekund. Rozluźnia napięcie mięśni twarzy. 5 powtórzeń.</li>
  <li><strong>3. "V na oczach"</strong> – Przyłóż palce wskazujące do zewnętrznych kącików oczu, środkowe do wewnętrznych. Mocno zmrużaj oczy, jakbyś chciała zobaczyć coś z daleka. 10 powtórzeń. Wzmacnia mięsień okrężny oka.</li>
  <li><strong>4. "Wzdymanie policzków"</strong> – Napełnij usta powietrzem, przesuń je do prawego, lewego policzka, następnie pod górną i dolną wargę. Trwa 30 sekund. Wzmacnia mięśnie policzków.</li>
  <li><strong>5. "Szczęka do przodu"</strong> – Wysuń żuchwę do przodu, unieś dolną wargę. Poczujesz napięcie pod brodą. Trzymaj 15 sekund. 5 powtórzeń. Wzmacnia mięsień bródkowy.</li>
  <li><strong>6. "Masaż czoła"</strong> – Połóż obie dłonie na czole, palce skierowane ku środkowi. Delikatnie trzyj skórę ku linii włosów, jednocześnie lekko unosząc brwi. Zmniejsza zmarszczki poziome. 30 sekund.</li>
  <li><strong>7. "Rybia mina"</strong> – Wciągnij policzki do środka ust, uformuj "rybi pysk". Próbuj się uśmiechać. 10 powtórzeń. Wzmacnia mięśnie policzkowe.</li>
  <li><strong>8. "Relaks żwaczy"</strong> – Połóż dwa palce na żwaczu (między łukiem policzkowym a kątem żuchwy). Otwieraj i zamykaj usta powoli, jednocześnie naciskając na mięsień. 10 cykli. Rozluźnia mięśnie szczęki i zmniejsza bruksizm.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Face yoga działa najlepiej w połączeniu z masażem narzędziowym (roller, gua sha) i dobrą pielęgnacją. Sama w sobie nie zastąpi filtrów SPF ani składników aktywnych – jest uzupełnieniem, nie alternatywą.
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Masaże i lifting',
          slug: 'quiz-masaze-lifting',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Masaże Twarzy i Techniki Liftingujące',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'W jakim kierunku powinny przebiegać ruchy drenażu limfatycznego twarzy?',
                explanation: 'Drenaż limfatyczny zawsze prowadzi limfę od twarzy w kierunku węzłów szyjnych i nadobojczykowych – od góry ku dołowi szyi.',
                options: [
                  { text: 'Od twarzy ku węzłom szyjnym i nadobojczykowym (w dół)', isCorrect: true },
                  { text: 'Od szyi ku górze twarzy', isCorrect: false },
                  { text: 'Okrężnie wokół środka twarzy', isCorrect: false },
                  { text: 'Kierunek nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Co oznacza nazwa "Kobido"?',
                explanation: 'Kobido (古美道) to japońskie słowo oznaczające "stara droga piękna".',
                options: [
                  { text: '"Stara droga piękna"', isCorrect: true },
                  { text: '"Szybki masaż twarzy"', isCorrect: false },
                  { text: '"Japoński lifting naturalny"', isCorrect: false },
                  { text: '"Technika akupresury"', isCorrect: false }
                ]
              },
              {
                text: 'Pod jakim kątem do skóry trzyma się narzędzie gua sha?',
                explanation: 'Gua sha trzyma się pod kątem 15–45° do skóry. Im mniejszy kąt, tym mocniejszy efekt drenaż.',
                options: [
                  { text: '15–45°', isCorrect: true },
                  { text: '90°', isCorrect: false },
                  { text: '0° (równolegle)', isCorrect: false },
                  { text: '60–80°', isCorrect: false }
                ]
              },
              {
                text: 'Który typ skóry jest przeciwwskazaniem do masażu bańką kosmetyczną?',
                explanation: 'Przy rozszerzonych naczyniach (couperose, trądzik różowaty) podciśnienie bańki może uszkodzić kruche naczynia.',
                options: [
                  { text: 'Skóra z rozszerzonymi naczyniami (couperose)', isCorrect: true },
                  { text: 'Skóra sucha', isCorrect: false },
                  { text: 'Skóra normalna', isCorrect: false },
                  { text: 'Skóra odwodniona', isCorrect: false }
                ]
              },
              {
                text: 'Jak długo i jak często należy ćwiczyć face yoga, by zaobserwować trwałe efekty?',
                explanation: 'Badanie JAMA Dermatology (2018) wykazało efekty po 20 tygodniach ćwiczeń przez minimum 20 minut dziennie.',
                options: [
                  { text: '20 minut dziennie przez co najmniej 20 tygodni', isCorrect: true },
                  { text: '5 minut raz w tygodniu przez miesiąc', isCorrect: false },
                  { text: 'Jeden 60-minutowy trening tygodniowo', isCorrect: false },
                  { text: '2 minuty dziennie przez rok', isCorrect: false }
                ]
              },
              {
                text: 'Co się dzieje, gdy bańka kosmetyczna jest zbyt długo zatrzymana w jednym miejscu?',
                explanation: 'Zbyt długie zatrzymanie bańki w jednym miejscu powoduje siniaka z powodu zbyt silnego podciśnienia.',
                options: [
                  { text: 'Powstaje siniak', isCorrect: true },
                  { text: 'Lepsza penetracja kosmetyku', isCorrect: false },
                  { text: 'Efekt liftingu jest silniejszy', isCorrect: false },
                  { text: 'Nic się nie dzieje', isCorrect: false }
                ]
              },
              {
                text: 'Ile mięśni ma ludzka twarz (w przybliżeniu)?',
                explanation: 'Twarz człowieka posiada ponad 40 mięśni odpowiadających za mimikę i ruchy żuchwą.',
                options: [
                  { text: 'Ponad 40', isCorrect: true },
                  { text: 'Około 10', isCorrect: false },
                  { text: 'Ponad 100', isCorrect: false },
                  { text: '5–7', isCorrect: false }
                ]
              },
              {
                text: 'Jak powinien być przechowywany roller kwarcowy dla efektu chłodzącego?',
                explanation: 'Roller przechowywany w lodówce daje efekt chłodzący, który zmniejsza zaczerwienienia i opuchliznę.',
                options: [
                  { text: 'W lodówce', isCorrect: true },
                  { text: 'W ciepłej szufladzie', isCorrect: false },
                  { text: 'W bezpośrednim świetle słonecznym', isCorrect: false },
                  { text: 'Temperatura przechowywania nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Ćwiczenie face yoga "Żyrafa" wzmacnia głównie które partie?',
                explanation: 'Ćwiczenie "Żyrafa" (odchylenie głowy do tyłu z wypchnięciem języka) wzmacnia mięśnie szyi i podbródka.',
                options: [
                  { text: 'Mięśnie szyi i podbródka', isCorrect: true },
                  { text: 'Mięsień okrężny oka', isCorrect: false },
                  { text: 'Mięśnie czoła', isCorrect: false },
                  { text: 'Mięśnie policzków', isCorrect: false }
                ]
              },
              {
                text: 'Kiedy Kobido jest przeciwwskazane?',
                explanation: 'Botoks wymaga co najmniej 2 tygodni stabilizacji. Masaż wykonany wcześniej może przemieścić toksyn botuliny.',
                options: [
                  { text: 'Gdy Botoks był wykonany mniej niż 2 tygodnie temu', isCorrect: true },
                  { text: 'Przy skórze suchej', isCorrect: false },
                  { text: 'Przy zmarszczkach mimicznych', isCorrect: false },
                  { text: 'Przy wszystkich typach cery', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 6: Anti-Aging – Nauka Opóźniania Starzenia ───────────────────────

const course6: CourseData = {
  title: 'Anti-Aging – Nauka Opóźniania Starzenia',
  slug: 'anti-aging-nauka-opozniania-starzenia',
  description: 'Poznaj mechanizmy biologicznego i fotoindukowanego starzenia skóry. Naucz się bezpiecznie stosować retinol, kwasy AHA/BHA, witaminę C i peptydy w oparciu o dowody naukowe.',
  difficulty: 'ADVANCED',
  estimatedMinutes: 150,
  tags: ['anti-aging', 'retinol', 'peeling'],
  modules: [
    {
      title: 'Biologia starzenia',
      lessons: [
        {
          title: 'Dlaczego skóra się starzeje – kolagen, elastyna, fibroblasty',
          slug: 'dlaczego-skora-sie-starzeje',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Dwa mechanizmy starzenia skóry</h2>
<p>Starzenie skóry wynika z dwóch nakładających się procesów:</p>
<ul>
  <li><strong>Starzenie wewnętrzne (chronologiczne)</strong> – nieunikniony proces biologiczny. Zależy od genetyki i czasu. Obejmuje spowolnienie metabolizmu komórek, skrócenie telomerów, akumulację uszkodzeń DNA.</li>
  <li><strong>Starzenie zewnętrzne (fotostarzenie)</strong> – spowodowane czynnikami środowiskowymi: promieniowaniem UV (80% zmian), zanieczyszczeniem, dymem tytoniowym, dietą. W dużej mierze <strong>modyfikowalne</strong>.</li>
</ul>

<h2>Kolagen – rusztowanie skóry</h2>
<p>Kolagen to najobfitsze białko skóry właściwej (~70% suchej masy). Tworzy sieć włókien zapewniających wytrzymałość mechaniczną i elastyczność. W skórze dominują typy I i III.</p>
<p>Co się dzieje z wiekiem:</p>
<ul>
  <li>Po 25. roku życia produkcja kolagenu spada o ~1% rocznie</li>
  <li>Fibroblasty (komórki produkujące kolagen) stają się mniej aktywne</li>
  <li>Metaloproteazy macierzy (MMP) degradują istniejący kolagen szybciej</li>
  <li>Włókna kolagenowe krzyżują się (crosslinking), tracąc elastyczność</li>
</ul>

<h2>Elastyna – sprężystość</h2>
<p>Elastyna tworzy sieć włókien sprężystych, które pozwalają skórze wracać do kształtu po odkształceniu. Problem: elastyna praktycznie <strong>nie jest produkowana po dojrzewaniu</strong>. Masz tyle elastyny, ile wyprodukowałaś do ok. 25. roku życia. Z wiekiem istniejące włókna degradują.</p>

<h2>Fibroblasty – fabryki skóry</h2>
<p>Fibroblasty produkują kolagen, elastynę i kwas hialuronowy. Z wiekiem:</p>
<ul>
  <li>Zmniejsza się ich liczba i aktywność</li>
  <li>Wolniej reagują na sygnały wzrostu</li>
  <li>Są bardziej wrażliwe na uszkodzenia UV</li>
</ul>
<p>Wiele składników anti-aging (retinol, peptydy, witamina C) działa właśnie poprzez <strong>stymulację fibroblastów</strong> do wzmożonej produkcji kolagenu.</p>

<h2>Kwas hialuronowy w skórze</h2>
<p>Skóra zawiera około połowy całego kwasu hialuronowego w ciele (~7–8 g). Z wiekiem jego stężenie spada dramatycznie – 40-latek ma o 50% mniej niż 20-latek. Efekt: skóra traci objętość, staje się sucha i zmarszczona.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Najważniejszy, najlepiej udokumentowany i najtańszy sposób na spowolnienie fotostarzenia to codzienny filtr SPF 50 od 20. roku życia. Żaden retinol ani peptyd nie zrównoważy lat bez ochrony UV.
</blockquote>
`
        },
        {
          title: 'Wolne rodniki i stres oksydacyjny – jak chronić skórę',
          slug: 'wolne-rodniki-stres-oksydacyjny',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym są wolne rodniki?</h2>
<p>Wolne rodniki to cząsteczki lub atomy z niesparowanym elektronem – są wysoce reaktywne i "kradną" elektrony od sąsiednich cząsteczek, wywołując reakcję łańcuchową uszkodzeń. W skórze atakują lipidy błon komórkowych, białka (kolagen, elastynę) i DNA fibroblastów.</p>

<h2>Źródła wolnych rodników w skórze</h2>
<ul>
  <li><strong>Promieniowanie UVA</strong> – generuje wolne rodniki (reaktywne formy tlenu, ROS) bezpośrednio w skórze właściwej</li>
  <li><strong>Zanieczyszczenie powietrza (smog)</strong> – ozon, cząsteczki PM2.5 aktywują MMP i ROS</li>
  <li><strong>Palenie tytoniu</strong> – każdy wdech papierosa wprowadza miliardy wolnych rodników</li>
  <li><strong>Stres psychologiczny</strong> – kortyzol aktywuje produkcję ROS w komórkach skóry</li>
  <li><strong>Dieta uboga w antyoksydanty</strong> – niedobór wit. C, E, A, cynku, selenu</li>
</ul>

<h2>Antyoksydanty – ochrona skóry</h2>
<p>Antyoksydanty neutralizują wolne rodniki, oddając im elektron bez stawania się sami niestabilnymi. W kosmetyce stosuje się:</p>
<ul>
  <li><strong>Witamina C (kwas askorbinowy)</strong> – najlepiej przebadany antyoksydant. Stężenie 10–20% L-askorbinowego kwasu redukuje uszkodzenia UV i stymuluje syntezę kolagenu.</li>
  <li><strong>Witamina E (tokoferol)</strong> – lipofilowy antyoksydant chroniący błony komórkowe. Witaminy C i E działają synergistycznie.</li>
  <li><strong>Resweratrol</strong> – polifenol z winogron. Aktywuje sirtuiny – białka longewiczności.</li>
  <li><strong>Niacynamid</strong> – wzmacnia barierę skórną zmniejszając penetrację wolnych rodników ze środowiska.</li>
  <li><strong>Koenzym Q10 (ubichinon)</strong> – mitochondrialny antyoksydant, spada z wiekiem.</li>
</ul>

<h2>Jak stosować antyoksydanty w pielęgnacji</h2>
<p>Antyoksydanty działają ochronnie, więc stosuje się je <strong>rano</strong>, przed ekspozycją na czynniki środowiskowe. Wieczorem skóra jest w trybie naprawy – wtedy lepiej działają retinol i peptydy.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Witamina C jest niestabilna – utlenia się pod wpływem powietrza i światła. Szukaj formuł z L-askorbinowym kwasem w ciemnych, szczelnych opakowaniach lub stabilniejszych pochodnych jak 3-O-etyl-L-askorbinian czy askorbyl glukozyd.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Składniki aktywne anti-aging',
      lessons: [
        {
          title: 'Retinol i retinoidy – jak bezpiecznie zacząć',
          slug: 'retinol-retinoidy-bezpiecznie',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Retinoidy – złoty standard anti-aging</h2>
<p>Retinoidy to pochodne witaminy A. Są jedynymi składnikami kosmetycznymi, dla których istnieje bogata baza badań klinicznych potwierdzająca redukcję zmarszczek, przebarwień i poprawę tekstury skóry.</p>

<h2>Hierarchia retinoidów (od najsłabszych do najsilniejszych)</h2>
<ul>
  <li><strong>Retinyl palmitat</strong> – ester retinolu. Wymaga konwersji 3-etapowej. Najdelikatniejszy, nadaje się dla skóry bardzo wrażliwej.</li>
  <li><strong>Retinol</strong> – wolny retinol. Wymaga konwersji 2-etapowej. Dostępny bez recepty. Zlatem standardem OTC.</li>
  <li><strong>Retinaldehyd (retinal)</strong> – jeden krok do aktywnej formy. 10× silniejszy niż retinol, ale wciąż OTC.</li>
  <li><strong>Kwas retinowy (tretynoina)</strong> – aktywna forma, bezpośrednio wiąże receptor RAR. Tylko na receptę. Najsilniejszy efekt, ale też najsilniejsze działania niepożądane.</li>
</ul>

<h2>Jak działa retinol?</h2>
<ul>
  <li>Stymuluje fibroblasty do produkcji nowego kolagenu i elastyny</li>
  <li>Przyspiesza obrót komórkowy naskórka (cell turnover) – złuszcza martwą warstwę</li>
  <li>Hamuje metaloproteazy MMP degradujące kolagen</li>
  <li>Reguluje produkcję melaniny – rozjaśnia przebarwienia</li>
  <li>Zmniejsza pory przez normalizację keratynizacji</li>
</ul>

<h2>Jak bezpiecznie zacząć – protokół wprowadzania</h2>
<ul>
  <li><strong>Tydzień 1–2:</strong> Raz w tygodniu, stężenie 0,025%. Nałóż na suchą skórę 20–30 min po myciu.</li>
  <li><strong>Tydzień 3–4:</strong> Dwa razy w tygodniu, jeśli nie ma podrażnień.</li>
  <li><strong>Miesiąc 2:</strong> Co drugi dzień, ewentualnie zwiększenie do 0,05%.</li>
  <li><strong>Miesiąc 3+:</strong> Codziennie (wieczorem), ewentualnie 0,1%.</li>
</ul>
<p><strong>"Sandwich" method:</strong> Krem nawilżający → retinol → krem nawilżający. Buforowanie zmniejsza podrażnienie.</p>

<h2>Retinol i słońce</h2>
<p>Retinol stosuj <strong>wyłącznie wieczorem</strong>. Degraduje się pod wpływem UV. Skóra po retinoinie jest też bardziej fotowrażliwa – obowiązkowo SPF 50 rano przez cały czas stosowania retinoidów.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> "Purge" przy retinolu (nasilenie wyprysków w ciągu 2–4 tygodni) jest normalny – to przyspieszony obrót komórkowy. Odróżnij go od podrażnienia (pieczenie, złuszczanie, rumień) – przy podrażnieniu zmniejsz częstotliwość, przy purge'u kontynuuj.
</blockquote>
`
        },
        {
          title: 'Kwasy AHA i BHA – peeling chemiczny w domu',
          slug: 'kwasy-aha-bha-peeling',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Czym są kwasy AHA?</h2>
<p>AHA (alpha-hydroxy acids) to kwasy organiczne działające na powierzchni naskórka. Są hydrofilowe – działają na zewnętrznych warstwach rogowych, rozluźniając spoiwa między korneocytami i umożliwiając ich złuszczenie.</p>

<h2>Główne kwasy AHA</h2>
<ul>
  <li><strong>Kwas glikolowy</strong> – najmniejsza cząsteczka AHA, najgłębiej wnika. Stężenia 5–15% w kosmetykach domowych, 20–70% w gabinetach. Stymuluje fibroblasty i produkcję kolagenu.</li>
  <li><strong>Kwas mlekowy</strong> – delikatniejszy od glikolowego. Dodatkowo humektant – nawilża naskórek. Polecany dla skóry suchej i wrażliwej.</li>
  <li><strong>Kwas migdałowy</strong> – duże cząsteczki, wolniejsza penetracja. Szczególnie dobry dla cer naczyniowych i skłonnych do zaczerwienień. Działanie antybakteryjne.</li>
  <li><strong>Kwas jabłkowy i winowy</strong> – rzadziej stosowane samodzielnie, często w mieszankach.</li>
</ul>

<h2>BHA – kwas salicylowy</h2>
<p>Jedyny BHA stosowany w kosmetyce. Lipofilowy – wnika w pory. Idealne uzupełnienie AHA dla cery mieszanej i tłustej.</p>

<h2>Efekty regularnego stosowania kwasów</h2>
<ul>
  <li>Wygładzenie tekstury skóry (usunięcie martwego naskórka)</li>
  <li>Rozjaśnienie przebarwień (PIH, plamy słoneczne)</li>
  <li>Zmniejszenie widoczności porów</li>
  <li>Stymulacja kolagenu (kwas glikolowy w wyższych stężeniach)</li>
  <li>Poprawa wchłanialności pozostałych kosmetyków</li>
</ul>

<h2>Jak stosować bezpiecznie</h2>
<ul>
  <li>Zacznij od niskiego stężenia (5–8% AHA) 2 razy w tygodniu</li>
  <li>Nie łącz w jednym kroku z retinolem ani witaminą C – nadmierne złuszczanie</li>
  <li>Zawsze SPF następnego dnia – skóra po kwasach jest bardziej wrażliwa na UV</li>
  <li>Unikaj przy aktywnym trądziku z licznymi stanami zapalnymi – kwasy mogą nasilić stan zapalny</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> pH produktu z kwasami ma ogromne znaczenie. AHA działa efektywnie przy pH 3–4. Produkty o neutralnym pH zawierają kwasy w formie soli – mają łagodny zapach, ale prawie zerową aktywność kwasową. Sprawdzaj pH lub wybieraj marki, które go podają.
</blockquote>
`
        },
        {
          title: 'Witamina C i peptydy – antyoksydacja i odbudowa',
          slug: 'witamina-c-peptydy',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Witamina C – wszechstronny składnik anti-aging</h2>
<p>L-askorbinowy kwas (LAA) to jedno z najlepiej przebadanych aktywnych w kosmetyce. Działa na trzech poziomach:</p>
<ul>
  <li><strong>Antyoksydacja</strong> – neutralizuje wolne rodniki generowane przez UV i smog</li>
  <li><strong>Synteza kolagenu</strong> – jest kofaktorem hydroksylaz prolylowej i lizylowej – enzymów niezbędnych do tworzenia włókien kolagenowych</li>
  <li><strong>Depigmentacja</strong> – hamuje tyrozynazę i interflikuje z transferem melanosomów</li>
</ul>

<h2>Stężenia i formy</h2>
<ul>
  <li><strong>5–10%</strong> – optymalne dla skóry wrażliwej i na start</li>
  <li><strong>15–20%</strong> – maksymalna skuteczność kliniczna. Wyższe stężenia nie dają lepszych efektów, a znacznie zwiększają ryzyko podrażnienia</li>
  <li><strong>Stabilne pochodne</strong> (askorbyl glukozyd, 3-O-etyl askorbinian) – mniej skuteczne niż LAA, ale dużo trwalsze i lepiej tolerowane</li>
</ul>

<h2>Peptydy – sygnały dla fibroblastów</h2>
<p>Peptydy to krótkie łańcuchy aminokwasów (2–50 AA). W kosmetyce pełnią rolę "sygnałów" informujących komórki skóry o potrzebie produkcji kolagenu lub innych białek strukturalnych.</p>

<h2>Główne typy peptydów w kosmetyce</h2>
<ul>
  <li><strong>Peptydy sygnałowe</strong> – naśladują fragmenty kolagenu, sygnalizując fibroblastom jego niedobór. Palmitoyl pentapeptide-4 (Matrixyl) – najlepiej przebadany; podwaja ilość kolagenu IV w badaniach in vitro.</li>
  <li><strong>Peptydy neurotransmiterowe</strong> – hamują wydzielanie acetylocholiny w synapsie nerwowo-mięśniowej, redukując skurcz mięśni (botoks-like). Argireline (acetylo hexapeptide-3).</li>
  <li><strong>Peptydy transportujące</strong> – transportują miedź (GHK-Cu) lub mangan do skóry, gdzie są niezbędne do syntezy kolagenu.</li>
</ul>

<h2>Synergiczne połączenie</h2>
<p>Witamina C (rano, antyoksydacja + kolagen) + peptydy (wieczorem, sygnalizacja fibroblastom) + retinol (wieczorem, wzrost aktywności fibroblastów) = kompleksowa strategia anti-aging.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Peptydy są wrażliwe na pH. Stosuj je w pH 5,5–7. Nie łącz peptydów z wit. C w formie LAA (pH 2,5–3) w tej samej warstwie – niskie pH denaturuje peptydy. Wit. C rano, peptydy wieczorem.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Zabiegi profesjonalne i quiz',
      lessons: [
        {
          title: 'Microneedling i mezoterapia igłowa – wskazania i efekty',
          slug: 'microneedling-mezoterapia',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Microneedling – kontrolowane mikrourazy</h2>
<p>Microneedling (nakłuwanie mikroigłowe, collagen induction therapy) polega na tworzeniu kontrolowanych mikrourazów w skórze za pomocą rolera lub pena z mikroigłami o długości 0,25–2,5 mm. Urazy te aktywują naturalną kaskadę gojenia:</p>
<ul>
  <li>Faza zapalenia (0–48h) – napływ neutrofili i makrofagów, uwolnienie czynników wzrostu (TGF-β, PDGF)</li>
  <li>Faza proliferacji (48h–3 tygodnie) – neokolagenogeneza, fibroblasty produkują nowe włókna kolagenowe</li>
  <li>Faza remodelowania (3 miesiące–rok) – organizacja kolagenu w prawidłową architekturę</li>
</ul>

<h2>Wskazania do microneedlingu</h2>
<ul>
  <li>Blizny potrądzikowe (szczególnie atroficzne)</li>
  <li>Zmarszczki i utrata napięcia skóry</li>
  <li>Rozstępy</li>
  <li>Powiększone pory</li>
  <li>Przebarwienia</li>
  <li>Łysienie plackowate (połączenie z PRP)</li>
</ul>

<h2>Mezoterapia igłowa</h2>
<p>Mezoterapia igłowa polega na śródskórnym wprowadzaniu cocktaili substancji aktywnych (kwas hialuronowy, witaminy, aminokwasy, PDRN, peptydy) przy pomocy iniekcji lub penów igłowych.</p>
<p>Różnica od microneedlingu: mezoterapia <strong>dostarcza składniki aktywne</strong> bezpośrednio do skóry właściwej, microneedling głównie <strong>stymuluje regenerację</strong> poprzez urazy.</p>

<h2>Efekty i czas trwania</h2>
<ul>
  <li>Pierwsze efekty po 2–4 tygodniach od zabiegu</li>
  <li>Optymalne rezultaty po serii 3–6 zabiegów co 4–6 tygodni</li>
  <li>Utrzymanie efektów: 1 zabieg co 3–6 miesięcy</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Microneedling z długością igieł powyżej 0,5 mm to zabieg medyczny – wymaga sterylnych warunków i wykonania przez uprawnioną osobę. Domowe rolery (0,25 mm) stymulują wchłanialność kosmetyków, ale nie dają efektów terapeutycznych dostępnych w gabinecie.
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Anti-aging',
          slug: 'quiz-anti-aging',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Anti-Aging',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'O ile procent rocznie spada produkcja kolagenu po 25. roku życia?',
                explanation: 'Po 25. roku życia produkcja kolagenu spada o około 1% rocznie, co prowadzi do stopniowej utraty napięcia skóry.',
                options: [
                  { text: '~1% rocznie', isCorrect: true },
                  { text: '~10% rocznie', isCorrect: false },
                  { text: '~0,01% rocznie', isCorrect: false },
                  { text: '~50% rocznie', isCorrect: false }
                ]
              },
              {
                text: 'Który retinoid jest najsilniejszy i dostępny wyłącznie na receptę?',
                explanation: 'Kwas retinowy (tretynoina) to aktywna forma witaminy A, bezpośrednio wiążąca receptor RAR. Jest najsilniejszym retinoidem i dostępna tylko na receptę.',
                options: [
                  { text: 'Kwas retinowy (tretynoina)', isCorrect: true },
                  { text: 'Retinol', isCorrect: false },
                  { text: 'Retinaldehyd', isCorrect: false },
                  { text: 'Retinyl palmitat', isCorrect: false }
                ]
              },
              {
                text: 'O której porze dnia powinno się stosować serum z witaminą C?',
                explanation: 'Witamina C działa jako antyoksydant chroniący przed wolnymi rodnikami z UV i smogu – dlatego stosuje się ją rano.',
                options: [
                  { text: 'Rano', isCorrect: true },
                  { text: 'Wieczorem', isCorrect: false },
                  { text: 'W południe', isCorrect: false },
                  { text: 'Pora nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Przy jakim pH działają najskuteczniej kwasy AHA?',
                explanation: 'Kwasy AHA działają efektywnie przy pH 3–4. Produkty o neutralnym pH nie mają aktywności kwasowej.',
                options: [
                  { text: '3–4', isCorrect: true },
                  { text: '7–8', isCorrect: false },
                  { text: '1–2', isCorrect: false },
                  { text: '5,5–6', isCorrect: false }
                ]
              },
              {
                text: 'Który kwas AHA ma najdelikatniejsze działanie i działa też jako humektant?',
                explanation: 'Kwas mlekowy jest delikatniejszy od glikolowego i ma dodatkowe właściwości humektantowe – nawilża naskórek.',
                options: [
                  { text: 'Kwas mlekowy', isCorrect: true },
                  { text: 'Kwas glikolowy', isCorrect: false },
                  { text: 'Kwas salicylowy (BHA)', isCorrect: false },
                  { text: 'Kwas azelainowy', isCorrect: false }
                ]
              },
              {
                text: 'Jaki mechanizm powoduje widoczne zmarszczki przy microneedlingu?',
                explanation: 'Microneedling działa poprzez tworzenie kontrolowanych mikrourazów, które aktywują kaskadę gojenia i neokolagenogenezę.',
                options: [
                  { text: 'Mikrourazy aktywujące kaskadę gojenia i produkcję kolagenu', isCorrect: true },
                  { text: 'Blokowanie receptorów bólowych', isCorrect: false },
                  { text: 'Dostarczanie składników aktywnych przez skórę', isCorrect: false },
                  { text: 'Termiczne uszkodzenie melanocytów', isCorrect: false }
                ]
              },
              {
                text: 'Jakie stężenie witaminy C (LAA) daje maksymalną skuteczność kliniczną?',
                explanation: 'Stężenie 15–20% L-askorbinowego kwasu daje maksymalną skuteczność. Wyższe stężenia nie poprawiają efektów, a zwiększają ryzyko podrażnienia.',
                options: [
                  { text: '15–20%', isCorrect: true },
                  { text: '1–2%', isCorrect: false },
                  { text: '50%+', isCorrect: false },
                  { text: '0,1%', isCorrect: false }
                ]
              },
              {
                text: 'Co różni mezoterapię igłową od microneedlingu?',
                explanation: 'Mezoterapia dostarcza składniki aktywne do skóry właściwej, microneedling głównie stymuluje regenerację przez mikrourazy.',
                options: [
                  { text: 'Mezoterapia dostarcza substancje aktywne, microneedling stymuluje regenerację', isCorrect: true },
                  { text: 'Mezoterapia używa dłuższych igieł', isCorrect: false },
                  { text: 'Microneedling jest zabiegiem wyłącznie domowym', isCorrect: false },
                  { text: 'Nie ma żadnej różnicy', isCorrect: false }
                ]
              },
              {
                text: 'Dlaczego peptydy nie powinny być stosowane jednocześnie z witaminą C (LAA) w tej samej warstwie?',
                explanation: 'Witamina C (LAA) działa przy pH 2,5–3, a peptydy są wrażliwe na niskie pH – denaturują się w kwaśnym środowisku.',
                options: [
                  { text: 'Niskie pH witaminy C denaturuje peptydy', isCorrect: true },
                  { text: 'Peptydy dezaktywują witaminę C', isCorrect: false },
                  { text: 'Razem powodują uczulenie', isCorrect: false },
                  { text: 'Nie ma żadnego problemu z łączeniem', isCorrect: false }
                ]
              },
              {
                text: 'Która z tych substancji jest kofaktorem niezbędnym do syntezy kolagenu?',
                explanation: 'Witamina C jest kofaktorem hydroksylaz prolylowej i lizylowej – enzymów kluczowych do tworzenia stabilnych włókien kolagenowych.',
                options: [
                  { text: 'Witamina C', isCorrect: true },
                  { text: 'Biotyna', isCorrect: false },
                  { text: 'Niacynamid', isCorrect: false },
                  { text: 'Kwas hialuronowy', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 7: Podstawy Pielęgnacji Stóp ─────────────────────────────────────

const course7: CourseData = {
  title: 'Podstawy Pielęgnacji Stóp',
  slug: 'podstawy-pielegnacji-stop',
  description: 'Poznaj anatomię stopy, najczęstsze schorzenia skórne i naucz się skutecznej domowej pielęgnacji – moczenia, złuszczania, nawilżania i prawidłowego obcinania paznokci.',
  difficulty: 'BEGINNER',
  estimatedMinutes: 90,
  tags: ['stopy', 'modzele', 'nawilżanie'],
  modules: [
    {
      title: 'Anatomia i problemy',
      lessons: [
        {
          title: 'Budowa stopy i najczęstsze schorzenia skórne',
          slug: 'budowa-stopy-schorzenia',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Anatomia skóry stóp</h2>
<p>Skóra podeszwy stóp to najgrubszy naskórek w ludzkim ciele – warstwa rogowa może sięgać 4–5 mm, podczas gdy na twarzy ma zaledwie 0,05 mm. Ta grubość jest adaptacją ewolucyjną chroniącą przed urazami mechanicznymi.</p>
<p>Kluczowe cechy skóry stóp:</p>
<ul>
  <li><strong>Brak gruczołów łojowych</strong> – stopy nie produkują sebum, dlatego są tak podatne na suchość i pękanie</li>
  <li><strong>Bogata w gruczoły potowe</strong> – szczególnie podeszwy. Stopa ma ok. 200–250 gruczołów potowych na cm²</li>
  <li><strong>Specjalistyczne poduszki tłuszczowe</strong> – pod piętą i przodostopiem amortyzują obciążenia</li>
</ul>

<h2>Najczęstsze schorzenia skórne stóp</h2>
<ul>
  <li><strong>Hiperkeratoza (zrogowacenie)</strong> – nadmierna akumulacja martwych komórek naskórka w odpowiedzi na tarcie i ucisk. Fizjologiczny mechanizm ochronny, ale przy nadmiarze – dyskomfort.</li>
  <li><strong>Modzele (callus)</strong> – rozproszone zgrubienia naskórka, najczęściej pod śródstopiem i piętą. Zwykle bezbolesne.</li>
  <li><strong>Odciski (clavus/corn)</strong> – ogniskowe, stożkowate zgrubienia z centralnym jądrem wnikającym w głąb. Bardzo bolesne przy ucisku.</li>
  <li><strong>Pękające pięty (fissures)</strong> – szczeliny w zrogowaciałej warstwie rogowej. Przy głębokości >3 mm mogą krwawić i być bramą dla infekcji.</li>
  <li><strong>Grzybica stóp (tinea pedis)</strong> – infekcja dermatofitami. Swędzenie, łuszczenie między palcami, nieprzyjemny zapach.</li>
</ul>

<h2>Kiedy do podologa?</h2>
<ul>
  <li>Ból w okolicach odcisku lub modzela</li>
  <li>Krwawiące lub bardzo głębokie pęknięcia</li>
  <li>Podejrzenie grzybicy – charakterystyczne łuszczenie i zapach</li>
  <li>Cukrzyca i jakakolwiek zmiana na stopie – ZAWSZE konsultacja lekarska</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Cukrzycowe stopy wymagają specjalnego podejścia. Neuropatia cukrzycowa zmniejsza czucie bólu – pacjenci mogą nie odczuwać urazów. Nigdy nie wykonuj agresywnych zabiegów pedicure u diabetyków bez konsultacji z lekarzem.
</blockquote>
`
        },
        {
          title: 'Modzele i odciski – skąd się biorą i jak im zapobiegać',
          slug: 'modzele-odciski-zapobieganie',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Mechanizm powstawania modzelów i odcisków</h2>
<p>Zarówno modzele, jak i odciski są reakcją obronną naskórka na chroniczne tarcie lub ucisk. Komórki warstwy podstawnej naskórka przyspieszają podziały i produkują więcej keratyny, grubiejąc warstwę rogową w miejscu narażonym.</p>
<p>Kluczowa różnica:</p>
<ul>
  <li><strong>Modzel (callus)</strong> – rozległy obszar zgrubienia, brak centralnego jądra, zazwyczaj bezbolesny</li>
  <li><strong>Odcisk (corn)</strong> – ogniskowy, stożkowate jądro keratynowe wnikające w głąb skóry właściwej, uciskające nerwy – stąd silny ból</li>
</ul>

<h2>Przyczyny modzelów i odcisków</h2>
<ul>
  <li><strong>Nieodpowiednie obuwie</strong> – za ciasne (ucisk palców), za luźne (tarcie), z twardą podeszwą, wysokie obcasy (przenoszące ciężar na przodostopie)</li>
  <li><strong>Nieprawidłowa biomechanika chodu</strong> – płaskostopie, koślawość, haluksy – zmieniają rozkład nacisku na stopę</li>
  <li><strong>Chodzenie boso na twardych powierzchniach</strong> – podeszwa kompensuje brak amortyzacji</li>
  <li><strong>Niedostateczna wilgotność skóry</strong> – sucha, mało elastyczna skóra łatwiej tworzy zrogowacenia</li>
</ul>

<h2>Profilaktyka – codzienne działania</h2>
<ul>
  <li>Dobrze dopasowane obuwie – szerokie noski, miękka wkładka, obcas max. 3 cm na co dzień</li>
  <li>Codzienne nawilżanie kremem z mocznikiem 10–20%</li>
  <li>Cotygodniowy peeling lub moczenie + pilnik</li>
  <li>Wkładki ortopedyczne przy nieprawidłowym sklepieniu stopy</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Samodzielne wycinanie odcisków skalpelkiem jest niebezpieczne – ryzyko infekcji i uszkodzenia zdrowej tkanki. Twarde, głęboko wnikające odciski powinna leczyć podolog lub dermatolog. Domowe plastry z kwasem salicylowym są bezpieczne przy zdrowych stopach i braku cukrzycy.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Domowa pielęgnacja',
      lessons: [
        {
          title: 'Moczenie i złuszczanie – skuteczna procedura w domu',
          slug: 'moczenie-zluszaczanie-stopy',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Dlaczego moczenie jest pierwszym krokiem?</h2>
<p>Warstwa rogowa naskórka jest zbudowana z martwych komórek (korneocytów) połączonych białkami strukturalnymi. Woda powoduje ich <strong>uwodnienie i zmiękczenie</strong> – naskórek zwiększa objętość o 20–300%, staje się plastyczny i łatwy do usunięcia. Moczenie to klucz do skutecznego złuszczania.</p>

<h2>Optymalne moczenie stóp</h2>
<ul>
  <li><strong>Temperatura wody:</strong> 37–40°C – ciepła, ale nie gorąca (gorąca woda przesusza skórę)</li>
  <li><strong>Czas:</strong> 10–15 minut – wystarczy do uwodnienia. Dłużej = maceracja (biała, papkowata skóra) – utrudnia złuszczanie</li>
  <li><strong>Dodatki do kąpieli:</strong>
    <ul>
      <li>Sól Epsom (siarczan magnezu) – relaksuje mięśnie, łagodnie złuszcza</li>
      <li>Soda oczyszczona – alkalizuje wodę, zmiękcza naskórek</li>
      <li>Olejki eteryczne (drzewo herbaciane, lawenda) – działanie antygrzybicze i relaksujące</li>
      <li>Mleko – kwas mlekowy naturalnie złuszcza naskórek</li>
    </ul>
  </li>
</ul>

<h2>Narzędzia do złuszczania</h2>
<ul>
  <li><strong>Pumeks</strong> – skała wulkaniczna o porowatej strukturze. Delikatne, równomierne złuszczanie. Wymagana moczenie przed użyciem. Myj i susz po każdym użyciu – grzyby uwielbiają wilgotny pumeks.</li>
  <li><strong>Pilnik do stóp (tarka)</strong> – metalowa lub ceramiczna. Szybsze i skuteczniejsze od pumeksu. Dobrze dla grubszych zrogowaceń.</li>
  <li><strong>Peelingi chemiczne</strong> – stopy z kwasem mocznikowym (20–40%), glikolowym lub mlekowym. Aplikowane na stopę, pozostawiane na 10–20 minut, zmywane. Bardzo skuteczne przy twardych modzelach.</li>
</ul>

<h2>Kolejność procedury</h2>
<ul>
  <li>1. Moczenie 10–15 minut</li>
  <li>2. Złuszczanie pumeksem lub pilnikiem (delikatne ruchy okrężne)</li>
  <li>3. Dokładne spłukanie</li>
  <li>4. Osuszenie – szczególnie między palcami (wilgoć = grzybica)</li>
  <li>5. Nawilżanie kremem z mocznikiem</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Nie złuszczaj zbyt agresywnie. Cienka warstwa zrogowaciałego naskórka jest naturalną ochroną – jej całkowite usunięcie sprawi, że skóra będzie delikatna i podatna na urazy. Celem jest wygładzenie, nie "zdzieranie do żywego".
</blockquote>
`
        },
        {
          title: 'Nawilżanie stóp – mocznik, masło shea, skarpety bawełniane',
          slug: 'nawilzanie-stop-mocznik',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Dlaczego stopy tak szybko się wysuszają?</h2>
<p>Brak gruczołów łojowych na podeszwie sprawia, że stopy pozbawione są naturalnego sebum – głównego składnika hydrolipidowego filmu chroniącego skórę przed utratą wody. Bez regularnego nawilżania naskórek stóp szybko staje się suchy, twardy i podatny na pękanie.</p>

<h2>Mocznik – najważniejszy składnik kremów do stóp</h2>
<p>Mocznik (urea) to naturalny składnik naturalnego czynnika nawilżającego skóry (NMF). Działa dwutorowo:</p>
<ul>
  <li><strong>Humektant</strong> – przyciąga i wiąże wodę w naskórku (przy niskich stężeniach 2–10%)</li>
  <li><strong>Keratolityczny</strong> – rozluźnia i usuwa martwy naskórek (przy wyższych stężeniach 20–40%)</li>
</ul>
<p><strong>Stężenia mocznika w kremach do stóp:</strong></p>
<ul>
  <li>5–10% – codzienne nawilżanie i profilaktyka</li>
  <li>15–20% – aktywne zmiękczanie modzelów i twardej skóry</li>
  <li>25–40% – intensywne leczenie głębokich zrogowaceń (stosować na obszary problemowe)</li>
</ul>

<h2>Masło shea – odżywienie i ochrona</h2>
<p>Masło shea (z orzechów drzewa Vitellaria paradoxa) jest bogatym źródłem kwasów tłuszczowych (oleinowy, stearynowy) i nienasyconych alkoholi triterpenu. Tworzy ochronną warstwę okluzyjną zapobiegającą utracie wody i działa przeciwzapalnie. Idealne jako baza kremów do stóp.</p>

<h2>Technika "skarpetki bawełniane" – maksymalne nawilżenie</h2>
<ul>
  <li>Wieczorem nałóż obfitą warstwę kremu z mocznikiem na czyste stopy</li>
  <li>Załóż skarpetki bawełniane (nie syntetyczne – bawełna "oddycha")</li>
  <li>Zostaw na noc</li>
  <li>Efekt okluzji: krem wnika głębiej, skóra jest nawilżona przez całą noc</li>
</ul>
<p>Po 1–2 tygodniach regularnego stosowania tej metody twarda skóra piąt dramatycznie się zmiękcza.</p>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Polecaj klientkom wieczorne nawilżanie codziennie, a nie "od czasu do czasu". Stopy potrzebują regularności – nawilżanie raz w tygodniu nie zastąpi codziennej pielęgnacji, bo skóra schnie na bieżąco.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Paznokcie i quiz',
      lessons: [
        {
          title: 'Prawidłowe cięcie i pilnikowanie paznokci stóp',
          slug: 'ciecie-pilnikowanie-paznokci-stop',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Dlaczego prawidłowe cięcie ma znaczenie?</h2>
<p>Nieprawidłowe obcinanie paznokci stóp jest główną przyczyną paznokci wrastających – jednego z najczęstszych i najbardziej bolesnych problemów podologicznych. Kilka prostych zasad zapobiega temu problemowi.</p>

<h2>Prawidłowy kształt paznokcia</h2>
<p>Paznokcie stóp powinny być obcinane <strong>prosto</strong>, z lekko zaokrąglonymi krawędziami – nie w "łuk" jak paznokcie dłoni. Kształt prostokąta z delikatnymi narożnikami zapobiega wrastaniu bocznych krawędzi w wał paznokciowy.</p>

<h2>Długość</h2>
<p>Paznokieć powinien wystawać poza opuszek palca o 1–2 mm. Zbyt krótkie paznokcie zwiększają ryzyko wrastania i infekcji. Zbyt długie łamią się i mogą uszkodzić sąsiednie palce.</p>

<h2>Narzędzia</h2>
<ul>
  <li><strong>Cążki do paznokci stóp</strong> – prostsze, mocniejsze niż do dłoni. Prosty ostrze dają prosty cięcie.</li>
  <li><strong>Pilnik do paznokci</strong> – wygładza krawędzie po cięciu. Pilnikuj zawsze w jednym kierunku – nie "piłuj" tam i z powrotem.</li>
  <li><strong>Szpatułka/łopatka do skórek</strong> – delikatnie odsuwa skórkę bez jej obcinania.</li>
</ul>

<h2>Krok po kroku</h2>
<ul>
  <li>Przed cięciem – moczyć lub złuszczać, by paznokcie były miękkie</li>
  <li>Tnij prostą krawędzią cążek, małymi cięciami od boku do środka</li>
  <li>Nie próbuj "jednym cięciem" – gruby paznokieć stóp pęka</li>
  <li>Wygładź krawędzie pilnikiem</li>
  <li>Nałóż oliwkę do skórek lub olejek na wał paznokciowy</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Jeśli klientka ma bardzo grube paznokcie (onychogryfoza, grzybica), miękkie je przez 15 minut w ciepłej wodzie z solą przed cięciem. Przy podejrzeniu grzybicy skieruj do podologa lub dermatologa – samodzielne leczenie jest rzadko skuteczne.
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Pielęgnacja stóp',
          slug: 'quiz-pielegnacja-stop',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Podstawy Pielęgnacji Stóp',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Dlaczego skóra stóp jest bardziej podatna na suchość niż skóra twarzy?',
                explanation: 'Podeszwa stóp nie ma gruczołów łojowych, które produkują sebum – naturalny składnik filmu hydrolipidowego chroniącego przed utratą wody.',
                options: [
                  { text: 'Brak gruczołów łojowych na podeszwie', isCorrect: true },
                  { text: 'Grubszy naskórek blokuje nawilżenie', isCorrect: false },
                  { text: 'Stopy mają zbyt wiele gruczołów potowych', isCorrect: false },
                  { text: 'Brak melanocytów w skórze stóp', isCorrect: false }
                ]
              },
              {
                text: 'Jaka jest różnica między modzelom a odciskiem?',
                explanation: 'Modzel to rozległe, bezbolesne zgrubienie. Odcisk ma centralne stożkowate jądro wnikające w głąb, uciskające nerwy i wywołujące ból.',
                options: [
                  { text: 'Odcisk ma centralne bolesne jądro, modzel jest rozległy i bezbolesny', isCorrect: true },
                  { text: 'Modzel boli, odcisk nie', isCorrect: false },
                  { text: 'Odcisk jest większy od modzela', isCorrect: false },
                  { text: 'Nie ma różnicy – to te same zmiany', isCorrect: false }
                ]
              },
              {
                text: 'Jak długo należy moczyć stopy przed złuszczaniem?',
                explanation: '10–15 minut moczenia wystarczy do uwodnienia naskórka. Dłużej powoduje macerację, która utrudnia złuszczanie.',
                options: [
                  { text: '10–15 minut', isCorrect: true },
                  { text: '2–3 minuty', isCorrect: false },
                  { text: '1 godzinę', isCorrect: false },
                  { text: 'Moczenie jest zbędne', isCorrect: false }
                ]
              },
              {
                text: 'Jakie stężenie mocznika działa keratolitycznie (złuszczająco)?',
                explanation: 'Wyższe stężenia mocznika (20–40%) działają keratolitycznie, niższe (2–10%) głównie nawilżają.',
                options: [
                  { text: '20–40%', isCorrect: true },
                  { text: '1–2%', isCorrect: false },
                  { text: '5%', isCorrect: false },
                  { text: 'Mocznik nie ma właściwości złuszczających', isCorrect: false }
                ]
              },
              {
                text: 'Jaki kształt powinien mieć prawidłowo obcięty paznokieć stopy?',
                explanation: 'Paznokcie stóp obcinamy prosto z lekko zaokrąglonymi krawędziami – kształt prostokąta zapobiega wrastaniu.',
                options: [
                  { text: 'Prosto z lekko zaokrąglonymi krawędziami', isCorrect: true },
                  { text: 'W mocny łuk jak paznokcie dłoni', isCorrect: false },
                  { text: 'Szpiczasto', isCorrect: false },
                  { text: 'Kształt nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Dlaczego między palcami stóp ważne jest dokładne osuszanie po kąpieli?',
                explanation: 'Wilgotne środowisko między palcami sprzyja namnażaniu grzybów dermatofitów powodujących grzybicę stóp.',
                options: [
                  { text: 'Wilgoć sprzyja rozwojowi grzybicy', isCorrect: true },
                  { text: 'Zapobiega to pączkaniu skóry', isCorrect: false },
                  { text: 'Ogranicza produkcję modzeli', isCorrect: false },
                  { text: 'Osuszanie między palcami nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Co to jest technika "skarpetki bawełniane"?',
                explanation: 'Technika polega na nałożeniu kremu z mocznikiem na stopy i założeniu bawełnianych skarpetek na noc – okluzja wspomaga wnikanie składników aktywnych.',
                options: [
                  { text: 'Nakładanie kremu z mocznikiem na noc pod bawełniane skarpetki', isCorrect: true },
                  { text: 'Noszenie specjalnych skarpet w ciągu dnia', isCorrect: false },
                  { text: 'Moczenie stóp w roztworze z bawełnianą tkaniną', isCorrect: false },
                  { text: 'Technika masażu przy użyciu bawełnianych materiałów', isCorrect: false }
                ]
              },
              {
                text: 'Kto powinien ZAWSZE konsultować się z lekarzem przed jakimkolwiek zabiegiem pedicure?',
                explanation: 'Osoby z cukrzycą mają neuropatię zmniejszającą czucie bólu i gorszą gojenie ran – ryzyko poważnych powikłań nawet po drobnych urazach.',
                options: [
                  { text: 'Osoby z cukrzycą', isCorrect: true },
                  { text: 'Osoby powyżej 60. roku życia', isCorrect: false },
                  { text: 'Osoby z suchą skórą', isCorrect: false },
                  { text: 'Osoby z wrastającymi paznokciami', isCorrect: false }
                ]
              },
              {
                text: 'Ile gruczołów potowych na 1 cm² skóry ma podeszwa stopy?',
                explanation: 'Podeszwa stopy ma około 200–250 gruczołów potowych na cm², co jest jedną z najwyższych gęstości w ciele człowieka.',
                options: [
                  { text: '200–250 na cm²', isCorrect: true },
                  { text: '5–10 na cm²', isCorrect: false },
                  { text: '500–600 na cm²', isCorrect: false },
                  { text: '50–80 na cm²', isCorrect: false }
                ]
              },
              {
                text: 'Która metoda złuszczania jest najbardziej agresywna i przeznaczona dla głębokich zrogowaceń?',
                explanation: 'Peelingi chemiczne z mocznikiem 20–40% lub kwasem glikolowym działają aktywnie i są przeznaczone na głębsze zrogowacenia.',
                options: [
                  { text: 'Peeling chemiczny z mocznikiem 20–40%', isCorrect: true },
                  { text: 'Pumeks w ciepłej wodzie', isCorrect: false },
                  { text: 'Delikatna tarka ceramiczna', isCorrect: false },
                  { text: 'Masaż suchą szczotką', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── COURSE 8: Profesjonalny Pedicure ────────────────────────────────────────

const course8: CourseData = {
  title: 'Profesjonalny Pedicure – Od Podstaw do Eksperta',
  slug: 'profesjonalny-pedicure-od-podstaw',
  description: 'Poznaj sprzęt, techniki i protokoły profesjonalnego pedicure. Naucz się bezpiecznej pracy frezarką, radzenia sobie z wrastającymi paznokciami i oceny stanu zdrowia stóp.',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 120,
  tags: ['pedicure', 'frezowanie', 'wrastające paznokcie'],
  modules: [
    {
      title: 'Przygotowanie i narzędzia',
      lessons: [
        {
          title: 'Sprzęt do pedicure – rodzaje, materiały, sterylizacja',
          slug: 'sprzet-do-pedicure-sterylizacja',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Kategorie sprzętu do pedicure</h2>
<p>Narzędzia do pedicure dzielą się na trzy kategorie ze względu na wymagania sterylizacyjne:</p>
<ul>
  <li><strong>Krytyczne</strong> – mają kontakt z krwią lub przebijają skórę (skalpel, nożyki). Wymagają sterylizacji w autoklawie.</li>
  <li><strong>Półkrytyczne</strong> – kontaktują się z błonami śluzowymi lub nieciągłą skórą (cążki, nożyczki). Wymagają co najmniej dezynfekcji wysokiego poziomu lub sterylizacji.</li>
  <li><strong>Niekrytyczne</strong> – kontaktują się tylko z nieuszkodzoną skórą (tarka, pumeks, pędzel). Dezynfekcja na poziomie niskim do średniego.</li>
</ul>

<h2>Podstawowy zestaw narzędzi</h2>
<ul>
  <li><strong>Cążki do paznokci stóp</strong> – wykonane ze stali nierdzewnej klasy medycznej. Proste ostrze. Wymieniaj co 6–12 miesięcy lub gdy tępią się.</li>
  <li><strong>Pilniki różnych gradacji</strong> – 80/80 (grube zrogowacenie), 100/180 (standardowe), 240+ (wykończenie)</li>
  <li><strong>Tarka do stóp (frez-tarka)</strong> – metalowa lub ceramiczna, zmywalna i dezynfekowalna</li>
  <li><strong>Szpatułka do skórek</strong> – ze stali nierdzewnej</li>
  <li><strong>Separatory palców</strong> – jednorazowe lub dezynfekowane</li>
  <li><strong>Miska do moczenia</strong> – z tworzywa ABS, zmywalna. Nigdy nie używaj tej samej miski bez dezynfekcji.</li>
</ul>

<h2>Sterylizacja i dezynfekcja</h2>
<ul>
  <li><strong>Autoklawowanie</strong> – 121°C/15 min lub 134°C/3 min. Standard dla narzędzi krytycznych. Jedyna metoda zabijająca przetrwalniki.</li>
  <li><strong>Chemiczna dezynfekcja</strong> – preparaty glutaraldehydowe (Korsolex), czwartorzędowe amoniowe (Incidin), chlorowe. Czas ekspozycji wg karty produktu.</li>
  <li><strong>UV-sterylizator</strong> – UWAGA: UV zabija drobnoustroje tylko na oświetlonej powierzchni. Nie penetruje ani zagięć narzędzi. Może być stosowany jako uzupełnienie, nie jako jedyna metoda.</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Dezynfekcja to nie sterylizacja. Dezynfekcja zmniejsza liczbę drobnoustrojów do bezpiecznego poziomu, sterylizacja eliminuje wszystkie formy życia łącznie z przetrwalnikami. Przy pedicure medycznym (usuwanie wrastających paznokci, opracowywanie ran) wymagana jest sterylizacja autoklawie.
</blockquote>
`
        },
        {
          title: 'Ocena stanu stóp – wywiad i wskazania',
          slug: 'ocena-stanu-stop-wywiad',
          type: 'TEXT',
          estimatedMinutes: 15,
          contentHtml: `
<h2>Dlaczego wywiad jest niezbędny przed pedicure?</h2>
<p>Ocena stanu stóp i wywiad z klientem chronią zarówno klienta, jak i kosmetologa. Pozwalają wykryć przeciwwskazania, zaplanować odpowiednią procedurę i uniknąć powikłań.</p>

<h2>Kluczowe pytania w wywiadzie</h2>
<ul>
  <li>Czy ma choroby układowe? (cukrzyca, choroby naczyniowe, zaburzenia krzepnięcia)</li>
  <li>Czy stosuje leki rozrzedzające krew? (aspiryna, warfaryna, klopidogrel – zwiększone ryzyko krwawienia)</li>
  <li>Czy ma uczulenia na preparaty kosmetyczne, lateks, metale?</li>
  <li>Czy przeszedł operacje na stopach?</li>
  <li>Czy ma aktualnie jakiekolwiek rany, odparzeliny, stany zapalne?</li>
  <li>Czy zaobserwował objawy grzybicy? (swędzenie, łuszczenie, nieprzyjemny zapach)</li>
</ul>

<h2>Ocena wizualna stóp</h2>
<p>Przed zabiegiem przeprowadź dokładną ocenę:</p>
<ul>
  <li><strong>Paznokcie</strong> – kolor (przebarwienia = grzybica?), kształt, grubość, obecność onycholizy</li>
  <li><strong>Skóra</strong> – hiperkeratoza, szczeliny, odciski, modzele, zmiany rumieniowe</li>
  <li><strong>Przestrzenie między palcami</strong> – maceracja, łuszczenie, biały nalot (grzybica?)</li>
  <li><strong>Naczynia</strong> – żylaki, obrzęki, zmiany zabarwienia skóry wskazujące na zaburzenia krążenia</li>
  <li><strong>Deformacje kostne</strong> – haluksy, palce młoteczkowe, koślawość</li>
</ul>

<h2>Bezwzględne przeciwwskazania do pedicure</h2>
<ul>
  <li>Aktywna grzybica (silna maceracja, biały nalot, podejrzana zmiana paznokcia)</li>
  <li>Otwarte rany, owrzodzenia</li>
  <li>Zakrzepowe zapalenie żył</li>
  <li>Silny obrzęk nieznanego pochodzenia</li>
  <li>Cukrzyca bez kwalifikacji lekarskiej</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Gdy masz wątpliwości – nie wykonuj zabiegu. Lepiej stracić klienta na jeden raz niż narazić go i siebie na poważne powikłania. Skieruj do podologa lub lekarza z konkretną informacją o zaobserwowanych zmianach.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Techniki pedicure',
      lessons: [
        {
          title: 'Pedicure mokry vs suchy – różnice i zastosowanie',
          slug: 'pedicure-mokry-vs-suchy',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Pedicure mokry (tradycyjny)</h2>
<p>Pedicure mokry to klasyczna metoda z moczeniem stóp na początku zabiegu. Jest najpopularniejszy w gabinetach kosmetycznych i znany większości klientów.</p>

<h2>Zalety pedicure mokrego</h2>
<ul>
  <li>Relaksujące moczenie – klienci lubią ten etap</li>
  <li>Uwodnienie naskórka ułatwia mechaniczne opracowanie</li>
  <li>Niższa bariera wejścia – nie wymaga specjalistycznego sprzętu</li>
</ul>

<h2>Wady pedicure mokrego</h2>
<ul>
  <li><strong>Ryzyko infekcji grzybiczej</strong> – miska do moczenia to idealne środowisko dla grzybów. Wymaga bardzo starannej dezynfekcji po każdym kliencie.</li>
  <li>Maceracja naskórka może utrudniać precyzyjne opracowanie skóry</li>
  <li>Uwodnione paznokcie są miękkie i trudniejsze do równego cięcia</li>
  <li>Czas zabiegu dłuższy</li>
</ul>

<h2>Pedicure suchy (dry pedicure)</h2>
<p>Pedicure bez moczenia stóp. Opracowywanie naskórka odbywa się na suchej skórze przy użyciu frezarki lub tarki, a skórki i paznokcie bez moczenia.</p>

<h2>Zalety pedicure suchego</h2>
<ul>
  <li><strong>Higieniczniejszy</strong> – eliminuje ryzyko infekcji przez wodę w misce</li>
  <li><strong>Precyzyjniejszy</strong> – suche tkanki są łatwiejsze do kontrolowanego opracowania frezarką</li>
  <li>Szybszy – brak etapu moczenia</li>
  <li>Polecany w gabinecie podologicznym i medycznym</li>
</ul>

<h2>Wady pedicure suchego</h2>
<ul>
  <li>Wymaga frezarki – wyższy koszt sprzętu</li>
  <li>Wymaga szkolenia z obsługi frezarki</li>
  <li>Mniej relaksujące dla klienta nastawionego na "spa"</li>
</ul>

<h2>Kiedy który?</h2>
<ul>
  <li>Pedicure mokry – klienci spa, lekka hiperkeratoza, cel relaksacyjny</li>
  <li>Pedicure suchy – klienci z wrastającymi paznokciami, grubą hiperkeratozą, cukrzyca (z kwalifikacją), gabinet podologiczny</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Dezynfekcja miski po pedicure mokrym to absolutna konieczność. Dermatofity mogą przetrwać na suchych powierzchniach tygodniami. Używaj preparatu dezynfekującego z potwierdzonym działaniem na grzyby (fungicydalne) i stosuj go przez wymagany czas ekspozycji.
</blockquote>
`
        },
        {
          title: 'Frezarka i usuwanie zrogowaceń – technika bezpieczna',
          slug: 'frezarka-usuwanie-zrogowacel',
          type: 'TEXT',
          estimatedMinutes: 25,
          contentHtml: `
<h2>Budowa frezarki kosmetycznej</h2>
<p>Frezarka (mikromotor) to urządzenie elektryczne z regulowaną prędkością obrotową (RPM) i wymiennym uchwytem na frezy. Prędkość regulowana od 0 do 30 000–45 000 RPM.</p>

<h2>Rodzaje frezów</h2>
<ul>
  <li><strong>Frezy z węglika wolframu (carbide)</strong> – twarde, trwałe, do usuwania zrogowaceń. Różne kształty: walec, stożek, kula.</li>
  <li><strong>Frezy ceramiczne</strong> – delikatniejsze, do wykończenia i polerowania. Mniej agresywne od carbide.</li>
  <li><strong>Frezy z piasku (sand/diamond dust)</strong> – do wygładzania naskórka. Różna gradacja ziarna.</li>
  <li><strong>Kapturek silikonowy/gumowy</strong> – do masażu i wygładzania delikatnych obszarów.</li>
</ul>

<h2>Zasady bezpiecznej pracy frezarką</h2>
<ul>
  <li><strong>Prędkość obrotowa:</strong>
    <ul>
      <li>Naskórek, skóra naturalna: 5 000–15 000 RPM</li>
      <li>Modzele, gruba hiperkeratoza: 15 000–25 000 RPM</li>
      <li>Paznokcie: 8 000–20 000 RPM (zależy od grubości)</li>
    </ul>
  </li>
  <li><strong>Technika pracy:</strong>
    <ul>
      <li>Frez trzymaj prostopadle lub pod małym kątem do powierzchni</li>
      <li>Lekkie dotknięcia, frez "pracuje" – nie przyciskaj</li>
      <li>Ruch ciągły – nigdy nie zatrzymuj frezu w jednym miejscu</li>
      <li>Pracuj małymi obszarami, regularnie kontroluj efekt</li>
    </ul>
  </li>
  <li><strong>Temperatura:</strong> Regularnie sprawdzaj temperaturę skóry dłonią. Przegrzanie = ból + uszkodzenie tkanki.</li>
  <li><strong>Zapylenie:</strong> Zawsze używaj aspiratora pyłów lub maski. Keratynowy pył może powodować reakcje alergiczne i infekcje dróg oddechowych.</li>
</ul>

<h2>Usuwanie zrogowaceń frezem walcowym</h2>
<ul>
  <li>Zacznij od grubszego frezu (rough carbide)</li>
  <li>Opracowuj piętę ruchami okrężnymi, stopniowo zmniejszając warstwę</li>
  <li>Cel: miękka, ale nie "surowa" skóra. Nie usuwaj całej warstwy rogowej.</li>
  <li>Wykończ delikatniejszym frezem lub tarką 100/180</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Frezarka w nieumiejętnych rękach może poważnie uszkodzić tkanki. Jeśli dopiero zaczynasz, ćwicz na modelu lub manekinie, zanim zaczniesz pracować z klientem. Kurs z certyfikowanym szkoleniowcem to inwestycja, która chroni Ciebie i klientów.
</blockquote>
`
        }
      ]
    },
    {
      title: 'Problemy i quiz',
      lessons: [
        {
          title: 'Wrastające paznokcie – profilaktyka, korekta, kiedy do podologa',
          slug: 'wrastajace-paznokcie-korekta',
          type: 'TEXT',
          estimatedMinutes: 20,
          contentHtml: `
<h2>Czym jest wrastający paznokieć?</h2>
<p>Wrastający paznokieć (onychocryptosis) to stan, w którym boczna krawędź lub rogi paznokcia wnikają w wał paznokciowy, powodując ból, obrzęk i – przy zaniedbaniu – infekcję.</p>

<h2>Przyczyny wrastania</h2>
<ul>
  <li><strong>Nieprawidłowe obcinanie</strong> – zbyt głębokie boczne krawędzie, obcinanie w łuk</li>
  <li><strong>Ciasne obuwie</strong> – ucisk boczny pcha krawędź paznokcia w wał</li>
  <li><strong>Urazy</strong> – uderzenie, potknięcie</li>
  <li><strong>Anatomia paznokcia</strong> – wrodzona krzywizna (tibial curvature), pochylony wzrost</li>
  <li><strong>Nadpotliwość</strong> – maceracja wału paznokciowego</li>
</ul>

<h2>Stopnie wrastania (klasyfikacja Hessela)</h2>
<ul>
  <li><strong>Stopień I</strong> – ból boczny, lekki obrzęk. Brak infekcji. Możliwa pielęgnacja kosmetyczna.</li>
  <li><strong>Stopień II</strong> – wydzielina z wału, stan zapalny. Wymaga podologa.</li>
  <li><strong>Stopień III</strong> – przerost wału paznokciowego (hypergranulacja), silna infekcja. Wymaga leczenia medycznego.</li>
</ul>

<h2>Korekta paznokcia (stopień I)</h2>
<ul>
  <li>Moczyć stopę 10–15 minut</li>
  <li>Delikatnie odsuń wał od krawędzi paznokcia przy użyciu szpatułki</li>
  <li>Wytnij małą "rampę" freiem lub pilnikiem pod krawędzią wnikającą – nie całej krawędzi</li>
  <li>Umieść pod krawędzią małą watkę lub specjalną taśmę korekcyjną (wire brace)</li>
  <li>Poucz klienta o prawidłowym obcinaniu i obuwiu</li>
</ul>

<h2>Klamry korekcyjne</h2>
<p>Klamerki ortodontyczne (BS klamra, VHO klamra, 3TO) korygują krzywizną paznokcia przez stopniowe wyrównywanie. Naklejane na płytkę paznokcia, bezinwazyjne. Czas korekty: 3–12 miesięcy w zależności od stopnia deformacji.</p>

<h2>Kiedy skierować do podologa lub chirurga?</h2>
<ul>
  <li>Stopień II i III – infekcja, wydzielina, silny ból</li>
  <li>Cukrzyca – jakikolwiek wrastający paznokieć</li>
  <li>Nawracające wrastanie mimo korekty</li>
  <li>Podejrzenie grzyba powodującego krzywizną paznokcia</li>
</ul>

<blockquote>
  <strong>Wskazówka kosmetologa:</strong> Nigdy nie wycinaj głęboko przy wrastającym paznokciu stopnia II lub III. Ryzykujesz pogłębienie infekcji i – u diabetyków – poważne powikłania septyczne. Twój limit kończy się przy stopniu I bez infekcji.
</blockquote>
`
        },
        {
          title: 'Quiz końcowy — Pedicure',
          slug: 'quiz-pedicure',
          type: 'QUIZ',
          estimatedMinutes: 10,
          quiz: {
            title: 'Quiz: Profesjonalny Pedicure',
            passingScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Jaką metodą dezynfekcji należy stosować dla narzędzi "krytycznych" (kontakt z krwią)?',
                explanation: 'Narzędzia krytyczne wymagają sterylizacji w autoklawie – jedynej metody zabijającej przetrwalniki.',
                options: [
                  { text: 'Sterylizacja w autoklawie', isCorrect: true },
                  { text: 'Dezynfekcja chemiczna', isCorrect: false },
                  { text: 'Lampa UV', isCorrect: false },
                  { text: 'Wytarcie alkoholem 70%', isCorrect: false }
                ]
              },
              {
                text: 'Jakie jest główne ryzyko higieniczne związane z pedicure mokrym?',
                explanation: 'Miska do moczenia jest środowiskiem sprzyjającym grzybom dermatofitom. Wymaga starannej dezynfekcji fungicydalnej po każdym kliencie.',
                options: [
                  { text: 'Przenoszenie grzybicy przez miski do moczenia', isCorrect: true },
                  { text: 'Poparzenie gorącą wodą', isCorrect: false },
                  { text: 'Uczulenie na sól do kąpieli', isCorrect: false },
                  { text: 'Brak ryzyka przy pedicure mokrym', isCorrect: false }
                ]
              },
              {
                text: 'Jaką prędkość RPM stosuje się przy opracowaniu normalnej skóry stóp frezarką?',
                explanation: 'Do normalnej skóry stosuje się 5 000–15 000 RPM. Grubsze zrogowacenia wymagają 15 000–25 000 RPM.',
                options: [
                  { text: '5 000–15 000 RPM', isCorrect: true },
                  { text: '30 000–45 000 RPM', isCorrect: false },
                  { text: '500–1 000 RPM', isCorrect: false },
                  { text: 'RPM nie ma znaczenia', isCorrect: false }
                ]
              },
              {
                text: 'Który stopień wrastającego paznokcia kwalifikuje się do samodzielnej korekty kosmetologicznej?',
                explanation: 'Stopień I (ból, lekki obrzęk, brak infekcji) można ostrożnie opracować. Stopień II i III wymagają podologa lub lekarza.',
                options: [
                  { text: 'Stopień I', isCorrect: true },
                  { text: 'Stopień III', isCorrect: false },
                  { text: 'Stopień II', isCorrect: false },
                  { text: 'Wszystkie stopnie', isCorrect: false }
                ]
              },
              {
                text: 'Jakie jest bezwzględne przeciwwskazanie do zabiegu pedicure?',
                explanation: 'Aktywna grzybica to bezwzględne przeciwwskazanie – ryzyko zakażenia sprzętu i przeniesienia na inne osoby.',
                options: [
                  { text: 'Aktywna grzybica stóp', isCorrect: true },
                  { text: 'Sucha skóra stóp', isCorrect: false },
                  { text: 'Modzele na podeszwie', isCorrect: false },
                  { text: 'Długie paznokcie', isCorrect: false }
                ]
              },
              {
                text: 'Jaka jest główna zaleta pedicure suchego nad mokrym?',
                explanation: 'Pedicure suchy eliminuje ryzyko infekcji przez wodę w misce i jest bardziej precyzyjny dzięki pracy na suchych tkankach.',
                options: [
                  { text: 'Jest higieniczniejszy i bardziej precyzyjny', isCorrect: true },
                  { text: 'Jest tańszy i nie wymaga sprzętu', isCorrect: false },
                  { text: 'Lepszy efekt relaksacyjny', isCorrect: false },
                  { text: 'Nie wymaga żadnego szkolenia', isCorrect: false }
                ]
              },
              {
                text: 'Co to są klamry korekcyjne do paznokci?',
                explanation: 'Klamry (BS, VHO, 3TO) to ortodontyczne narzędzia naklejane na paznokieć, które stopniowo korygują krzywizną przez 3–12 miesięcy.',
                options: [
                  { text: 'Ortodontyczne urządzenia do korekty krzywizny paznokcia', isCorrect: true },
                  { text: 'Narzędzia do skracania paznokci', isCorrect: false },
                  { text: 'Opatrunki przy wrastającym paznokciu stopnia III', isCorrect: false },
                  { text: 'Akcesoria do zdobienia paznokci', isCorrect: false }
                ]
              },
              {
                text: 'Dlaczego nie należy zatrzymywać frezu w jednym miejscu podczas pracy?',
                explanation: 'Zatrzymany frez przegrzewa tkanki, co powoduje ból i uszkodzenie skóry lub paznokcia.',
                options: [
                  { text: 'Powoduje przegrzanie i uszkodzenie tkanek', isCorrect: true },
                  { text: 'Niszczy frez', isCorrect: false },
                  { text: 'Wytwarza zbyt dużo pyłu', isCorrect: false },
                  { text: 'Blokuje silnik frezarki', isCorrect: false }
                ]
              },
              {
                text: 'Który lek przyjmowany przez klienta zwiększa ryzyko krwawienia podczas pedicure?',
                explanation: 'Warfaryna, aspiryna i klopidogrel to leki rozrzedzające krew – zwiększają ryzyko krwawienia przy nacięciach lub urazach.',
                options: [
                  { text: 'Warfaryna (lek rozrzedzający krew)', isCorrect: true },
                  { text: 'Metformina (cukrzyca)', isCorrect: false },
                  { text: 'Amlodypina (ciśnienie)', isCorrect: false },
                  { text: 'Wit. D3', isCorrect: false }
                ]
              },
              {
                text: 'Co powinna zrobić kosmetologka, gdy ma wątpliwości co do stanu stóp klientki?',
                explanation: 'Zasada bezpieczeństwa: przy wątpliwościach nie wykonuj zabiegu i skieruj do podologa lub lekarza.',
                options: [
                  { text: 'Nie wykonywać zabiegu i skierować do podologa', isCorrect: true },
                  { text: 'Wykonać zabieg, ale delikatniej', isCorrect: false },
                  { text: 'Zapytać klientkę, czy chce kontynuować', isCorrect: false },
                  { text: 'Zastosować mocniejszą dezynfekcję i kontynuować', isCorrect: false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── Main seed function ───────────────────────────────────────────────────────

async function seedCourse(data: CourseData) {
  const existing = await prisma.course.findUnique({ where: { slug: data.slug } });
  if (existing) {
    console.log(`  ⏭  Kurs już istnieje, pomijam: ${data.title}`);
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
      data: {
        courseId: course.id,
        title: mod.title,
        order: mi + 1,
      }
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

  console.log(`  ✓ Kurs utworzony: ${data.title}`);
}

async function main() {
  console.log('🌱 Seedowanie Akademii BeautyBeskid...\n');

  const courses = [course1, course2, course3, course4, course5, course6, course7, course8];
  for (const course of courses) {
    await seedCourse(course);
  }

  console.log('\n✅ Seedowanie Akademii BeautyBeskid (kursy 1–8) zakończone pomyślnie.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

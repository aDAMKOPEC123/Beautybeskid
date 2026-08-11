# Akademia — wgrywanie, kadrowanie i pozycjonowanie obrazów

Data: 2026-08-11

## Problem

W Akademii obrazy dodaje się dziś przez wklejanie adresu URL, a wgrane zdjęcia
nie dają się ułożyć względem tekstu:

- **Okładka kursu** (`AcademyStudio.tsx:57`) — pole tekstowe „Okładka — adres obrazu".
  Administratorka musi sama skądś wziąć działający adres.
- **Zdjęcie prowadzącej** (`apps/academy-web/src/pages/admin/AdminInstructors.tsx:130-132`) —
  to samo, z podpowiedzią „Pliki wgrywasz w zakładce Biblioteka mediów i kopiujesz stamtąd adres".
- **Obrazy w treści lekcji** (`RichTextEditor`, `AcademyStudio.tsx:287-300`) — upload
  działa (`POST /academy/admin/lesson-images`), ale wstawia surowe
  `<figure><img></figure>`: bez kadrowania, bez kontroli szerokości, bez pozycji,
  bez podpisu.

## Zakres

Trzy miejsca wgrywania obrazu bezpośrednio z dysku, wspólne okno kadrowania oraz
pełna kontrola układu obrazu w treści lekcji.

Poza zakresem: `samplePdfUrl`, moduł `AcademyMedia` (bannery marketingowe),
migracja istniejących obrazów wstawionych wcześniej przez URL (działają dalej
bez zmian, po prostu bez zapisanego układu).

## Ustalenia wstępne

**Gdzie żyje kod.** `apps/web/src/pages/admin/academy/*` (m.in. `AdminCourseEditor.tsx`,
`AdminInstructors.tsx`) to martwy kod — `apps/web/src/router.tsx:290-292` przekierowuje
`/admin/akademia*` na subdomenę akademii. Cała praca dotyczy wyłącznie
`apps/academy-web`. (CLAUDE.md jest w tym punkcie nieaktualny — warto poprawić
osobno, poza tą specyfikacją.)

**Dlaczego nie `AcademyMedia`.** Istniejący `uploadAcademyMedia`
(`marketing/academy-media.service.ts`) wymusza tekst alternatywny, generuje pięć
plików (desktop/mobile/thumb × webp/avif) i wpis w bazie. To narzędzie pod bannery
marketingowe; dla okładki kursu i zdjęcia prowadzącej byłby to zbędny narzut.

**Ograniczenie układu obrazu.** Dosłowne „jak w Wordzie", czyli obraz przypięty do
współrzędnych strony, wymaga pozycjonowania absolutnego i rozjeżdża się przy
zmianie szerokości ekranu — a lekcje czyta się także na telefonie. Dlatego
przeciąganie przenosi obraz **między miejscami w tekście**, a nie po dowolnych
pikselach. Wrażenie w obsłudze jest to samo, układ pozostaje odporny na zmianę
szerokości.

## Architektura

### Komponent `ImageCropDialog`

`apps/academy-web/src/components/ImageCropDialog.tsx` — jedno okno kadrowania
używane we wszystkich trzech miejscach. Oparte o `react-easy-crop` (^6.2.3, nowa
zależność `apps/academy-web`).

Interfejs:

```ts
type CropAspect = number | 'free';

interface ImageCropDialogProps {
  file: File;                 // plik wybrany przez użytkownika
  aspect: CropAspect;         // proporcje startowe
  lockAspect?: boolean;       // true = bez przełącznika proporcji
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void | Promise<void>;
}
```

Zachowanie: przesuwanie i zoom (mysz, dotyk, klawiatura strzałkami), opcjonalny
przełącznik proporcji 16:9 / 4:3 / 1:1 / swobodne, przycisk „Przytnij i wstaw".
Kadr wycinany jest w `<canvas>` i zwracany jako WebP (jakość 0,9), więc na serwer
trafia już przycięty obraz — to, co widać w oknie, jest tym, co zobaczy kursantka.

Logika przeliczania obszaru kadru na piksele źródłowe wydzielona do czystej
funkcji w `apps/academy-web/src/lib/cropImage.ts`:

```ts
export function cropAreaToPixels(
  area: { x: number; y: number; width: number; height: number },  // procenty
  natural: { width: number; height: number },
): { left: number; top: number; width: number; height: number };
```

Funkcja zaokrągla do pełnych pikseli i przycina wynik do granic obrazu, żeby
`canvas.drawImage` nigdy nie dostał obszaru wychodzącego poza źródło.

### Hook `useImageUpload`

`apps/academy-web/src/hooks/useImageUpload.ts` — obsługa powtarzalnego cyklu
„wybierz plik → kadruj → wyślij → adres". Zwraca stan `uploading`, komunikat
błędu i funkcje do podpięcia pod `<input type="file">`. Dzięki temu trzy miejsca
użycia nie powielają obsługi błędów i blokowania przycisku.

### Backend

Jedna zmiana, bez migracji bazy — `Course.thumbnailUrl`, `AcademyInstructor.photoUrl`
i `Lesson.contentHtml` już istnieją.

`POST /academy/admin/lesson-images` (`lessons.router.ts:31`) przyjmuje dodatkowe,
opcjonalne pole formularza `folder`. Dozwolone wartości — zamknięta lista w
`lessons.controller.ts`:

```ts
const ALLOWED_FOLDERS = ['academy-lessons', 'academy-courses', 'academy-instructors'] as const;
```

Wartość spoza listy lub brak pola → `academy-lessons` (zachowanie dotychczasowe,
zgodne wstecz). Folder wędruje do istniejącego `processAndSaveImage`, który
skaluje do 1200×1200 „inside" i zapisuje WebP. Ponieważ kadr jest już wycięty po
stronie przeglądarki, gałąź `hero`/`recommended` z focal-cropem nie jest tu
używana.

Uwaga bezpieczeństwa: `folder` nigdy nie trafia do ścieżki bez sprawdzenia
przynależności do `ALLOWED_FOLDERS` — inaczej byłaby to podatność na wyjście poza
katalog (`../`).

## Funkcja 1 — okładka kursu

`AcademyStudio.tsx`, w miejscu pola „Okładka — adres obrazu":

```
┌──────────────────────────────┐
│  [ podgląd okładki 16:9 ]    │
│                              │
│  [Zmień zdjęcie] [Usuń]      │
└──────────────────────────────┘
```

- Brak okładki → kafelek zachęcający „Dodaj okładkę", z informacją o zalecanych
  proporcjach 16:9.
- Wybór pliku → `ImageCropDialog` z `aspect={16/9}` i `lockAspect`, bo okładka
  wyświetla się w sklepie w stałych proporcjach.
- Po przycięciu obraz leci do `folder: 'academy-courses'`, a zwrócony adres ląduje
  w `draft.thumbnailUrl`. Sekcja „Podgląd strony kursu" pokazuje efekt natychmiast.
- Upload działa także przed zapisaniem kursu — adres siedzi w szkicu i utrwala się
  przy „Utwórz kurs".
- „Usuń" czyści `thumbnailUrl` (plik zostaje na dysku — kasowanie osieroconych
  plików to osobny temat, poza tą specyfikacją).

## Funkcja 2 — zdjęcie prowadzącej

`apps/academy-web/src/pages/admin/AdminInstructors.tsx` — pole „Adres zdjęcia"
zastąpione tym samym kafelkiem, w wariancie kwadratowym (`aspect={1}`,
`lockAspect`), bo zdjęcia prowadzących wyświetlają się jako koła. Folder:
`academy-instructors`. Podpowiedź o „Bibliotece mediów" znika.

## Funkcja 3 — obrazy w treści lekcji

### Model danych w HTML

Obraz zapisuje się jako `<figure>` z klasą układu i szerokością w stylu:

```html
<figure class="academy-figure academy-figure--left" style="width:45%">
  <img src="/uploads/academy-lessons/….webp" alt="Opis" loading="lazy">
  <figcaption>Podpis pod zdjęciem</figcaption>
</figure>
```

Klasy układu: `--left`, `--center`, `--right`, `--full`. Szerokość jako procent
w `style="width:…"`. Wybór klas zamiast czystych stylów jest celowy: przeżywają
sanityzację, a wygląd da się później zmienić w jednym miejscu w CSS.

Serializacja i odczyt tego układu wydzielone do czystego modułu
`apps/academy-web/src/lib/lessonFigure.ts`:

```ts
export type FigureLayout = 'left' | 'center' | 'right' | 'full';

export function buildFigureHtml(input: {
  src: string; alt: string; caption: string;
  layout: FigureLayout; widthPercent: number;
}): string;

export function readFigureLayout(figure: HTMLElement): {
  layout: FigureLayout; widthPercent: number;
};

export function applyFigureLayout(
  figure: HTMLElement, layout: FigureLayout, widthPercent: number,
): void;
```

`widthPercent` jest zawsze przycinany do zakresu 10–100. Dla `layout === 'full'`
szerokość wynosi 100 niezależnie od podanej wartości.

### Obsługa w edytorze

Rozbudowa `RichTextEditor` w `AcademyStudio.tsx`. Komponent urósł już do rozmiaru,
w którym trzyma zbyt wiele naraz — przy okazji wędruje do własnego pliku
`apps/academy-web/src/components/RichTextEditor.tsx`, razem z nowym
`FigureToolbar`. `AcademyStudio.tsx` importuje go bez zmian w użyciu.

Po kliknięciu w obraz pojawia się ramka zaznaczenia z uchwytami i pasek:

```
      ╔═══════════════════╗ ← uchwyty w rogach: ciągnij, by zmienić rozmiar
      ║                   ║
      ║      obraz        ║
      ║                   ║
      ╚═══════════════════╝
   ┌─────────────────────────────┐
   │ [◧ lewo][▣ środek][◨ prawo] │
   │ [▬ cała szerokość]          │
   │ [✂ Kadruj] [✎ Podpis] [🗑]  │
   └─────────────────────────────┘
```

- **Przeciąganie** — natywne dla `contentEditable`: chwytasz obraz i przenosisz w
  inne miejsce tekstu, kursor pokazuje punkt wstawienia. Wymaga `draggable="true"`
  na `<figure>` i zsynchronizowania HTML po zakończeniu przeciągania.
- **Uchwyty w rogach** — zmiana szerokości przez `pointermove`, z podpowiedzią
  procentową w trakcie. Zakres 10–100%.
- **Wyrównanie** — `lewo`/`prawo` oblewają obraz tekstem, `środek` i
  `cała szerokość` ustawiają go jako osobny blok.
- **Kadruj** — otwiera `ImageCropDialog` na już wstawionym obrazie
  (`aspect='free'`, bez blokady). Kadruje wersję wyświetlaną: po przycięciu nie
  da się wrócić do szerszego kadru bez ponownego wgrania pliku. Świadoma decyzja —
  trzymanie oryginałów mnożyłoby pliki na dysku.
- **Podpis** — edycja `figcaption`; pusty podpis usuwa element.
- **Usuń** — kasuje całą `<figure>`.

Na ekranach węższych niż 640 px uchwyty zastępują przyciski „węziej / szerzej"
(skok co 5%) — uchwyty w rogach są za małe jako cel dotyku.

Tekst alternatywny nadal pytany przy wstawianiu (dzisiejszy `window.prompt`
zostaje), bo jest wymogiem dostępności.

### Widok kursantki

- **`LessonPlayer.tsx`** — style dla `.academy-figure`: oblewanie z marginesami,
  wygląd podpisu, a poniżej 640 px wyłączenie oblewania i rozciągnięcie obrazu na
  pełną szerokość.
- **`LessonPlayer.tsx:139`** — do `ADD_ATTR` dochodzi `class`. (DOMPurify
  przepuszcza `class` domyślnie, ale lista jest tu jawna — dopisanie usuwa
  zależność od domyślnych ustawień biblioteki.)
- **`CourseDetail.tsx:151`** — **naprawa błędu**: bezpłatny fragment kursu
  sanityzuje `contentHtml` domyślną konfiguracją, więc zdejmuje `style`, `class`
  i `loading`. Obrazy tracą tam układ, a osadzone materiały znikają. Konfiguracja
  sanityzacji wędruje do wspólnego modułu
  `apps/academy-web/src/lib/sanitizeLessonHtml.ts`, używanego w obu miejscach —
  inaczej takie rozjechanie powtórzy się przy następnej zmianie.

## Zdjęcia HEIC — zapasowa ścieżka

Multer przyjmuje dziś `image/heic` i `image/heif`, a sharp po stronie serwera
umie je odczytać. Przeglądarki nie: Safari na iPhonie tak, ale Chrome i Firefox
na Windowsie nie zdekodują HEIC w `<canvas>`. Kadrowanie po stronie przeglądarki
zepsułoby więc wgrywanie zdjęć prosto z iPhone'a na komputerze z Windowsem.

Rozwiązanie: przy nieudanym odczycie pliku okno kadrowania nie otwiera się, tylko
plik idzie na serwer w oryginale, z komunikatem „Tego formatu nie da się
wykadrować w przeglądarce — zdjęcie zostało wgrane w całości. Aby je przyciąć,
zapisz je najpierw jako JPG." Obraz trafia do lekcji bez kadru, ale trafia —
zamiast pustego błędu.

## Obsługa błędów

- Plik nieobsługiwanego typu → komunikat pod przyciskiem, okno kadrowania się nie
  otwiera.
- Limit 5 MB (`config/multer.ts:15`) dotyczy tego, co faktycznie leci na serwer,
  czyli **kadru po przycięciu**. Duże zdjęcia z aparatu przechodzą więc swobodnie,
  bo przeglądarka wysyła już pomniejszony WebP. Limit potrafi jeszcze uderzyć w
  zapasowej ścieżce HEIC opisanej wyżej — wtedy komunikat mówi wprost o rozmiarze.
- Nieudany zapis na serwerze → czytelny komunikat i możliwość ponowienia; kadr nie
  przepada, okno zostaje otwarte.
- Błąd odczytu obrazu w `<canvas>` (uszkodzony plik) → komunikat „Nie udało się
  odczytać tego pliku" zamiast cichej awarii.
- `processAndSaveImage` przy uszkodzonym pliku rzuca błędem sharpa — kontroler
  zwraca wtedy 400 z komunikatem po polsku, a nie 500.

## Testy

Testy jednostkowe (vitest, bez przeglądarki) dla logiki, która daje się wydzielić:

- `cropImage.test.ts` — `cropAreaToPixels`: zaokrąglanie, przycinanie do granic
  obrazu, obraz mniejszy od ramki kadru, wartości skrajne (0%, 100%).
- `lessonFigure.test.ts` — `buildFigureHtml` / `readFigureLayout` /
  `applyFigureLayout`: pełny obieg tam i z powrotem dla każdego układu,
  ograniczanie szerokości do 10–100, wymuszenie 100% dla `full`, brak podpisu,
  ucieczka znaków specjalnych w podpisie i tekście alternatywnym.
- `sanitizeLessonHtml.test.ts` — przepuszczenie `class`, `style`, `figure`,
  `figcaption` i dozwolonych ramek `iframe`; odrzucenie `<script>`, `onerror` i
  adresów spoza dozwolonych źródeł.
- Test kontrolera po stronie serwera — `folder` spoza listy nie zmienia katalogu
  zapisu (ochrona przed wyjściem poza katalog).

Kontrola ręczna w studiu: wgranie okładki, zdjęcia prowadzącej i obrazu w lekcji;
sprawdzenie układu w widoku kursantki oraz w bezpłatnym fragmencie na stronie kursu.

## Pliki

Nowe:
- `apps/academy-web/src/components/ImageCropDialog.tsx`
- `apps/academy-web/src/components/RichTextEditor.tsx` (przeniesiony z `AcademyStudio.tsx`)
- `apps/academy-web/src/hooks/useImageUpload.ts`
- `apps/academy-web/src/lib/cropImage.ts` + test
- `apps/academy-web/src/lib/lessonFigure.ts` + test
- `apps/academy-web/src/lib/sanitizeLessonHtml.ts` + test

Zmieniane:
- `apps/academy-web/src/pages/AcademyStudio.tsx` — okładka, wyjęcie `RichTextEditor`
- `apps/academy-web/src/pages/admin/AdminInstructors.tsx` — zdjęcie prowadzącej
- `apps/academy-web/src/pages/LessonPlayer.tsx` — sanityzacja, style figur
- `apps/academy-web/src/pages/CourseDetail.tsx` — naprawa sanityzacji
- `apps/academy-web/src/api/academy.api.ts` — parametr `folder` w uploadzie
- `apps/academy-web/package.json` — `react-easy-crop`
- `apps/academy-web/src/index.css` — style `.academy-figure` (tam mieszkają już
  `.rich-editor` i `.studio-card`)
- `apps/server/src/modules/academy/lessons/lessons.controller.ts` — biała lista folderów

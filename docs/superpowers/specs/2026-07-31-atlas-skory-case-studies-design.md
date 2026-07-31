# Atlas Skory & Interaktywne Case Studies — Design Spec

## Cel

Wyroznic akademie na tle konkurencji (WordPress-based platformy bez interaktywnosci) poprzez dwie unikalne funkcje:
1. **Atlas Skory** — interaktywna encyklopedia problemow skornych z trybem quizowym
2. **Interaktywne Case Studies** — symulacje diagnostyczne krok po kroku

Obie funkcje dostepne tylko dla kursantek z dostepem do min. 1 kursu (premium content).

## Analiza konkurencji

Zbadane platformy: akademiakosmetologii.com, skincliniq.pl, kursykosmetyczneonline.pl, akademia-ack.pl, stylstudio.eu. Zadna nie oferuje interaktywnych case studies, atlasu skory, quizow diagnostycznych ze zdjeciami ani gamifikacji. Wszystkie oparte na WordPress/WooCommerce.

---

## Modul 1: Atlas Skory

### Koncept

Interaktywna encyklopedia z dwoma trybami:
- **Tryb przegladania** — mapa ciala (zdjecie z hotspotami) -> regiony -> problemy skorne z opisami, zdjeciami i wskazaniami zabiegowymi
- **Tryb quizowy** — kursantka widzi zdjecie i musi rozpoznac problem, wybrac zabieg, ocenic stopien nasilenia

### Struktura danych (Prisma)

```
SkinAtlasRegion
  - id: Int @id
  - name: String (np. "Twarz", "Stopy", "Dekolt", "Cialo")
  - slug: String @unique
  - thumbnailUrl: String (zdjecie-miniaturka regionu)
  - hotspotX: Float (pozycja pinu na mapie ciala, %)
  - hotspotY: Float
  - order: Int
  - conditions: SkinAtlasCondition[]

SkinAtlasCondition
  - id: Int @id
  - regionId: Int -> SkinAtlasRegion
  - name: String (np. "Tradzik grudkowy")
  - slug: String @unique
  - description: String (rich text — opis kliniczny)
  - causes: String (rich text — przyczyny)
  - treatments: String (rich text — wskazania zabiegowe)
  - contraindications: String (rich text — przeciwwskazania)
  - order: Int
  - images: SkinAtlasImage[]
  - quizQuestions: SkinAtlasQuizQuestion[]
  - relatedCourseId: Int? -> AcademyCourse (cross-sell)

SkinAtlasImage
  - id: Int @id
  - conditionId: Int -> SkinAtlasCondition
  - url: String
  - alt: String
  - severity: Enum (MILD, MODERATE, SEVERE)
  - order: Int

SkinAtlasQuizQuestion
  - id: Int @id
  - conditionId: Int -> SkinAtlasCondition
  - questionText: String
  - questionImageUrl: String? (zdjecie do rozpoznania)
  - explanation: String (wyjasnienie po odpowiedzi)
  - order: Int
  - answers: SkinAtlasQuizAnswer[]

SkinAtlasQuizAnswer
  - id: Int @id
  - questionId: Int -> SkinAtlasQuizQuestion
  - text: String
  - isCorrect: Boolean
  - order: Int
```

### Mapa ciala

- Wysokiej jakosci zdjecie stockowe ciala (neutralne tlo, profesjonalne oswietlenie)
- Hotspoty (piny) nalozane na zdjecie via CSS position: absolute z procentowymi wspolrzednymi
- Admin ustawia pozycje pinow (X%, Y%) per region
- Hover na pinie -> tooltip z nazwa regionu i liczba problemow
- Click -> przejscie do listy problemow

Mobile: zamiast zdjecia z pinami -> lista regionow jako karty z miniaturkami (lepszy UX na malym ekranie)

### Trasy

```
/akademia/atlas                        -> mapa ciala
/akademia/atlas/:region                -> lista problemow regionu
/akademia/atlas/:region/:condition     -> karta problemu
/akademia/atlas/quiz                   -> quiz (losowe pytania, wszystkie regiony)
/akademia/atlas/quiz/:region           -> quiz z konkretnego regionu
```

### Panel admina

- CRUD regionow (nazwa, slug, miniaturka, pozycja hotspota)
- CRUD problemow skornych per region (opis, przyczyny, zabiegi, przeciwwskazania)
- Upload zdjec z tagowaniem stopnia nasilenia (MILD/MODERATE/SEVERE)
- Edytor pytan quizowych per problem (pytanie + opcjonalne zdjecie + 4 odpowiedzi + wyjasnienie)
- Powiazywanie problemow z kursami (dropdown)
- Podglad mapy z hotspotami

### UI Desktop — mapa ciala

```
+--------------------------------------------------+
|  Atlas Skory                    [Quiz mode]       |
+--------------------------------------------------+
|                                                    |
|   +------------------+   +---------------------+  |
|   |                  |   | Regiony:            |  |
|   |   [zdjecie ciala |   |                     |  |
|   |    z pinami]     |   |  Twarz (12)         |  |
|   |                  |   |  Dekolt (5)         |  |
|   |    * <- pin      |   |  Cialo (8)          |  |
|   |                  |   |  Stopy (7)          |  |
|   |                  |   |                     |  |
|   |                  |   | Lacznie 32          |  |
|   |                  |   | problemow skornych  |  |
|   +------------------+   +---------------------+  |
+--------------------------------------------------+
```

### UI Desktop — karta problemu

```
+--------------------------------------------------+
| <- Twarz / Tradzik grudkowy                       |
+--------------------------------------------------+
| +---------+ +---------+ +---------+               |
| | lekki   | | sredni  | | ciezki  |  <- galeria   |
| | [foto]  | | [foto]  | | [foto]  |  nasilenia    |
| +---------+ +---------+ +---------+               |
|                                                    |
| Opis kliniczny                                    |
| Lorem ipsum dolor sit amet...                     |
|                                                    |
| Przyczyny          | Wskazania zabiegowe           |
| - Hormonalne       | - Peeling chemiczny           |
| - Bakteryjne       | - Mezoterapia                 |
| - Kosmetyczne      | - Oczyszczanie                |
|                                                    |
| Przeciwwskazania                                  |
| - Aktywna opryszczka  - Ciaza                     |
|                                                    |
| +---------------------------------------------+   |
| | Naucz sie to leczyc                          |   |
| | Kurs: Zabiegi na twarz -- od 299 zl          |   |
| +---------------------------------------------+   |
|                                                    |
| [Sprawdz sie w quizie ->]                         |
+--------------------------------------------------+
```

---

## Modul 2: Interaktywne Case Studies

### Koncept

Symulacja diagnostyczna — kursantka wchodzi w role kosmetyczki. Dostaje opis klientki + zdjecia i podejmuje decyzje krok po kroku. Po kazdym kroku dostaje feedback.

### Przebieg (3-4 kroki)

```
Krok 1: WYWIAD
  Opis klientki (wiek, skora, problem, oczekiwania) + zdjecia before
  Pytanie: "Jaki typ skory rozpoznajesz?" (single choice)

Krok 2: DIAGNOZA
  Feedback z kroku 1 + dodatkowe info
  Pytanie: "Jakie problemy skorne widzisz?" (multi choice)

Krok 3: PLAN ZABIEGOWY
  Feedback z kroku 2
  Pytanie: "Jaki zabieg zaproponujesz?" (single/multi choice)

Krok 4: WYNIK
  Feedback z kroku 3 + zdjecia after
  + wyjasnienie instruktorki (tekst/wideo)
  + podsumowanie z ocena (ile krokow dobrze)
  + link do powiazanego kursu
```

### Struktura danych (Prisma)

```
CaseStudy
  - id: Int @id
  - title: String
  - description: String
  - thumbnailUrl: String?
  - difficulty: Enum (EASY, MEDIUM, HARD)
  - regionSlug: String? (powiazanie z atlasem)
  - courseId: Int? -> AcademyCourse (cross-sell)
  - published: Boolean @default(false)
  - order: Int
  - clientName: String (np. "Anna")
  - clientAge: Int
  - clientDescription: String (rich text — historia, oczekiwania)
  - steps: CaseStudyStep[]
  - attempts: CaseStudyAttempt[]

CaseStudyStep
  - id: Int @id
  - caseStudyId: Int -> CaseStudy
  - type: Enum (INTERVIEW, DIAGNOSIS, TREATMENT, RESULT)
  - content: String (rich text — tresc kroku)
  - imageUrls: String[] (zdjecia before/during/after)
  - question: String?
  - multiSelect: Boolean @default(false)
  - order: Int
  - answers: CaseStudyAnswer[]

CaseStudyAnswer
  - id: Int @id
  - stepId: Int -> CaseStudyStep
  - text: String
  - isCorrect: Boolean
  - explanation: String? (wyjasnienie po wyborze)
  - order: Int

CaseStudyAttempt
  - id: Int @id
  - caseStudyId: Int -> CaseStudy
  - userId: Int
  - score: Int (ile krokow poprawnie)
  - maxScore: Int (ile krokow lacznie)
  - completedAt: DateTime
  - answers: Json (zapis odpowiedzi per krok)
```

### Gdzie case studies zyja w UI

- Zakladka w kursie (obok lekcji i quizow) — `/akademia/kurs/:slug/przypadki`
- Tryb interaktywny pelnoekranowy — `/akademia/kurs/:slug/przypadek/:id`
- Na stronie sprzedazowej kursu: "Ten kurs zawiera X interaktywnych case studies" jako element wartosci

### Panel admina

- Kreator case study: dane klientki + kroki (drag & drop kolejnosci)
- Per krok: typ, tresc rich text, upload zdjec, pytanie + odpowiedzi z wyjasnienami
- Podglad calego flow przed publikacja
- Statystyki: ile kursantek ukonczylo, sredni wynik

### UI — tryb interaktywny

```
+--------------------------------------------------+
| Case Study: Klientka z przebarwieniami   1/4      |
| ================----  Krok 1: Wywiad              |
+--------------------------------------------------+
|                                                    |
| Anna, 34 lata                                     |
| "Przyszla z problemem ciemnych plam na            |
|  policzkach po ciazy. Nie stosowala filtrow."     |
|                                                    |
| +------------+ +------------+                      |
| | [before    | | [before    |                      |
| |  foto 1]   | |  foto 2]   |                      |
| +------------+ +------------+                      |
|                                                    |
| Jaki typ skory rozpoznajesz?                      |
|                                                    |
| ( ) Sucha z tendencja do podraznien               |
| (*) Mieszana z przebarwieniami                    |
| ( ) Tlusta z tradzikiem                           |
| ( ) Naczynkowa wrazliwa                           |
|                                                    |
|                         [Sprawdz odpowiedz ->]    |
+--------------------------------------------------+
```

---

## Integracja z istniejaca platforma

### Cross-sell

- Atlas -> kurs: problem skorny linkuje do powiazanego kursu ("Naucz sie to leczyc")
- Atlas -> case study: problem skorny linkuje do case study ("Sprawdz sie w praktyce")
- Case study -> kurs: ekran wyniku linkuje do kursu ("Chcesz poglebic wiedze?")
- Case study -> atlas: ekran wyniku linkuje do problemu ("Zobacz w atlasie")
- Kurs -> case studies: strona sprzedazowa pokazuje liczbe case studies

### Dostepnosc

- Niezalogowani: na stronie sprzedazowej widza info "Dostep do Atlasu Skory i interaktywnych case studies w cenie kursu"
- Zalogowani bez kursu: widza info o braku dostepu z CTA do zakupu
- Zalogowani z kursem: pelny dostep do atlasu i case studies powiazanych z ich kursami

### Nowe elementy na AcademyCatalog (strona glowna)

- Sekcja "Ucz sie inaczej" — 3 karty: Atlas Skory / Case Studies / Quizy diagnostyczne
- W CourseCard: badge "X case studies" obok "X lekcji"
- W FAQ: "Czym jest Atlas Skory?"

### Backend — nowe moduly

```
apps/server/src/modules/academy/
  +-- skin-atlas/
  |   +-- skin-atlas.router.ts
  |   +-- skin-atlas.controller.ts
  |   +-- skin-atlas.service.ts
  +-- case-studies/
      +-- case-studies.router.ts
      +-- case-studies.controller.ts
      +-- case-studies.service.ts
```

Endpointy montowane pod `/api/academy/atlas/*` i `/api/academy/case-studies/*`.

### Frontend — nowe komponenty

```
apps/academy-web/src/
  +-- pages/
  |   +-- atlas/
  |   |   +-- SkinAtlasMap.tsx        (mapa ciala z hotspotami)
  |   |   +-- SkinAtlasRegion.tsx     (lista problemow regionu)
  |   |   +-- SkinAtlasCondition.tsx  (karta problemu)
  |   |   +-- SkinAtlasQuiz.tsx       (tryb quizowy)
  |   +-- case-studies/
  |       +-- CaseStudyList.tsx       (lista case studies kursu)
  |       +-- CaseStudyPlayer.tsx     (interaktywny tryb krokowy)
  +-- admin/
      +-- AdminSkinAtlas.tsx          (CRUD atlasu)
      +-- AdminCaseStudies.tsx        (kreator case studies)
```

### Trasy

```
Public (wymagaja auth + dostep do kursu):
/akademia/atlas                        -> SkinAtlasMap
/akademia/atlas/:region                -> SkinAtlasRegion
/akademia/atlas/:region/:condition     -> SkinAtlasCondition
/akademia/atlas/quiz                   -> SkinAtlasQuiz
/akademia/atlas/quiz/:region           -> SkinAtlasQuiz (filtrowany)
/akademia/kurs/:slug/przypadki         -> CaseStudyList
/akademia/kurs/:slug/przypadek/:id     -> CaseStudyPlayer

Admin:
/admin/atlas                           -> AdminSkinAtlas
/admin/przypadki                       -> AdminCaseStudies
```

---

## Poza zakresem (swiadome wykluczenia)

- System mentorski (przesylanie zdjec z zabiegow do oceny)
- Live Q&A sesje
- AI skin analyzer (moze w przyszlosci)
- Spolecznosc/forum absolwentek
- Program ambasadorski w akademii (juz istnieje w glownej aplikacji)

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

Wszystkie ID sa typu `String @id @default(cuid())` — zgodnie z konwencja projektu.
Wszystkie modele maja `createdAt DateTime @default(now())` i `updatedAt DateTime @updatedAt`.

```
SkinAtlasRegion
  - id: String @id @default(cuid())
  - name: String (np. "Twarz", "Stopy", "Dekolt", "Cialo")
  - slug: String @unique
  - thumbnailUrl: String (zdjecie-miniaturka regionu)
  - hotspotX: Float (pozycja pinu na mapie ciala, %)
  - hotspotY: Float
  - order: Int
  - published: Boolean @default(false)
  - conditions: SkinAtlasCondition[]
  - createdAt: DateTime @default(now())
  - updatedAt: DateTime @updatedAt

SkinAtlasCondition
  - id: String @id @default(cuid())
  - regionId: String -> SkinAtlasRegion
  - name: String (np. "Tradzik grudkowy")
  - slug: String @unique
  - description: String (rich text — opis kliniczny)
  - causes: String (rich text — przyczyny)
  - treatments: String (rich text — wskazania zabiegowe)
  - contraindications: String (rich text — przeciwwskazania)
  - order: Int
  - published: Boolean @default(false)
  - images: SkinAtlasImage[]
  - quizQuestions: SkinAtlasQuizQuestion[]
  - relatedCourseId: String? -> AcademyCourse (cross-sell)
  - relatedCaseStudyId: String? -> DiagnosticCaseStudy (cross-sell do case study)
  - createdAt: DateTime @default(now())
  - updatedAt: DateTime @updatedAt
  - @@index([regionId])

SkinAtlasImage
  - id: String @id @default(cuid())
  - conditionId: String -> SkinAtlasCondition
  - url: String
  - alt: String
  - severity: Enum (MILD, MODERATE, SEVERE)
  - order: Int
  - @@index([conditionId])

SkinAtlasQuizQuestion
  - id: String @id @default(cuid())
  - conditionId: String -> SkinAtlasCondition
  - questionText: String
  - questionImageUrl: String? (zdjecie do rozpoznania)
  - explanation: String (wyjasnienie po odpowiedzi)
  - order: Int
  - answers: SkinAtlasQuizAnswer[]
  - @@index([conditionId])

SkinAtlasQuizAnswer
  - id: String @id @default(cuid())
  - questionId: String -> SkinAtlasQuizQuestion
  - text: String
  - isCorrect: Boolean
  - order: Int
  - @@index([questionId])

SkinAtlasQuizAttempt
  - id: String @id @default(cuid())
  - userId: String -> AcademyUser
  - regionSlug: String? (null = quiz ze wszystkich regionow)
  - score: Int
  - maxScore: Int
  - answers: Json (shape: { questionId: string, selectedAnswerId: string, correct: boolean }[])
  - completedAt: DateTime @default(now())
  - @@index([userId])
```

### Mapa ciala

- Wysokiej jakosci zdjecie stockowe ciala (neutralne tlo, profesjonalne oswietlenie)
- Hotspoty (piny) nalozane na zdjecie via CSS position: absolute z procentowymi wspolrzednymi
- Admin ustawia pozycje pinow (X%, Y%) per region
- Hover na pinie -> tooltip z nazwa regionu i liczba problemow
- Click -> przejscie do listy problemow
- Zdjecia uploadowane przez istniejacy `processAndSaveImage` -> katalog `/uploads`

Mobile (breakpoint < 768px): zamiast zdjecia z pinami -> lista regionow jako karty z miniaturkami (lepszy UX na malym ekranie)

### Trasy

Slug `quiz` jest zarezerwowany i nie moze byc uzyty jako slug regionu (walidacja w adminie).
Trasy w routerze musza byc zdefiniowane w kolejnosci: statyczne (`quiz/*`) przed dynamicznymi (`:region`).

```
/akademia/atlas                        -> mapa ciala
/akademia/atlas/quiz                   -> quiz (losowe pytania, wszystkie regiony)
/akademia/atlas/quiz/:region           -> quiz z konkretnego regionu
/akademia/atlas/:region                -> lista problemow regionu
/akademia/atlas/:region/:condition     -> karta problemu
```

### Panel admina

Trasy admina zyja w apps/academy-web (nie w apps/web):

```
/admin/atlas         -> AdminSkinAtlas
/admin/przypadki     -> AdminCaseStudies
```

Funkcje:
- CRUD regionow (nazwa, slug, miniaturka, pozycja hotspota, published)
- CRUD problemow skornych per region (opis, przyczyny, zabiegi, przeciwwskazania, published)
- Upload zdjec z tagowaniem stopnia nasilenia (MILD/MODERATE/SEVERE) — uzywa `processAndSaveImage`
- Edytor pytan quizowych per problem (pytanie + opcjonalne zdjecie + 4 odpowiedzi + wyjasnienie)
- Powiazywanie problemow z kursami i case studies (dropdown)
- Podglad mapy z hotspotami
- Walidacja: slug regionu nie moze byc "quiz"; name min 2 znaki; description min 10 znakow

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

Przycisk "Quiz mode" to link nawigacyjny do `/akademia/atlas/quiz` (osobna trasa, nie in-page toggle).

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

Nazwa modelu: `DiagnosticCaseStudy` (nie `CaseStudy`) — unikamy kolizji z istniejacym `LessonCaseStudy`.

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
  UWAGA: step.type === RESULT nie ma pytania — frontend pomija renderowanie
  odpowiedzi. Pole question jest null, answers[] jest puste.
```

### Struktura danych (Prisma)

```
DiagnosticCaseStudy
  - id: String @id @default(cuid())
  - title: String
  - description: String
  - thumbnailUrl: String?
  - difficulty: Enum DiagnosticDifficulty (EASY, MEDIUM, HARD)
  - regionSlug: String? (powiazanie z atlasem)
  - courseId: String? -> AcademyCourse (cross-sell, okresla tez dostep)
  - published: Boolean @default(false)
  - order: Int
  - clientName: String (np. "Anna")
  - clientAge: Int
  - clientDescription: String (rich text — historia, oczekiwania)
  - steps: DiagnosticCaseStep[]
  - attempts: DiagnosticCaseAttempt[]
  - createdAt: DateTime @default(now())
  - updatedAt: DateTime @updatedAt
  - @@index([courseId])

DiagnosticCaseStep
  - id: String @id @default(cuid())
  - caseStudyId: String -> DiagnosticCaseStudy
  - type: Enum DiagnosticStepType (INTERVIEW, DIAGNOSIS, TREATMENT, RESULT)
  - content: String (rich text — tresc kroku)
  - question: String? (null dla RESULT)
  - multiSelect: Boolean @default(false)
  - order: Int
  - answers: DiagnosticCaseAnswer[]
  - images: DiagnosticCaseStepImage[]
  - @@index([caseStudyId])

DiagnosticCaseStepImage
  - id: String @id @default(cuid())
  - stepId: String -> DiagnosticCaseStep
  - url: String
  - alt: String?
  - type: Enum DiagnosticImageType (BEFORE, DURING, AFTER)
  - order: Int
  - @@index([stepId])

DiagnosticCaseAnswer
  - id: String @id @default(cuid())
  - stepId: String -> DiagnosticCaseStep
  - text: String
  - isCorrect: Boolean
  - explanation: String? (wyjasnienie po wyborze)
  - order: Int
  - @@index([stepId])

DiagnosticCaseAttempt
  - id: String @id @default(cuid())
  - caseStudyId: String -> DiagnosticCaseStudy
  - userId: String -> AcademyUser
  - score: Int (ile krokow poprawnie)
  - maxScore: Int (ile krokow lacznie)
  - startedAt: DateTime @default(now())
  - completedAt: DateTime? (null = w trakcie lub porzucone)
  - answers: Json
  - @@index([userId])
  - @@index([caseStudyId])
```

Ksztalt `answers` Json:
```json
[
  {
    "stepId": "clxyz...",
    "selectedAnswerIds": ["clxyz..."],
    "correct": true
  }
]
```

### Wznawianie sesji (v1)

Case study NIE wspiera wznawiania w v1 — jesli kursantka zamknie przegladarke w polowie, zaczyna od nowa. Stan krokow trzymany w React state (nie w bazie). `DiagnosticCaseAttempt` tworzony dopiero po ukonczeniu wszystkich krokow. To akceptowalne bo case study ma 3-4 krotkie kroki (< 5 minut).

### Gdzie case studies zyja w UI

- Zakladka w kursie (obok lekcji i quizow) — `/akademia/kurs/:slug/przypadki`
- Tryb interaktywny pelnoekranowy — `/akademia/kurs/:slug/przypadek/:id`
- Na stronie sprzedazowej kursu: "Ten kurs zawiera X interaktywnych case studies" jako element wartosci

### Dostep do case studies

Case studies sa course-specific: kursantka widzi i moze grac tylko case studies powiazane z kursami ktore posiada (`DiagnosticCaseStudy.courseId` musi odpowiadac zakupionemu kursowi). Backend weryfikuje dostep per courseId.

### Panel admina

- Kreator case study: dane klientki + kroki (drag & drop kolejnosci)
- Per krok: typ, tresc rich text, upload zdjec (z tagowaniem BEFORE/DURING/AFTER), pytanie + odpowiedzi z wyjasnienami
- Podglad calego flow przed publikacja
- Statystyki: ile kursantek ukonczylo, sredni wynik
- Walidacja: min 2 kroki, ostatni krok musi byc RESULT, title min 3 znaki

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

- Atlas -> kurs: `SkinAtlasCondition.relatedCourseId` linkuje do kursu ("Naucz sie to leczyc")
- Atlas -> case study: `SkinAtlasCondition.relatedCaseStudyId` linkuje do case study ("Sprawdz sie w praktyce")
- Case study -> kurs: ekran wyniku linkuje do `DiagnosticCaseStudy.courseId` ("Chcesz poglebic wiedze?")
- Case study -> atlas: ekran wyniku linkuje do problemu via `DiagnosticCaseStudy.regionSlug` ("Zobacz w atlasie")
- Kurs -> case studies: strona sprzedazowa pokazuje liczbe case studies

### Kontrola dostepu

Trzy stany uzytkownika na stronach atlasu i case studies:

1. **Niezalogowany**: redirect do `/logowanie` z return URL
2. **Zalogowany bez zadnego kursu**: strona "Brak dostepu" z opisem atlasu/case studies + CTA "Zobacz kursy" -> katalog. Frontend rozpoznaje ten stan po 403 z backendu (middleware `academyRequireAnyPurchase`).
3. **Zalogowany z kursem**: pelny dostep do atlasu; dostep do case studies powiazanych z posiadanymi kursami

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
  +-- diagnostic-cases/
      +-- diagnostic-cases.router.ts
      +-- diagnostic-cases.controller.ts
      +-- diagnostic-cases.service.ts
```

Endpointy montowane pod `/api/academy/atlas/*` i `/api/academy/diagnostic-cases/*`.
Zdjecia uploadowane przez istniejacy `processAndSaveImage` -> katalog `/uploads`.

### Frontend — nowe komponenty

Wszystkie w apps/academy-web/src/:

```
pages/
  +-- atlas/
  |   +-- SkinAtlasMap.tsx        (mapa ciala z hotspotami)
  |   +-- SkinAtlasRegion.tsx     (lista problemow regionu)
  |   +-- SkinAtlasCondition.tsx  (karta problemu)
  |   +-- SkinAtlasQuiz.tsx       (tryb quizowy)
  +-- case-studies/
      +-- CaseStudyList.tsx       (lista case studies kursu)
      +-- CaseStudyPlayer.tsx     (interaktywny tryb krokowy)

admin/
  +-- AdminSkinAtlas.tsx          (CRUD atlasu)
  +-- AdminCaseStudies.tsx        (kreator case studies)
```

### Trasy

```
Public (wymagaja auth + min. 1 kurs):
/akademia/atlas                        -> SkinAtlasMap
/akademia/atlas/quiz                   -> SkinAtlasQuiz (statyczna przed dynamiczna!)
/akademia/atlas/quiz/:region           -> SkinAtlasQuiz (filtrowany)
/akademia/atlas/:region                -> SkinAtlasRegion
/akademia/atlas/:region/:condition     -> SkinAtlasCondition

Public (wymagaja auth + dostep do konkretnego kursu):
/akademia/kurs/:slug/przypadki         -> CaseStudyList
/akademia/kurs/:slug/przypadek/:id     -> CaseStudyPlayer

Admin (w apps/academy-web):
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
- Wznawianie case study w polowie sesji (v1 — case study trwa < 5 min)

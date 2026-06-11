# Marketing Tabs - Pozostale zakladki - Design Spec
Date: 2026-06-11
Scope: Zakładki 3-8 (Karuzele, Trendy, Opisy, Lista nagran, Kampanie, Wyniki)

## Kontekst

Rozszerzenie istniejacego modulu Marketing w panelu admina COSMO. Zakladki 1-2 (Kalendarz + Rolki) sa juz zaimplementowane. Ten spec obejmuje pozostale 6 zakładek, ktore aktualnie pokazuja placeholder "Wkrotce".

## Decyzje projektowe

| Decyzja | Wybor | Uzasadnienie |
|---------|-------|--------------|
| Architektura | Nowe modele per zakladka | Rolki i Karuzele maja rozne pola (hook/audio vs slideDesc), separacja koncepcyjna |
| Backend | Rozszerzenie istniejacego marketing.service/router | Nie tworzymy nowego modulu, dodajemy do istniejacego |
| Testy | Rozszerzenie marketing.service.test.ts | Jeden plik testowy na caly modul marketing |
| Karuzele/schedule | Guard 409 jak w Rolkach | Ten sam wzorzec: sprawdz czy idea ma juz ContentPost |

## Architektura danych

### Nowe modele do dodania w `apps/server/prisma/schema.prisma`

```prisma
model KaruzelaIdea {
  id          String        @id @default(cuid())
  title       String
  slideDesc   String?
  category    IdeaCategory
  status      IdeaStatus
  plannedDate DateTime?
  postId      String?       @unique
  post        ContentPost?  @relation(fields: [postId], references: [id])
  nagranie    NagranieItem?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Trend {
  id        String         @id @default(cuid())
  name      String
  platform  SocialPlatform
  link      String?
  status    TrendStatus
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model OpisPost {
  id        String       @id @default(cuid())
  title     String
  content   String
  hashtags  String?
  category  IdeaCategory
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model NagranieItem {
  id         String         @id @default(cuid())
  title      String
  rolkaId    String?
  rolka      RolkaIdea?     @relation(fields: [rolkaId], references: [id])
  karuzelaId String?
  karuzela   KaruzelaIdea?  @relation(fields: [karuzelaId], references: [id])
  status     NagranieStatus
  priority   Priority
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
}

model Kampania {
  id        String         @id @default(cuid())
  name      String
  goal      String?
  dateFrom  DateTime?
  dateTo    DateTime?
  platform  SocialPlatform
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model WynikPost {
  id          String         @id @default(cuid())
  postId      String?        @unique
  post        ContentPost?   @relation(fields: [postId], references: [id])
  title       String
  platform    SocialPlatform
  publishedAt DateTime
  reach       Int?
  views       Int?
  likes       Int?
  comments    Int?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}
```

### Nowe enumy

```prisma
enum TrendStatus    { AKTYWNY PRZETERMINOWANY }
enum NagranieStatus { DO_NAGRANIA NAGRANE }
enum Priority       { NISKI SREDNI WYSOKI }
```

### Modyfikacje istniejacych modeli

```prisma
// Do RolkaIdea dodac:
nagranie NagranieItem?

// Do ContentPost dodac:
karuzela  KaruzelaIdea?
wynik     WynikPost?
```

### Migracja

```bash
cd cosmo-app/apps/server
pnpm prisma:migrate   # prisma migrate dev --name marketing_remaining_tabs
pnpm prisma:generate
```

## Backend

### Rozszerzenie istniejacego modulu `marketing`

Pliki do modyfikacji (nie tworzone od zera):
```
apps/server/src/modules/marketing/marketing.service.ts   - dodac ~30 nowych funkcji
apps/server/src/modules/marketing/marketing.controller.ts - dodac ~24 nowe handlery
apps/server/src/modules/marketing/marketing.router.ts    - dodac nowe trasy
apps/server/src/modules/marketing/marketing.service.test.ts - dodac ~30 nowych testow
```

### Nowe endpointy (wszystkie za requireAdmin)

**Karuzele:**
```
GET    /api/marketing/karuzele              lista (query: category, status)
POST   /api/marketing/karuzele              nowy pomysl
PATCH  /api/marketing/karuzele/:id          edycja
DELETE /api/marketing/karuzele/:id          usun
POST   /api/marketing/karuzele/:id/schedule konwertuje na ContentPost (guard 409)
```

**Trendy:**
```
GET    /api/marketing/trendy                lista (query: platform, status)
POST   /api/marketing/trendy
PATCH  /api/marketing/trendy/:id
DELETE /api/marketing/trendy/:id
```

**Opisy:**
```
GET    /api/marketing/opisy                 lista (query: category)
POST   /api/marketing/opisy
PATCH  /api/marketing/opisy/:id
DELETE /api/marketing/opisy/:id
```

**Nagrania:**
```
GET    /api/marketing/nagrania              lista (query: status, priority)
POST   /api/marketing/nagrania
PATCH  /api/marketing/nagrania/:id
DELETE /api/marketing/nagrania/:id
```

**Kampanie:**
```
GET    /api/marketing/kampanie
POST   /api/marketing/kampanie
PATCH  /api/marketing/kampanie/:id
DELETE /api/marketing/kampanie/:id
```

**Wyniki:**
```
GET    /api/marketing/wyniki                lista (query: platform), sort: publishedAt desc
POST   /api/marketing/wyniki
PATCH  /api/marketing/wyniki/:id
DELETE /api/marketing/wyniki/:id
```

### Guard na podwojne schedule (Karuzele)

```typescript
async scheduleKaruzela(karuzelaId: string, data: CreatePostDto) {
  const existing = await prisma.contentPost.findUnique({ where: { karuzelaId } });
  if (existing) throw new AppError('Pomysl jest juz zaplanowany', 409);
  // tworzy ContentPost z karuzelaId
}
```

## Frontend

### Nowe pliki stron

```
apps/web/src/pages/admin/marketing/
  MarketingKaruzele.tsx   - tabela pomyslow, filtry category/status, Zaplanuj/Edytuj/Usun
  MarketingTrendy.tsx     - tabela trendow, badge statusu, klikalne linki
  MarketingOpisy.tsx      - tabela opisow, przycisk Kopiuj (clipboard), badge kategorii
  MarketingNagrania.tsx   - checklist, checkbox inline zmieniajacy status, badge priorytetu
  MarketingKampanie.tsx   - tabela kampanii, zakres dat, badge platformy
  MarketingWyniki.tsx     - tabela wynikow, kolumny liczbowe, sort po dacie
```

### Nowe komponenty modal

```
apps/web/src/components/marketing/
  KaruzelaIdeaModal.tsx   - pola: title, slideDesc, category, status, plannedDate
  TrendModal.tsx          - pola: name, platform, link, status, notes
  OpisModal.tsx           - pola: title, content, hashtags, category
  NagranieModal.tsx       - pola: title, rolkaId (select), karuzelaId (select), status, priority
  KampaniaModal.tsx       - pola: name, goal, dateFrom, dateTo, platform, notes
  WynikModal.tsx          - pola: postId (select opcjonalny), title, platform, publishedAt, reach, views, likes, comments
```

### Modyfikacje istniejacych plikow

```
apps/web/src/types/marketing.types.ts     - nowe typy i label mapy dla 6 zakładek
apps/web/src/api/marketing.api.ts         - nowe funkcje per endpoint
apps/web/src/components/marketing/MarketingTabs.tsx  - available: true dla wszystkich 6
apps/web/src/pages/admin/Marketing.tsx    - import i renderowanie 6 nowych stron
```

### UX per zakladka

**Karuzele:**
- Layout identyczny jak MarketingRolki.tsx
- Kolumny: tytul / kategoria / status / data zaplanowania / akcje
- Akcje: Zaplanuj (otwiera ContentPostModal z format=KARUZELA) / Edytuj / Usun
- Filtry client-side: category, status (useMemo)

**Trendy:**
- Kolumny: nazwa / platforma / link / status / notatki / akcje
- Badge statusu: zielony (AKTYWNY), szary (PRZETERMINOWANY)
- Link w kolumnie jako `<a href={link} target="_blank">` z ikona zewnetrznego linku
- Akcje: Edytuj / Usun

**Opisy:**
- Kolumny: tytul / kategoria / fragment opisu (pierwsze 60 znakow) / akcje
- Akcje: Kopiuj (kopiuje `content + '\n\n' + hashtags` do clipboard) / Edytuj / Usun
- Toast "Skopiowano do schowka" po kliknieciu Kopiuj

**Nagrania:**
- Kolumny: checkbox statusu / tytul / powiazanie (Rolka/Karuzela lub "-") / priorytet / akcje
- Checkbox w kolumnie: klik PATCH status bez otwierania modala
- Badge priorytetu: czerwony (WYSOKI), zolty (SREDNI), szary (NISKI)
- Akcje: Edytuj / Usun

**Kampanie:**
- Kolumny: nazwa / cel / platforma / daty od-do / akcje
- Badge platformy: te same kolory co PLATFORM_COLORS w kalendarzu
- Daty formatowane jako "DD.MM.YYYY - DD.MM.YYYY" (lub "-" jesli brak)
- Akcje: Edytuj / Usun

**Wyniki:**
- Kolumny: tytul/post / platforma / data / zasieg / wyswietlen / polubien / komentarzy / akcje
- Domyslne sortowanie: publishedAt malejaco
- Kolumny liczbowe wyrownane do prawej, brak wartosci jako "-"
- Akcje: Edytuj / Usun

### Mobile

- Wszystkie tabele: ukrycie mniej waznych kolumn na mobile (`hidden md:table-cell`)
- Nagrania mobile: checkbox + tytul + priorytet zawsze widoczne, reszta ukryta

## Przeplywy danych

### Zaplanuj Karuzele

1. Klik "Zaplanuj" przy pomysle karuzeli
2. Otwiera ContentPostModal z wstepnie wypelnionymi polami (tytul z pomyslu, format=KARUZELA)
3. Po zapisie: POST /api/marketing/karuzele/:id/schedule - guard 409, tworzy ContentPost z postId
4. Invalidate queries: ['marketing', 'posts'] i ['marketing', 'karuzele']

### Kopiuj opis

1. Klik "Kopiuj" przy opisie
2. `navigator.clipboard.writeText(content + '\n\n' + hashtags)`
3. Toast "Skopiowano do schowka"

### Zmiana statusu nagrania inline

1. Klik checkbox w tabeli nagran
2. PATCH /api/marketing/nagrania/:id z { status: 'NAGRANE' } lub { status: 'DO_NAGRANIA' }
3. Invalidate ['marketing', 'nagrania']

## Uwagi

- `ContentPost` ma juz relacje do `RolkaIdea` (ideaId) - dodajemy analogicznie `karuzelaId` i `wynikId`
- `WynikPost.postId` ma `@unique` - jeden wynik na jeden post
- `KaruzelaIdea.postId` ma `@unique` - jeden post na jeden pomysl karuzeli
- Enumeracja `IdeaCategory` jest wspolna dla Rolki, Karuzele i Opisy - bez zmian
- `SocialPlatform` (IG/TIKTOK/FB) jest wspolna dla Trendy, Kampanie, Wyniki - bez zmian

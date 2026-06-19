# Marketing Tab - Design Spec
Date: 2026-06-11
Scope: MVP sekcje 1-2 (Kalendarz tygodniowy + Bank pomyslow na rolki)

## Kontekst

Nowa zakladka "Marketing" w panelu admina aplikacji COSMO (salon kosmetyczny Wiktorii w Limanowej). Cel: planowanie contentu social media (IG, TikTok, FB) bezposrednio z panelu administracyjnego.

## Decyzje projektowe

| Decyzja | Wybor | Uzasadnienie |
|---------|-------|--------------|
| Przechowywanie danych | PostgreSQL + Prisma | Dostep z telefonu i laptopa, trwalosc danych |
| Biblioteka kalendarza | FullCalendar (juz zainstalowana) | Drag & drop gotowy, 3 widoki bez dodatkowego kodu, mobilny dotyk |
| Uklad nawigacji | Poziome taby wewnatrz strony | Lepsza mobile UX, brak sidebara na telefonie |
| Styl kart | Kolor tla = platforma + pasek lewy = status | Maksimum informacji jednym rzutem oka |

## Architektura danych

### Nowe modele do dodania w `apps/server/prisma/schema.prisma`

```prisma
model ContentPost {
  id           String         @id @default(cuid())
  title        String
  platform     SocialPlatform
  format       ContentFormat
  scheduledAt  DateTime
  status       ContentStatus
  thumbnailUrl String?
  notes        String?
  ideaId       String?        @unique
  idea         RolkaIdea?     @relation(fields: [ideaId], references: [id])
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model RolkaIdea {
  id          String       @id @default(cuid())
  title       String
  hook        String?
  sceneDesc   String?
  category    IdeaCategory
  type        IdeaType
  audioName   String?
  audioUrl    String?
  props       String?
  status      IdeaStatus
  plannedDate DateTime?
  post        ContentPost?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum SocialPlatform {
  IG
  TIKTOK
  FB
}

enum ContentFormat {
  ROLKA
  KARUZELA
  STORY
  POST
}

enum ContentStatus {
  POMYSL
  SCENARIUSZ
  NAGRANE
  ZMONTOWANE
  OPUBLIKOWANE
}

enum IdeaCategory {
  LAMINACJA
  PEDICURE
  PODOLOGIA
  TWARZ
  BRWI
  INNE
}

enum IdeaType {
  POV
  COMEDY
  EDUKACYJNA
  BEFORE_AFTER
  BLIND_REACTION
  LOOP
}

enum IdeaStatus {
  POMYSL
  SCENARIUSZ
  GOTOWA
  WYKORZYSTANA
}
```

### Migracja (wymagane kroki po dodaniu modeli)

```bash
cd cosmo-app/apps/server
pnpm prisma:migrate   # prisma migrate dev --name marketing
pnpm prisma:generate  # regeneracja klienta Prisma
```

Relacja: `RolkaIdea` 1:1 opcjonalnie z `ContentPost`. Idea "zaplanowana" ma powiazany post przez `ideaId`. Pole `ideaId` ma `@unique` - jeden post na jeden pomysl.

## Backend

### Nowy modul `marketing`

```
apps/server/src/modules/marketing/
  marketing.controller.ts
  marketing.router.ts
  marketing.service.ts
```

### Rejestracja w `apps/server/src/app.ts`

Dodac import i uzycie w tym samym miejscu co pozostale moduly:

```typescript
import marketingRouter from './modules/marketing/marketing.router';
// ...
app.use('/api/marketing', marketingRouter);
```

### Endpointy

Wszystkie trasy za middleware `requireAdmin`.

**Posty (kalendarz):**
```
GET    /api/marketing/posts           lista (query: platform, status, from, to)
POST   /api/marketing/posts           nowy post
PATCH  /api/marketing/posts/:id       edycja (w tym drag & drop = nowy scheduledAt)
DELETE /api/marketing/posts/:id       usun
```

**Pomysly (bank rolek):**
```
GET    /api/marketing/ideas           lista (query: category, type, status, sort)
POST   /api/marketing/ideas           nowy pomysl
PATCH  /api/marketing/ideas/:id       edycja
DELETE /api/marketing/ideas/:id       usun
POST   /api/marketing/ideas/:id/schedule    konwertuje na post w kalendarzu
POST   /api/marketing/ideas/:id/duplicate   duplikuje pomysl
```

### Guard na podwojne schedule

Endpoint `POST /ideas/:id/schedule` musi sprawdzic czy idea ma juz powiazany `ContentPost`:

```typescript
// marketing.service.ts
async scheduleIdea(ideaId: string, data: CreatePostDto) {
  const existing = await prisma.contentPost.findUnique({ where: { ideaId } });
  if (existing) throw new AppError('Pomysl jest juz zaplanowany', 409);
  // ... createContentPost z ideaId
}
```

## Frontend

### Rejestracja trasy w `apps/web/src/router.tsx`

Dodac do tablicy `children` sekcji AdminLayout (razem z pozostalymi trasami `/admin/*`):

```typescript
{ path: 'marketing', element: <Marketing /> }
// import: import { Marketing } from '@/pages/admin/Marketing';
```

### Nowe pliki

```
apps/web/src/
  pages/admin/Marketing.tsx                     - kontener z tabami
  pages/admin/marketing/MarketingKalendar.tsx   - FullCalendar + filtry + modals
  pages/admin/marketing/MarketingRolki.tsx      - tabela pomyslow + filtry + akcje

  components/marketing/MarketingTabs.tsx        - poziome taby (scroll na mobile)
  components/marketing/ContentPostModal.tsx     - formularz dodaj/edytuj post
  components/marketing/RolkaIdeaModal.tsx       - formularz dodaj/edytuj pomysl
  components/marketing/ContentEventCard.tsx     - renderer kart w FullCalendar

  api/marketing.api.ts                          - wszystkie wywolania API
  types/marketing.types.ts                      - typy lokalne (nie w shared)
```

### Konfiguracja FullCalendar

```tsx
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

// Wymagane props:
<FullCalendar
  plugins={[timeGridPlugin, listPlugin, interactionPlugin]}
  editable={true}           // WYMAGANE do drag & drop
  initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
  eventContent={(info) => <ContentEventCard event={info.event} />}
  eventDrop={(info) => handleDrop(info)}
/>
```

**`interactionPlugin` musi byc w tablicy `plugins`** - bez tego drag & drop nie dziala mimo ze paczka jest zainstalowana.

### Przelaczanie widoku na mobile

FullCalendar nie ma wbudowanych breakpointow CSS. Przelaczenie widoku wymaga React-side media query:

```tsx
// w MarketingKalendar.tsx
const isMobile = window.innerWidth < 768;
// lub hook useMediaQuery jesli dostepny w projekcie

<FullCalendar
  initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
  // opcjonalnie: key={isMobile ? 'mobile' : 'desktop'} do wymuszenia re-mount przy zmianie orientacji
/>
```

Na mobile (< 768px) domyslny widok to `listWeek`. Uzytkownik moze reczne przelaczac przez `headerToolbar`.

### Drag & Drop - handler z obsluga bledow

```typescript
const handleDrop = async (info: EventDropArg) => {
  try {
    await marketingApi.updatePost(info.event.id, {
      scheduledAt: info.event.start!.toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ['marketing', 'posts'] });
  } catch {
    info.revert();  // WYMAGANE: cofniecie eventu do oryginalnej pozycji na blad
    toast.error('Nie udalo sie przeniesc publikacji');
  }
};
```

`info.revert()` jest krytyczne - bez niego event zostaje w nowej pozycji wizualnie nawet gdy serwer zwrocil blad.

### Wygladanie kart (ContentEventCard)

- Tlo: `#E1306C` (IG), `#010101` (TikTok), `#4267B2` (FB)
- Pasek lewy 4px: szary=pomysl, zolty=scenariusz, niebieski=nagrane, fioletowy=zmontowane, zielony=opublikowane
- Tresc: tytul + platforma/format/godzina + badge statusu
- Bialy tekst na kolorowym tle

### Taby

Porzadek: Kalendarz / Rolki / Karuzele / Trendy / Opisy / Lista nagran / Kampanie / Wyniki

MVP implementuje: **Kalendarz** + **Rolki**. Pozostale taby pokazuja placeholder "Wkrotce".

### Mobile

- Taby: `overflow-x-auto` z ukrytym scrollbarem (ten sam wzorzec co mobile nav w AdminLayout)
- Tabela rolek: ukrycie mniej waznych kolumn na mobile (`hidden md:table-cell`)

### Integracja z AdminLayout

Nowa sekcja "Marketing" w sidebarze (desktop), wzorzec identyczny jak Akademia:

```tsx
const [marketingOpen, setMarketingOpen] = useState(
  () => location.pathname.startsWith('/admin/marketing')
);

// w nawigacji:
<div>
  <button onClick={() => setMarketingOpen(o => !o)} ...>
    <span>Marketing</span>
    <ChevronDown ... />
  </button>
  {marketingOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/marketing">Planowanie contentu</Link>
    </div>
  )}
</div>
```

Mobile nav: dodac `{ to: '/admin/marketing', label: 'Marketing' }` do tablicy linkow.

## Przeplywy danych

### Zaplanuj pomysl

1. Klik "Zaplanuj" przy pomysle
2. Otwiera `ContentPostModal` z wstepnie wypelnionymi polami (tytul z pomyslu, format=ROLKA)
3. Po zapisie: `POST /api/marketing/ideas/:id/schedule` - serwis sprawdza czy nie ma juz posta (guard 409), tworzy `ContentPost` z `ideaId`
4. Invalidate queries: `['marketing', 'posts']` i `['marketing', 'ideas']`

### Duplikuj pomysl

1. Klik "Duplikuj"
2. `POST /api/marketing/ideas/:id/duplicate`
3. Serwis tworzy nowy rekord z tymi samymi polami, `status=POMYSL`, bez `plannedDate`, bez relacji do posta
4. Invalidate `['marketing', 'ideas']`

## Filtrowanie

Kalendarz: platform (multi-select), status (multi-select) - filtry po stronie klienta przez `events` prop FullCalendar
Tabela rolek: category, type, status - dropdowny + `useMemo` po stronie klienta

## Uwagi na przyszlosc

- Taby 3-8 (Karuzele, Trendy, Opisy, Lista nagran, Kampanie, Wyniki) - placeholder "Wkrotce"
- Widok `dayGridMonth` (miesiac z siatka) wymaga dodania paczki `@fullcalendar/daygrid` - nie ma jej w projekcie, do dodania gdy bedzie potrzebna

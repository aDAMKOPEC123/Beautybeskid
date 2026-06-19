# Design Spec: Podsumowanie Dziennika Kosmetologa

**Data:** 2026-04-10
**Status:** Approved

---

## Kontekst

Dziennik Kosmetologa (`/user/dziennik`) pozwala użytkownikom zapisywać codzienne wpisy o stanie skóry: nastrój (1–5), notatki, zdjęcia, tagi, daty. Kosmetolodzy (admin) mogą dodawać notatki i komentarze do wpisów. Brakuje widoku analitycznego — użytkownik nie ma przeglądu postępów ani trendów w czasie.

---

## Cel

Dodać inteligentne statystyczne podsumowanie dziennika dostępne przez modal, z wybieralnym zakresem czasowym i 4 kategoriami analizy. Bez zależności od zewnętrznych AI API — wszystko obliczane z istniejących danych w PostgreSQL.

---

## Decyzje projektowe

| Decyzja | Wybór | Uzasadnienie |
|---|---|---|
| Typ podsumowania | Statystyczne | Brak zewnętrznych zależności, szybkie, tanie |
| Punkt wejścia | Modal (floating panel) | Nie zakłóca głównego widoku listy wpisów |
| Zakres czasowy | Wybierany (30 dni / 90 dni / Cała historia) | Daje użytkownikowi kontrolę |
| Układ modalu | 4 zakładki | Skupienie na jednej kategorii naraz, czytelność |
| Gdzie obliczenia | Backend (nowy endpoint) | Logika biznesowa poza UI, testowalność, wydajność |
| Dostępność dla admina | Tak | Kosmetolog widzi podsumowanie każdego klienta |

---

## Architektura

### Backend

**Nowe endpointy:**
```
GET /api/skin-journal/summary?range=30|90|all         (user — własne dane, wymaga authenticate)
GET /api/skin-journal/admin/:userId/summary?range=30|90|all  (admin — dowolny userId, wymaga requireAdmin)
```

**Ważne — kolejność tras w routerze:** `GET /summary` musi być zarejestrowany **przed** `PATCH /:id` i `DELETE /:id`, bo Express dopasowałby `/summary` jako `:id = 'summary'`. Analogicznie `GET /admin/:userId/summary` musi być przed `PATCH /admin/:userId/:entryId`. W obu przypadkach trasy statyczne mają wyższy priorytet niż parametryzowane, więc wystarczy dodać je przed odpowiadającymi im wzorcami `:id` / `:entryId`.

Konwencja `/admin/:userId/...` jest spójna z istniejącymi trasami:
- `GET /admin/:userId`
- `POST /admin/:userId`
- `PATCH /admin/:userId/:entryId`
- `DELETE /admin/:userId/:entryId`

**Walidacja `range` w kontrolerze:**
Jeśli `range` nie jest jedną z wartości `['30', '90', 'all']`, kontroler rzuca `new AppError('Nieprawidłowy zakres', 400)`.

**Nowa funkcja w `skin-journal.service.ts`:**

```ts
getSummary(userId: string, range: '30' | '90' | 'all'): Promise<JournalSummary>
```

Logika:
1. Wyznacz `fromDate`: dla `'30'` → dziś minus 30 dni, dla `'90'` → dziś minus 90 dni, dla `'all'` → `null` (bez filtru)
2. Pobierz wszystkie wpisy użytkownika w zakresie (bez paginacji)
3. Oblicz sekcje (szczegóły poniżej)

**Typ odpowiedzi `JournalSummary`:**

```ts
export interface JournalSummary {
  mood: {
    average: number | null;          // null jeśli żaden wpis nie ma mood
    trend: 'rising' | 'falling' | 'stable' | null;  // null jeśli < 2 tygodnie danych
    byWeek: { week: string; avg: number }[];  // week: "YYYY-WNN" (ISO 8601 week, np. "2026-W14")
    distribution: { mood: number; count: number }[];  // mood 1..5, count >= 0
  };
  tags: { tag: string; count: number }[];  // posortowane malejąco po count
  activity: {
    totalEntries: number;
    activeDays: number;        // liczba unikalnych dat z wpisem w zakresie
    totalDays: number;         // liczba dni kalendarzowych w zakresie (dla 'all': od daty pierwszego wpisu do dziś)
    currentStreak: number;     // >= 1 jeśli dziś lub wczoraj jest wpis, 0 w przeciwnym razie
    longestStreak: number;
    afterAppointments: number; // liczba wpisów z linkedAppointmentId != null
  };
  photos: {
    total: number;
    paths: string[];           // max 8, posortowane od najnowszego (date desc)
  };
  range: { from: string; to: string };  // ISO date strings
}
```

**Szczegóły obliczeń:**

**Trend nastroju:**
- Podziel wpisy (posortowane po dacie) na dwie równe połowy
- Oblicz średnią mood pierwszej i drugiej połowy (uwzględnij tylko wpisy z mood != null)
- Warunki null: jeśli łącznie mniej niż 4 wpisy z mood, LUB jeśli którakolwiek połowa nie zawiera ani jednego wpisu z mood → `trend: null`
- Jeśli `avg2 - avg1 >= 0.5` → `'rising'`
- Jeśli `avg1 - avg2 >= 0.5` → `'falling'`
- W przeciwnym razie → `'stable'`

**Agregacja tygodniowa (`byWeek`):**
- Klucz tygodnia: format `"YYYY-WNN"` (ISO 8601 week, np. `"2026-W14"`)
- Użyj `date-fns` funkcji `getISOWeek(date)` i `getISOWeekYear(date)` do obliczenia numeru tygodnia — nie implementuj ręcznie
- Tylko tygodnie z co najmniej jednym wpisem z mood != null
- Posortowane chronologicznie

**Streak (aktualny):**
- Daty wpisów normalizowane do UTC (format `YYYY-MM-DD`)
- "Dziś" = bieżąca data UTC w momencie wywołania
- Streak = liczba kolejnych dni wstecz od dziś (włącznie), dla których istnieje co najmniej jeden wpis
- Jeśli dziś i wczoraj są wpisem: streak >= 2
- Jeśli tylko dziś: streak = 1
- Jeśli tylko wczoraj (dziś brak wpisu): streak = 0 — brak wpisu dziś przerywa łańcuch od dziś
- Definicja precyzyjna: idź wstecz od dziś; pierwszy dzień bez wpisu przerywa łańcuch

**`totalDays`:**
- Dla `range='30'`: 30
- Dla `range='90'`: 90
- Dla `range='all'`: liczba dni od daty `date` najstarszego wpisu do dziś (włącznie), lub 0 jeśli brak wpisów

**`range.from` fallback:**
- Dla `range='all'` gdy brak wpisów: `range.from` = `range.to` = dziś (ISO date string)
- Dla `range='30'` / `range='90'`: `range.from` = dziś minus N dni, `range.to` = dziś

**`photos.paths`:**
- Weź wpisy z `photoPath != null`, posortowane po `date desc`
- Zwróć max 8 pierwszych `photoPath`

**Brak migracji** — endpoint czyta istniejące kolumny `SkinJournalEntry`.

---

### Frontend

#### Nowy komponent `SummaryModal`

**Lokalizacja:** `apps/web/src/components/skin-journal/SummaryModal.tsx`

Jest importowany zarówno przez `SkinJournal.tsx` (user) jak i `UserJournal.tsx` (admin), stąd musi żyć w katalogu shared components.

**Props:**
```ts
interface SummaryModalProps {
  userId?: string;   // przekazywany przez admin; undefined = własne dane usera
  onClose: () => void;
}
```

**Wewnątrz modalu:**
- Dropdown zakresu: `Ostatnie 30 dni | Ostatnie 90 dni | Cała historia` → wartości `'30' | '90' | 'all'`
- Zmiana zakresu = nowy `useQuery(['journal-summary', userId, range], ...)`
- 4 zakładki: `😊 Nastrój | 🏷 Tagi | 📅 Aktywność | 📷 Zdjęcia`

**Zawartość zakładek:**

_Nastrój:_
- Duża liczba: `average` z opisem trendu (badge: `↑ Rosnący` / `↓ Malejący` / `→ Stabilny` / brak jeśli null)
- Wykres słupkowy: `byWeek` (div-based bar chart, brak zewnętrznej biblioteki)
- Rozkład: 5 emoji ze zliczeniami z `distribution`

_Tagi:_
- Pill badges z licznikiem z `tags[]`, posortowane malejąco
- Top 3 w złotym kolorze (#B8913A), reszta szara
- Pusty stan gdy `tags.length === 0`

_Aktywność:_
- 4 kafelki: Wpisów (`totalEntries`) / Streak (`currentStreak` 🔥) / % aktywnych dni (`activeDays/totalDays*100`) / Po wizytach (`afterAppointments`)
- Dodatkowa linia: `Najdłuższy streak: X dni`

_Zdjęcia:_
- Grid miniaturek (max 8, 4 kolumny) z `photos.paths`
- Nagłówek zakładki: `📷 Zdjęcia (${photos.total})`
- Pusty stan gdy `photos.total === 0`

#### Zmiany w `apps/web/src/pages/user/SkinJournal.tsx`

- Przycisk `"📊 Podsumowanie"` w headerze (styl: `background: #fdf6ec`, `border: 1px solid #e8d5a0`, `color: #B8913A`) obok przycisku "Nowy wpis"
- Import i użycie `SummaryModal` (bez `userId` prop — user widzi swoje dane)

#### Zmiany w `apps/web/src/pages/admin/UserJournal.tsx`

- Ten sam przycisk i `SummaryModal` z przekazanym `userId` klienta

#### Zmiany w `apps/web/src/api/skin-journal.api.ts`

Nowy typ eksportowany:
```ts
export type JournalSummary = { ... }  // odzwierciedla JournalSummary z backendu
```

Nowe funkcje w `skinJournalApi`:
```ts
getSummary: async (range: '30' | '90' | 'all'): Promise<JournalSummary> => {
  const res = await api.get(`${BASE}/summary`, { params: { range } });
  return res.data.data;
},

adminGetSummary: async (userId: string, range: '30' | '90' | 'all'): Promise<JournalSummary> => {
  const res = await api.get(`${BASE}/admin/${userId}/summary`, { params: { range } });
  return res.data.data;
},
```

---

## Obsługa błędów i edge cases

- Brak wpisów w zakresie → wszystkie wartości `null` / `0` / `[]`, frontend pokazuje pusty stan per zakładka
- Wpisy bez mood → pomijane przy liczeniu średniej, trendu, byWeek; `average: null` jeśli żaden wpis nie ma mood
- Wpisy bez tagów → pominięte przy agregacji tagów
- Nieprawidłowy `range` → `AppError(400)`

---

## Zakres (co NIE wchodzi)

- Eksport podsumowania do PDF
- Powiadomienia push o postępach
- Rekomendacje zabiegów na podstawie analizy

---

## Pliki do modyfikacji / stworzenia

| Plik | Zmiana |
|---|---|
| `apps/server/src/modules/skin-journal/skin-journal.service.ts` | Nowa funkcja `getSummary` |
| `apps/server/src/modules/skin-journal/skin-journal.controller.ts` | Nowe handlery: `getSummary`, `adminGetSummary` |
| `apps/server/src/modules/skin-journal/skin-journal.router.ts` | Nowe trasy `GET /summary` i `GET /admin/:userId/summary` |
| `apps/web/src/api/skin-journal.api.ts` | Nowy typ `JournalSummary`, nowe funkcje `getSummary`, `adminGetSummary` |
| `apps/web/src/components/skin-journal/SummaryModal.tsx` | **Nowy plik** — shared komponent modalu |
| `apps/web/src/pages/user/SkinJournal.tsx` | Przycisk + import `SummaryModal` |
| `apps/web/src/pages/admin/UserJournal.tsx` | Przycisk + import `SummaryModal` z `userId` |

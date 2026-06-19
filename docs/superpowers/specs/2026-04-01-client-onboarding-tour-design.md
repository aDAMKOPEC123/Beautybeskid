# COSMO — Interaktywny Tour Onboardingowy dla Klienta

**Data:** 2026-04-01
**Status:** Approved

---

## Cel

Nowy klient po pierwszym zalogowaniu otrzymuje interaktywny, krokowy tour podświetlający kluczowe elementy UI aplikacji COSMO. Tour jest branded (kolory/typografia COSMO), można go wznowić z poziomu profilu użytkownika.

---

## Architektura

### Biblioteka
- **driver.js** (MIT, ~30kB) — obsługuje podświetlanie elementów DOM, pozycjonowanie tooltipa, scrollowanie, focus trap, mobile.

### Stan i persystencja
- **TourContext** — React Context z polami: `isActive`, `currentStep`. Metody: `startTour()`, `stopTour()`. Brak `tourId` — jest tylko jeden tour, abstrakcja zbędna.
- **Backend** — nowe pole `onboardingCompleted: Boolean @default(false)` w modelu `User` (Prisma). Po zakończeniu/pominięciu touru `PATCH /api/users/me` z `{ onboardingCompleted: true }` ustawia flagę. Dla przycisku "Powtórz tour" — ten sam endpoint z `{ onboardingCompleted: false }`. Pole akceptuje zarówno `true` jak i `false` od klienta (wyłącznie dla zalogowanego użytkownika).
- **Trigger** — `useEffect` w `UserLayout` z tablicą zależności `[freshUser, startTour]` (wartość z React Query po hydratacji z serwera, nie ze store). Tour startuje tylko gdy `freshUser !== undefined && freshUser.onboardingCompleted === false`. Zależność `startTour` z kontekstu musi być uwzględniona, aby uniknąć stale closure i ostrzeżeń ESLint `exhaustive-deps`.
- **Restart** — przycisk "Powtórz tour" w `/user/profil` wywołuje `PATCH /api/users/me` z `{ onboardingCompleted: false }`, po resolve wywołuje `startTour()`.

### Montowanie TourProvider
`TourProvider` montowany w `apps/web/src/App.tsx`, owijając `<RouterProvider>` — powyżej wszystkich layoutów (`PublicLayout`, `UserLayout`, `AdminLayout`). `router.tsx` eksportuje tablicę konfiguracji tras (nie komponent), więc nie jest miejscem montowania providerów. Dzięki montowaniu w `App.tsx` instancja driver.js nie jest niszczona przy nawigacji między publicznymi i użytkowniczymi trasami podczas trwania touru.

### Konfiguracja kroków
- Plik: `apps/web/src/tours/cosmo-tour.ts`
- Eksportuje tablicę `DriverStep[]`
- Każdy krok: `element` (CSS selector), `popover` (title, description), opcjonalnie `onNextClick`

---

## Nawigacja między stronami (timing)

Przejście między stronami podczas touru wymaga czekania na DOM. Strategia:

1. `onNextClick` wywołuje `router.navigate('/docelowa-strona')`
2. Następnie uruchamia `waitForElement(selector, timeout=3000)` — pomocnicza funkcja polling `querySelector` co 100ms
3. Dopiero po znalezieniu elementu w DOM wywołuje `driverInstance.moveNext()`
4. Jeśli element nie pojawi się w ciągu 3s — krok jest pomijany z logiem w konsoli (nie blokuje całego touru)

```ts
// apps/web/src/tours/utils.ts
export function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const poll = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(poll, 100);
    };
    poll();
  });
}
```

---

## Flow kroków (11 kroków)

| # | Strona | CSS Selector | Opis tooltipa |
|---|--------|--------------|---------------|
| 1 | `/` | *(brak — centered overlay)* | "Witaj w COSMO! Pokażemy Ci jak działa aplikacja" |
| 2 | `/` | `[data-tour="navbar-booking-btn"]` | "Tutaj zarezerwujesz wizytę w kilka kliknięć" |
| 3 | `/uslugi` | `[data-tour="services-list"]` | "Przeglądaj nasze zabiegi i sprawdź szczegóły każdego z nich" |
| 4 | `/rezerwacja` | `[data-tour="booking-wizard"]` | "Nasz kreator poprowadzi Cię przez rezerwację krok po kroku" |
| 5 | `/rezerwacja` | `[data-tour="service-quiz"]` | "Nie wiesz co wybrać? Quiz dobierze zabieg do Twoich potrzeb" |
| 6 | `/user/wizyty` | `[data-tour="appointments-list"]` | "Tutaj znajdziesz wszystkie swoje wizyty — nadchodzące i historyczne" |
| 7 | `/user/lojalnosc` | `[data-tour="loyalty-points-bar"]` | "Zbieraj punkty za każdą wizytę i wymieniaj je na nagrody" |
| 8 | `/user/chat` | `[data-tour="chat-window"]` | "Napisz do nas bezpośrednio — odpowiemy najszybciej jak możemy" |
| 9 | `/user/dziennik` | `[data-tour="skin-journal"]` | "Prowadź swój osobisty dziennik skóry i śledź postępy" |
| 10 | `/user/profil` | `[data-tour="profile-form"]` | "Uzupełnij swój profil i zarządzaj ustawieniami konta" |
| 11 | `/user/profil` | *(brak — centered overlay)* | "To wszystko! Zapraszamy na pierwszą wizytę 💆‍♀️" |

**Uwaga krok 5 (przejście krok 4 → 5, ta sama strona):** Kroki 4 i 5 są na tej samej trasie `/rezerwacja`, więc nie dochodzi do nawigacji — driver.js używa domyślnego `next`. `ServiceQuiz` jest renderowany warunkowo w `BookingWizard`. Aby uniknąć błędu podświetlania ukrytego elementu, krok 4 (`onNextClick`) musi również użyć `waitForElement('[data-tour="service-quiz"]')` przed wywołaniem `driverInstance.moveNext()`. Selector `[data-tour="service-quiz"]` musi być na stałym elemencie wrapper widocznym zawsze (niezależnie od stanu wewnętrznego quizu) — implementator dodaje ten atrybut do kontenera nadrzędnego w `BookingWizard`.

Szacowany czas przejścia: ~2 minuty.

---

## Wygląd (branded COSMO)

driver.js podmieniony domyślny tooltip własnym HTML/CSS:

- **Tło tooltipa:** kremowe/ciepłe (`#FAF7F4`) — spójne z paletą salonu
- **Akcent:** kolor primary z design systemu aplikacji
- **Typografia:** ta sama czcionka co reszta aplikacji
- **Logo COSMO:** małe, w lewym górnym rogu tooltipa
- **Przyciski:** "Dalej →" (primary button), "Pomiń tour" (ghost/link)
- **Licznik kroków:** `3 / 11` w prawym dolnym rogu tooltipa
- **Overlay:** półprzezroczyste ciemne tło z wycięciem na podświetlony element

### Responsywność
driver.js obsługuje mobile natywnie. Na małych ekranach tooltip wyrównany do dołu ekranu.

---

## Zmiany w backendzie

### 1. Prisma schema (`apps/server/prisma/schema.prisma`)
```prisma
model User {
  // ... istniejące pola
  onboardingCompleted Boolean @default(false)
}
```
Wymagana migracja: `pnpm prisma:migrate`.

### 2. Shared types (`packages/shared/src/types/user.types.ts`)
Dodać pole do interfejsu `User`:
```ts
onboardingCompleted: boolean;
```

### 3. `getUserById` select (`apps/server/src/modules/users/users.service.ts`)
Dodać `onboardingCompleted: true` do `select` w funkcji `getUserById` — aby `GET /api/users/me` zwracało pole.

### 4. `updateUser` select (`apps/server/src/modules/users/users.service.ts`)
Dodać `onboardingCompleted: true` do `select` w funkcji `updateUser` — aby `PATCH /api/users/me` zwracało zaktualizowaną wartość.

### 5. `updateMe` controller (`apps/server/src/modules/users/users.controller.ts`)
Dodać `onboardingCompleted` do destructuringu `req.body` i przekazać do `updateUser`. Kontroler destrukturyzuje whitelistę pól — bez jawnego dodania pole będzie **silently dropped** i nigdy nie trafi do bazy.

Wymagany boolean type-guard (wzorzec identyczny jak `updateConsents` w tym samym kontrolerze):
```ts
if (typeof onboardingCompleted === 'boolean') data.onboardingCompleted = onboardingCompleted;
```
Bez tego strażnika podanie stringa lub null spowoduje cichą awarię lub błąd Prismy.

---

## Zmiany w frontendzie

### Nowe pliki
- `apps/web/src/tours/cosmo-tour.ts` — konfiguracja kroków (tablice `DriverStep[]`)
- `apps/web/src/tours/utils.ts` — helper `waitForElement`
- `apps/web/src/contexts/TourContext.tsx` — React Context + `TourProvider`
- `apps/web/src/hooks/useTour.ts` — hook do konsumpcji kontekstu

### Modyfikacje istniejących plików

| Plik | Zmiana |
|------|--------|
| `apps/web/src/App.tsx` | Owinąć `<RouterProvider>` w `<TourProvider>` — powyżej wszystkich layoutów |
| `apps/web/src/components/layout/UserLayout.tsx` | Dodać `useEffect` zależny od `freshUser`, triggerujący `startTour()` gdy `freshUser?.onboardingCompleted === false` |
| `apps/web/src/pages/user/Profile.tsx` | Dodać przycisk "Powtórz tour" (secondary + ikona), wywołujący PATCH + `startTour()` |
| `apps/web/src/api/users.api.ts` | Dodać wywołanie PATCH dla `onboardingCompleted` (boolean) |
| `apps/web/src/components/layout/Navbar.tsx` | Dodać `data-tour="navbar-booking-btn"` do przycisku rezerwacji |
| `apps/web/src/pages/public/ServiceList.tsx` | Dodać `data-tour="services-list"` do kontenera listy |
| `apps/web/src/components/ServiceQuiz.tsx` (lub wrapper) | Dodać `data-tour="service-quiz"` do stałego kontenera nadrzędnego |
| `apps/web/src/pages/user/Appointments.tsx` | Dodać `data-tour="appointments-list"` |
| `apps/web/src/components/loyalty/PointsBar.tsx` | Dodać `data-tour="loyalty-points-bar"` |
| `apps/web/src/components/chat/ChatWindow.tsx` | Dodać `data-tour="chat-window"` |
| `apps/web/src/pages/user/` — strona dziennika skóry (trasa `/user/dziennik`) | Dodać `data-tour="skin-journal"` |
| `apps/web/src/pages/user/Profile.tsx` | Dodać `data-tour="profile-form"` do formularza |

### Zależności
```json
"driver.js": "^1.3.1"
```

---

## Poza zakresem

- Wielojęzyczność tooltipów (tylko PL)
- Analytics kroków (który krok najczęściej pomijany)
- Personalizacja treści touru na podstawie roli użytkownika
- Wiele osobnych tourów dla różnych flow

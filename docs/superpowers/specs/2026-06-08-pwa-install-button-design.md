# PWA Install Button — Specyfikacja

## Cel

Dodanie przycisku "Zainstaluj aplikację" jako floating button (prawy dolny róg ekranu), który umożliwia klientom dodanie aplikacji Cosmo do ekranu głównego telefonu. Przycisk nie pojawia się gdy aplikacja jest już zainstalowana.

## Warunki wstępne

`manifest.json` i service worker (Workbox) są już skonfigurowane w projekcie (`apps/web/public/manifest.json`, `apps/web/src/sw.ts`). Kryteria instalacyjności PWA są spełnione — `beforeinstallprompt` powinien odpalać na Android/Chrome bez dodatkowej konfiguracji.

## Komponenty

### Hook `usePwaInstall`

Plik: `apps/web/src/hooks/usePwaInstall.ts`

**Stały klucz localStorage** — zdefiniowany jako named constant w hooku:
```ts
const DISMISS_KEY = 'pwa-install-dismissed';
```

**Wykrywanie iOS** — uwzględnia iPadOS 13+ (który raportuje się jako `Macintosh`):
```ts
const isIOS =
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
```

**Wykrywanie "już zainstalowana"** — sprawdzane jeden raz na mount (wystarczające, bo ponowna instalacja mid-session i tak przeładowuje stronę):
```ts
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
```

**Nasłuchiwanie na `beforeinstallprompt`**:
- Event zapisywany w `useRef` (`deferredPromptRef`)
- Wymaga lokalnej deklaracji typu (nie istnieje w `lib.dom.d.ts`):
```ts
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

**Async flow `install()`**:
- Wywołuje `deferredPromptRef.current.prompt()`
- Jeśli `outcome === 'accepted'` → czyści ref, ustawia `canShow: false`
- Jeśli `outcome === 'dismissed'` → ref zostaje, `canShow` wraca do `true` (użytkownik może spróbować ponownie)

**Nasłuchiwanie na `appinstalled`** — po instalacji ustawia `canShow: false`.

Zwracane wartości:
```ts
{
  canShow: boolean           // czy w ogóle pokazać przycisk
  isIOS: boolean             // czy urządzenie iOS
  install: () => Promise<void>  // wywołuje prompt (Android)
  dismiss: () => void        // tymczasowe ukrycie (stan React, nie localStorage)
  dismissForever: () => void // zapisuje DISMISS_KEY do localStorage
}
```

### Komponent `PwaInstallButton`

Plik: `apps/web/src/components/PwaInstallButton.tsx`

**Pozycjonowanie:** `position: fixed`, prawy dolny róg (`bottom: 16px; right: 16px`). Komponent renderowany jako bezpośredni child roota layoutu (po `<Outlet />`), żeby uniknąć problemów z `overflow: hidden` lub `transform` na kontenerach.

Dwa tryby:

**Android:**
- FAB (📲) w prawym dolnym rogu
- Po kliknięciu — karta z przyciskami:
  - "Zainstaluj" → `install()`
  - ✕ → `dismiss()` (tymczasowe — karta znika do odświeżenia strony)
- Brak opcji "Nie pokazuj ponownie" — na Android zarządza tym sam system (Chrome zapamiętuje odrzucony prompt i sam ogranicza kolejne wywołania)

**iOS:**
- FAB identyczny
- Po kliknięciu — karta z instrukcją:
  - "⎋ Kliknij Udostępnij"
  - "＋ Wybierz Dodaj do ekranu głównego"
- Przycisk "Zamknij" → `dismiss()` (tymczasowe)
- Przycisk "Nie pokazuj" → `dismissForever()` (trwałe, zapisuje do `localStorage`)

Styl: brand color `#C8956C`, border-radius 14px, box-shadow, animacja fade-in.

## Montowanie

```tsx
// PublicLayout.tsx i UserLayout.tsx — po <Outlet />
<>
  <Outlet />
  <PwaInstallButton />
</>
```

Komponent nie jest dodawany do `AdminLayout` ani `EmployeeLayout`.

## Warunki ukrywania (priorytet malejący)

1. `display-mode: standalone` → apka zainstalowana → `canShow: false` (trwałe)
2. `localStorage(DISMISS_KEY)` istnieje → użytkownik odrzucił → `canShow: false` (trwałe)
3. Android + brak `beforeinstallprompt` → przeglądarka nie obsługuje → `canShow: false`
4. `dismiss()` wywołany → tymczasowe ukrycie (tylko stan React)

## Pliki do stworzenia/edycji

| Akcja | Plik |
|-------|------|
| Utwórz | `apps/web/src/hooks/usePwaInstall.ts` |
| Utwórz | `apps/web/src/components/PwaInstallButton.tsx` |
| Edytuj | `apps/web/src/components/layout/PublicLayout.tsx` |
| Edytuj | `apps/web/src/components/layout/UserLayout.tsx` |

## Brak zależności zewnętrznych

Implementacja używa wyłącznie natywnych Web API i React — brak nowych pakietów npm.

# PWA Install Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać floating button (prawy dolny róg) umożliwiający instalację aplikacji Cosmo na telefonie, ukrywający się gdy apka jest już zainstalowana lub użytkownik go odrzucił.

**Architecture:** Hook `usePwaInstall` zarządza całą logiką wykrywania i stanu. Komponent `PwaInstallButton` renderuje FAB i kartę — dwa tryby: Android (native prompt) i iOS (instrukcja ręczna). Montowany w `PublicLayout` i `UserLayout`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, natywne Web API (`beforeinstallprompt`, `appinstalled`, `matchMedia`)

---

## File Map

| Akcja | Plik | Odpowiedzialność |
|-------|------|-----------------|
| Utwórz | `apps/web/src/hooks/usePwaInstall.ts` | Logika wykrywania, stanu, instalacji |
| Utwórz | `apps/web/src/components/PwaInstallButton.tsx` | UI: FAB + karta Android/iOS |
| Edytuj | `apps/web/src/components/layout/PublicLayout.tsx` | Montowanie komponentu |
| Edytuj | `apps/web/src/components/layout/UserLayout.tsx` | Montowanie komponentu |

---

## Task 1: Hook `usePwaInstall`

**Files:**
- Create: `apps/web/src/hooks/usePwaInstall.ts`

- [ ] **Krok 1: Stwórz plik hooka z typem i stałą**

```ts
// apps/web/src/hooks/usePwaInstall.ts
import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

function detectIOS(): boolean {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const isIOS = detectIOS();

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isDismissed = !!localStorage.getItem(DISMISS_KEY);

  const [canShow, setCanShow] = useState<boolean>(() => {
    if (isStandalone || isDismissed) return false;
    if (isIOS) return true;
    return false; // Android: czekamy na beforeinstallprompt
  });

  useEffect(() => {
    if (isStandalone || isDismissed) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanShow(true);
    };

    const handleAppInstalled = () => {
      setCanShow(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPromptRef.current) return;
    const { outcome } = await deferredPromptRef.current.prompt();
    if (outcome === 'accepted') {
      setCanShow(false);
      deferredPromptRef.current = null;
    }
    // outcome === 'dismissed' → canShow pozostaje true, użytkownik może spróbować ponownie
  };

  const dismiss = () => setCanShow(false);

  const dismissForever = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setCanShow(false);
  };

  return { canShow, isIOS, install, dismiss, dismissForever };
}
```

- [ ] **Krok 2: Zweryfikuj kompilację TypeScript**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Oczekiwane: brak błędów dotyczących nowego pliku.

- [ ] **Krok 3: Commit**

```bash
cd cosmo-app && git add apps/web/src/hooks/usePwaInstall.ts
git commit -m "feat: add usePwaInstall hook for PWA install detection"
```

---

## Task 2: Komponent `PwaInstallButton`

**Files:**
- Create: `apps/web/src/components/PwaInstallButton.tsx`

- [ ] **Krok 1: Stwórz komponent**

```tsx
// apps/web/src/components/PwaInstallButton.tsx
import { useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallButton() {
  const { canShow, isIOS, install, dismiss, dismissForever } = usePwaInstall();
  const [cardOpen, setCardOpen] = useState(false);

  if (!canShow) return null;

  const handleFabClick = () => setCardOpen((prev) => !prev);

  const handleInstall = async () => {
    await install();
    setCardOpen(false);
  };

  const handleDismiss = () => {
    setCardOpen(false);
    dismiss();
  };

  const handleDismissForever = () => {
    setCardOpen(false);
    dismissForever();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {cardOpen && (
        <div className="bg-white rounded-[14px] shadow-xl p-3.5 w-56 animate-fade-in">
          {isIOS ? (
            <>
              <p className="font-semibold text-sm text-gray-800 mb-1.5">
                Dodaj do ekranu głównego
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                <span className="inline-block bg-gray-100 rounded px-1 mr-1">⎋</span>
                Kliknij <strong>Udostępnij</strong>
                <br />
                <span className="inline-block bg-gray-100 rounded px-1 mr-1 mt-1">＋</span>
                Wybierz <strong>"Dodaj do ekranu"</strong>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 text-xs bg-gray-100 text-gray-600 rounded-lg py-1.5 font-medium"
                >
                  Zamknij
                </button>
                <button
                  onClick={handleDismissForever}
                  className="flex-1 text-xs bg-oak/10 text-oak border border-oak rounded-lg py-1.5 font-semibold"
                >
                  Nie pokazuj
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm text-gray-800 mb-0.5">
                Zainstaluj aplikację
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Szybki dostęp z ekranu głównego
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 text-xs bg-oak text-white rounded-lg py-1.5 font-semibold"
                >
                  Zainstaluj
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs bg-gray-100 text-gray-500 rounded-lg px-3 py-1.5"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={handleFabClick}
        aria-label="Zainstaluj aplikację"
        className="w-12 h-12 rounded-full bg-oak text-white text-2xl flex items-center justify-center shadow-lg shadow-oak/40 hover:opacity-90 transition-opacity"
      >
        📲
      </button>
    </div>
  );
}
```

- [ ] **Krok 2: Sprawdź czy Tailwind ma `animate-fade-in`**

```bash
grep -r "animate-fade-in" cosmo-app/apps/web/src --include="*.tsx" --include="*.css" -l
```

Jeśli klasa nie istnieje — dodaj do `tailwind.config.js` lub zastąp ją `transition-opacity duration-200`. Wzorzec `animate-fade-in` jest używany w innych komponentach w tym projekcie, więc prawdopodobnie już istnieje.

- [ ] **Krok 3: Zweryfikuj kompilację TypeScript**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Oczekiwane: brak błędów.

- [ ] **Krok 4: Commit**

```bash
cd cosmo-app && git add apps/web/src/components/PwaInstallButton.tsx
git commit -m "feat: add PwaInstallButton floating component"
```

---

## Task 3: Montowanie w PublicLayout

**Files:**
- Modify: `apps/web/src/components/layout/PublicLayout.tsx`

Obecna struktura (koniec pliku):
```tsx
      <Footer />
      <FloatingBookingCTA />
      <ScrollRestoration />
    </div>
  );
};
```

- [ ] **Krok 1: Dodaj import i komponent**

Dodaj import na górze pliku (obok `FloatingBookingCTA`):
```tsx
import { PwaInstallButton } from '@/components/PwaInstallButton';
```

Dodaj `<PwaInstallButton />` po `<FloatingBookingCTA />`:
```tsx
      <Footer />
      <FloatingBookingCTA />
      <PwaInstallButton />
      <ScrollRestoration />
    </div>
```

- [ ] **Krok 2: Sprawdź w przeglądarce (dev server)**

```bash
cd cosmo-app && pnpm dev
```

Otwórz `http://localhost:5173` — przycisk 📲 powinien być widoczny w prawym dolnym rogu. Kliknięcie otwiera kartę.

- [ ] **Krok 3: Commit**

```bash
cd cosmo-app && git add apps/web/src/components/layout/PublicLayout.tsx
git commit -m "feat: mount PwaInstallButton in PublicLayout"
```

---

## Task 4: Montowanie w UserLayout

**Files:**
- Modify: `apps/web/src/components/layout/UserLayout.tsx`

Obecna struktura (koniec `UserLayoutInner`):
```tsx
      <ReviewPromptModal />
      <MobileBottomNav />
      {showPushPrompt && (
        <PushPermissionPrompt ... />
      )}
    </div>
```

- [ ] **Krok 1: Dodaj import i komponent**

Dodaj import:
```tsx
import { PwaInstallButton } from '@/components/PwaInstallButton';
```

Dodaj `<PwaInstallButton />` po `<MobileBottomNav />` i przed warunkowym `PushPermissionPrompt`:
```tsx
      <ReviewPromptModal />
      <MobileBottomNav />
      <PwaInstallButton />
      {showPushPrompt && (
        <PushPermissionPrompt ... />
      )}
    </div>
```

- [ ] **Krok 2: Sprawdź w przeglądarce**

Zaloguj się jako klient (`http://localhost:5173/auth/login`) — przycisk powinien być widoczny w panelu użytkownika.

- [ ] **Krok 3: Commit**

```bash
cd cosmo-app && git add apps/web/src/components/layout/UserLayout.tsx
git commit -m "feat: mount PwaInstallButton in UserLayout"
```

---

## Weryfikacja końcowa

- [ ] Wejdź na stronę na telefonie z Androidem przez Chrome → powinien pojawić się 📲 → kliknięcie wywołuje systemowy prompt instalacji
- [ ] Po zainstalowaniu otwórz apkę ze skrótu na ekranie → przycisk nie pojawia się (`display-mode: standalone`)
- [ ] Na iOS w Safari → pojawia się instrukcja z dwoma przyciskami
- [ ] Kliknięcie "Nie pokazuj" → przycisk znika i nie wraca po odświeżeniu
- [ ] W AdminLayout i EmployeeLayout → przycisk nie pojawia się

import { useEffect, useState } from 'react';

/**
 * Instalacja Akademii na ekranie głównym. Bez tej zachęty praktycznie nikt nie
 * instaluje PWA — trzeba by samodzielnie znaleźć „Dodaj do ekranu głównego”
 * w menu przeglądarki. Android daje zdarzenie `beforeinstallprompt`, iOS nie
 * daje nic, więc tam pokazujemy instrukcję.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'academy-install-dismissed-until';
const SNOOZE_DAYS = 30;

export type InstallPlatform = 'android' | 'ios' | 'unsupported';

function isStandalone() {
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  } catch {
    return false;
  }
}

function isIOS() {
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return /iPad|iPhone|iPod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  } catch {
    return false;
  }
}

function snoozed() {
  try {
    const until = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function useAcademyInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>('unsupported');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;

    if (isIOS()) {
      setPlatform('ios');
      setDismissed(false);
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setPlatform('android');
      setDismissed(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const onInstalled = () => { setDismissed(true); setDeferred(null); };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    setDismissed(true);
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now() + SNOOZE_DAYS * 864e5)); } catch { /* prywatny tryb */ }
  };

  return { available: !dismissed && platform !== 'unsupported', platform, install, dismiss };
}

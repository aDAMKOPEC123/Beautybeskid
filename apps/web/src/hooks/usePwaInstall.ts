// apps/web/src/hooks/usePwaInstall.ts
import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

function detectIOS(): boolean {
  try {
    return (
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  } catch {
    return false;
  }
}

function isAlreadyInstalled(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function isDismissedInStorage(): boolean {
  try {
    return !!localStorage.getItem(DISMISS_KEY);
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const isIOSRef = useRef(detectIOS());
  const isStandaloneRef = useRef(isAlreadyInstalled());
  const isDismissedRef = useRef(isDismissedInStorage());

  const [canShow, setCanShow] = useState<boolean>(() => {
    if (isStandaloneRef.current || isDismissedRef.current) return false;
    if (isIOSRef.current) return true;
    return false; // Android: wait for beforeinstallprompt
  });

  useEffect(() => {
    if (isStandaloneRef.current || isDismissedRef.current) return;

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
    // outcome === 'dismissed' → canShow stays true, user can try again
  };

  const dismiss = () => setCanShow(false);

  const dismissForever = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage unavailable (private browsing / quota exceeded)
    }
    setCanShow(false);
  };

  return { canShow, isIOS: isIOSRef.current, install, dismiss, dismissForever } as const;
}

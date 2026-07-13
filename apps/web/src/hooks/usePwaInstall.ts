import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
export const PWA_INSTALL_PROMPT_EVENT = 'cosmo:pwa-install-prompt';

export type PwaInstallPromptDetail = {
  continueTo?: string;
  navigationState?: unknown;
};

export type PwaPlatform = 'android' | 'ios-safari' | 'ios-chrome' | 'ios-other' | 'desktop';

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

export function isPwaAlreadyInstalled(): boolean {
  try {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
  } catch {
    return false;
  }
}

export function detectPwaPlatform(): PwaPlatform {
  try {
    const userAgent = navigator.userAgent;
    const isIOS = detectIOS();

    if (isIOS) {
      if (/CriOS/i.test(userAgent)) return 'ios-chrome';
      if (/Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent)) return 'ios-safari';
      return 'ios-other';
    }

    if (/Android/i.test(userAgent)) return 'android';
    return 'desktop';
  } catch {
    return 'desktop';
  }
}

export function isMobileBrowser() {
  try {
    return window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  const platformRef = useRef<PwaPlatform>(detectPwaPlatform());
  const isIOSRef = useRef(platformRef.current.startsWith('ios'));
  const isStandaloneRef = useRef(isPwaAlreadyInstalled());
  const isDismissedRef = useRef(isDismissedInStorage());

  const [canShow, setCanShow] = useState<boolean>(() => {
    if (isStandaloneRef.current || isDismissedRef.current) return false;
    if (isIOSRef.current) return true;
    return false;
  });

  useEffect(() => {
    if (isStandaloneRef.current) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
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
    if (!deferredPromptRef.current) return 'unavailable' as const;
    const { outcome } = await deferredPromptRef.current.prompt();
    if (outcome === 'accepted') {
      setCanShow(false);
      deferredPromptRef.current = null;
    }
    return outcome;
  };

  const dismiss = () => setCanShow(false);

  const dismissForever = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage unavailable in private browsing or quota exceeded.
    }
    setCanShow(false);
  };

  return {
    canShow,
    isIOS: isIOSRef.current,
    isStandalone: isStandaloneRef.current,
    platform: platformRef.current,
    install,
    dismiss,
    dismissForever,
  } as const;
}

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const LEGACY_DISMISS_KEY = 'pwa-install-dismissed';
const HIDDEN_FOREVER_KEY = 'pwa-install-hidden-forever';
const SNOOZE_UNTIL_KEY = 'pwa-install-snooze-until';
const MOBILE_AUTO_SNOOZE_KEY = 'pwa-install-mobile-auto-snooze';
const IMPRESSION_COUNT_KEY = 'pwa-install-impression-count';
const LAST_REASON_KEY = 'pwa-install-last-reason';
export const PWA_INSTALL_PROMPT_EVENT = 'cosmo:pwa-install-prompt';

export type PwaInstallPromptDetail = {
  continueTo?: string;
  navigationState?: unknown;
  reason?: PwaInstallPromptReason;
};

export type PwaPlatform = 'android' | 'ios-safari' | 'ios-chrome' | 'ios-other' | 'desktop';
export type PwaInstallPromptReason = 'panel-entry' | 'post-login' | 'appointments' | 'booking-success' | 'manual';

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

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

export function trackPwaInstallEvent(action: string, params?: Record<string, unknown>) {
  const payload = {
    platform: detectPwaPlatform(),
    standalone: isPwaAlreadyInstalled(),
    ...params,
  };
  trackEvent(`pwa_install_${action}`, payload);
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: `pwa_install_${action}`, ...payload });
    window.dispatchEvent(new CustomEvent('cosmo:pwa-install-analytics', { detail: { action, ...payload } }));
  } catch {
    // Analytics must never block the install flow.
  }
}

export function isPwaInstallHiddenForever(): boolean {
  try {
    return !!localStorage.getItem(HIDDEN_FOREVER_KEY);
  } catch {
    return false;
  }
}

export function isPwaInstallSnoozed(): boolean {
  try {
    const snoozeUntil = readNumber(SNOOZE_UNTIL_KEY);
    return snoozeUntil > Date.now();
  } catch {
    return false;
  }
}

export function canPromptForPwaInstall() {
  return !isPwaAlreadyInstalled() && !isPwaInstallHiddenForever() && !isPwaInstallSnoozed();
}

export function markPwaInstallImpression(reason: PwaInstallPromptReason = 'manual') {
  try {
    const count = readNumber(IMPRESSION_COUNT_KEY) + 1;
    localStorage.setItem(IMPRESSION_COUNT_KEY, String(count));
    localStorage.setItem(LAST_REASON_KEY, reason);
    trackPwaInstallEvent('shown', { reason, count });
  } catch {
    trackPwaInstallEvent('shown', { reason });
  }
}

export function isMobileAutoSnoozed(): boolean {
  try {
    const until = readNumber(MOBILE_AUTO_SNOOZE_KEY);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function snoozeMobileAuto(days = 1) {
  try {
    localStorage.setItem(MOBILE_AUTO_SNOOZE_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    // localStorage unavailable
  }
  trackPwaInstallEvent('mobile_auto_snoozed', { days });
}

export function snoozePwaInstall(days = 3, reason?: string) {
  try {
    localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    // localStorage unavailable in private browsing or quota exceeded.
  }
  trackPwaInstallEvent('snoozed', { reason, days });
}

export function hidePwaInstallForever(reason?: string) {
  try {
    localStorage.setItem(HIDDEN_FOREVER_KEY, '1');
    localStorage.removeItem(LEGACY_DISMISS_KEY);
  } catch {
    // localStorage unavailable in private browsing or quota exceeded.
  }
  trackPwaInstallEvent('hidden_forever', { reason });
}

export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const platformRef = useRef<PwaPlatform>(detectPwaPlatform());
  const isIOSRef = useRef(platformRef.current.startsWith('ios'));
  const isStandaloneRef = useRef(isPwaAlreadyInstalled());
  const isUnavailableRef = useRef(!canPromptForPwaInstall());

  const [canShow, setCanShow] = useState<boolean>(() => {
    if (isStandaloneRef.current || isUnavailableRef.current) return false;
    if (isIOSRef.current) return true;
    return false;
  });

  useEffect(() => {
    if (isStandaloneRef.current) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      if (canPromptForPwaInstall()) setCanShow(true);
    };

    const handleAppInstalled = () => {
      setCanShow(false);
      deferredPromptRef.current = null;
      trackPwaInstallEvent('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPromptRef.current) {
      trackPwaInstallEvent('native_unavailable');
      return 'unavailable' as const;
    }
    trackPwaInstallEvent('native_prompt_opened');
    const { outcome } = await deferredPromptRef.current.prompt();
    trackPwaInstallEvent(outcome === 'accepted' ? 'accepted' : 'dismissed_native');
    if (outcome === 'accepted') {
      setCanShow(false);
      deferredPromptRef.current = null;
    }
    return outcome;
  };

  const dismiss = (reason?: string) => {
    snoozePwaInstall(3, reason);
    setCanShow(false);
  };

  const dismissForever = (reason?: string) => {
    hidePwaInstallForever(reason);
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

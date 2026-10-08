// Przekazanie linku z przeglądarki (np. wbudowanej w Messengera) do zainstalowanej PWA.
//
// iOS nie pozwala ani sprawdzić, czy PWA jest zainstalowana, ani jej otworzyć linkiem,
// a przeglądarka i PWA mają osobne dane. Dlatego link zapamiętuje serwer, dopasowując
// oba otwarcia po sieci i cechach urządzenia, a PWA odbiera go przy starcie.

export type HandoffOs = 'ios' | 'android' | null;

const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|TikTok|musical_ly|Snapchat|Pinterest/i;
const DISMISSED_KEY = 'cosmo:app-handoff-dismissed';

// Adres, z którym strona została otwarta. Moduł jest importowany z App.tsx, więc
// wartość powstaje przed jakąkolwiek nawigacją w aplikacji.
export const HANDOFF_ENTRY_PATH =
  typeof window === 'undefined' ? '' : `${window.location.pathname}${window.location.search}`;

export function detectHandoffBrowser(userAgent: string, maxTouchPoints = 0): { os: HandoffOs; inApp: boolean } {
  const isIOS =
    /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const os: HandoffOs = isIOS ? 'ios' : /Android/i.test(userAgent) ? 'android' : null;
  return { os, inApp: os !== null && IN_APP_BROWSER.test(userAgent) };
}

export function shouldOfferHandoff(input: {
  userAgent: string;
  maxTouchPoints?: number;
  standalone: boolean;
  entryPath: string;
  path: string;
  dismissed: boolean;
}): boolean {
  if (input.standalone || input.dismissed) return false;
  // Tylko wejście z linku — klikanie po stronie nie może kończyć się planszą o aplikacji.
  if (input.entryPath !== input.path) return false;

  const { os, inApp } = detectHandoffBrowser(input.userAgent, input.maxTouchPoints);
  if (os === 'ios') return true;
  // Chrome na Androidzie sam otwiera zainstalowaną PWA i dzieli z nią logowanie.
  return os === 'android' && inApp;
}

/**
 * Cechy urządzenia identyczne w przeglądarce i w PWA na tym samym telefonie.
 * Celowo bez wersji systemu i reszty user agenta — te różnią się między przeglądarkami.
 */
export function buildDeviceKey(input: {
  userAgent: string;
  maxTouchPoints?: number;
  width: number;
  height: number;
  pixelRatio: number;
  timeZone: string;
  language: string;
}): string {
  const { os } = detectHandoffBrowser(input.userAgent, input.maxTouchPoints);
  const short = Math.min(input.width, input.height);
  const long = Math.max(input.width, input.height);
  const language = input.language.toLowerCase().split('-')[0];
  return `${os ?? 'other'}|${short}x${long}@${input.pixelRatio}|${input.timeZone}|${language}`;
}

export function currentDeviceKey(): string {
  let timeZone = '';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // Brak strefy nie blokuje dopasowania — zostają pozostałe cechy.
  }
  return buildDeviceKey({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    width: window.screen.width,
    height: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    timeZone,
    language: navigator.language || '',
  });
}

export function safeHandoffPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\s]/.test(value)) return null;
  return value;
}

export function androidIntentUrl(origin: string, path: string): string {
  const host = origin.replace(/^https?:\/\//, '');
  const fallback = encodeURIComponent(`${origin}${path}`);
  return `intent://${host}${path}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`;
}

export function isHandoffDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissHandoff() {
  try {
    sessionStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // sessionStorage bywa niedostępny w trybie prywatnym.
  }
}

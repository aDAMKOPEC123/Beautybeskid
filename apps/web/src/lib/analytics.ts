// Musi być zgodne z blokiem gtag w apps/web/index.html.
export const GA_MEASUREMENT_ID = 'G-Q6NNTHPCJ7';

type PageLocation = {
  pathname: string;
  search: string;
  hash: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * GA4 i GTM ładują się już w index.html, ale ze zgodą ustawioną na 'denied'
 * (Consent Mode v2). Ta funkcja tylko podnosi zgodę po akceptacji banera —
 * nie wstrzykuje żadnych skryptów. Zmiana ID musi iść razem z index.html.
 */
export function grantAnalyticsConsent() {
  if (typeof window === 'undefined') return;

  // gtag jest definiowany inline w index.html i istnieje niezależnie od tego,
  // czy skrypt z googletagmanager.com się pobrał (może go blokować adblock).
  // Shim poniżej to zabezpieczenie na wypadek usunięcia tamtego bloku.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  });
}

export function trackPageView(location: PageLocation) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const pagePath = `${location.pathname}${location.search}${location.hash}`;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: document.title,
  });
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export const GA_MEASUREMENT_ID = 'G-N52JVPSJBK';
const GTM_CONTAINER_ID = 'GTM-MT2NHRBC';

let analyticsLoadPromise: Promise<void> | null = null;

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

const loadScript = (src: string, id: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Nie udało się załadować ${id}`));
    };
    document.head.appendChild(script);
  });

/**
 * Analytics is intentionally loaded only after consent. This keeps third-party
 * scripts out of the critical rendering path and implements basic Consent Mode.
 */
export function loadAnalytics() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (analyticsLoadPromise) return analyticsLoadPromise;

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
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  analyticsLoadPromise = Promise.all([
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`, 'ga4-script'),
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`, 'gtm-script'),
  ])
    .then(() => undefined)
    .catch((error) => {
      // Analytics is optional and may be blocked by privacy extensions or DNS.
      // Do not turn that into an unhandled application error; allow a later retry.
      analyticsLoadPromise = null;
      if (import.meta.env.DEV) {
        console.warn('Analytics scripts could not be loaded:', error);
      }
    });

  return analyticsLoadPromise;
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

const GA_MEASUREMENT_ID = 'G-H2FHJ657K3';

type PageLocation = {
  pathname: string;
  search: string;
  hash: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
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

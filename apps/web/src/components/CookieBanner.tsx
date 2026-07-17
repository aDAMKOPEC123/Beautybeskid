import { useState, useEffect } from 'react';
import { loadAnalytics } from '@/lib/analytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const COOKIE_KEY = 'cookie_consent_choice';
const LEGACY_COOKIE_KEY = 'cookie_consent_accepted';

type ConsentChoice = 'accepted' | 'essential' | null;

const readConsent = (): ConsentChoice => {
  if (typeof window === 'undefined') return null;
  const choice = localStorage.getItem(COOKIE_KEY);
  if (choice === 'accepted' || choice === 'essential') return choice;
  return localStorage.getItem(LEGACY_COOKIE_KEY) ? 'accepted' : null;
};

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (consent === 'accepted') {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'granted',
        });
      }
      void loadAnalytics();
      return;
    }

    if (consent !== null) return;

    const timeoutId = window.setTimeout(() => setVisible(true), 8_000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    localStorage.removeItem(LEGACY_COOKIE_KEY);
    setVisible(false);
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      });
    }
    void loadAnalytics();
  };

  const keepEssentialOnly = () => {
    localStorage.setItem(COOKIE_KEY, 'essential');
    localStorage.removeItem(LEGACY_COOKIE_KEY);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-2 left-3 right-3 z-50 mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl bg-[#1a1a1a] px-3 py-2.5 text-white shadow-2xl sm:flex-row sm:gap-3">
      <p className="text-center text-[11px] leading-snug sm:text-left sm:text-xs">
        Używamy niezbędnych cookies i — za zgodą — analitycznych. Zobacz{' '}
        <a href="/regulamin" className="underline hover:text-[#C8956C]">
          politykę prywatności
        </a>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={keepEssentialOnly}
          className="min-h-9 rounded-full border border-white/35 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/10"
        >
          Tylko niezbędne
        </button>
        <button
          type="button"
          onClick={accept}
          className="min-h-9 rounded-full bg-[#8A5F35] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#704825]"
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
};

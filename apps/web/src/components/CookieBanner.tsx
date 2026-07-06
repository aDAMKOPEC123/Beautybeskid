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
  const [visible, setVisible] = useState(() => readConsent() === null);

  useEffect(() => {
    if (readConsent() === 'accepted') {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'granted',
        });
      }
      void loadAnalytics();
    }
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] text-white px-4 py-4 flex flex-col sm:flex-row items-center gap-3 shadow-lg">
      <p className="text-sm text-center sm:text-left flex-1">
        Ta strona używa plików cookie w celu zapewnienia prawidłowego działania oraz analizy ruchu.
        Korzystając ze strony, akceptujesz naszą{' '}
        <a href="/regulamin" className="inline-flex min-h-11 items-center underline hover:text-[#C8956C]">
          politykę prywatności
        </a>
        .
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={keepEssentialOnly}
          className="rounded-full border border-white/35 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Tylko niezbędne
        </button>
        <button
          type="button"
          onClick={accept}
          className="rounded-full bg-[#8A5F35] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#704825]"
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
};

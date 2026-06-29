import { useState, useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const COOKIE_KEY = 'cookie_consent_accepted';

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COOKIE_KEY)) {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'granted',
        });
      }
    } else {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, '1');
    setVisible(false);
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      });
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] text-white px-4 py-4 flex flex-col sm:flex-row items-center gap-3 shadow-lg">
      <p className="text-sm text-center sm:text-left flex-1">
        Ta strona używa plików cookie w celu zapewnienia prawidłowego działania oraz analizy ruchu.
        Korzystając ze strony, akceptujesz naszą{' '}
        <a href="/regulamin" className="underline hover:text-[#C8956C]">
          politykę prywatności
        </a>
        .
      </p>
      <button
        onClick={accept}
        className="shrink-0 bg-[#C8956C] hover:bg-[#b07d58] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors"
      >
        Akceptuję
      </button>
    </div>
  );
};

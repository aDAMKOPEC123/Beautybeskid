import { useEffect, useState } from 'react';

export const COOKIE_CONSENT_KEY = 'academy_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(COOKIE_CONSENT_KEY));
  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener('academy:cookie-settings', open);
    return () => window.removeEventListener('academy:cookie-settings', open);
  }, []);
  const choose = (value: 'essential' | 'analytics') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    setVisible(false);
    window.dispatchEvent(new CustomEvent('academy:cookie-consent-changed', { detail: value }));
  };
  if (!visible) return null;
  return <section className="academy-cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div><strong id="cookie-title">Twoja prywatność w Akademii</strong><p>Niezbędne pliki pamiętają sesję i wybór zgód. Analitykę uruchomimy wyłącznie za Twoją zgodą. <a href="/cookies">Dowiedz się więcej</a>.</p></div>
    <div><button onClick={() => choose('essential')}>Tylko niezbędne</button><button className="primary" onClick={() => choose('analytics')}>Zgadzam się na analitykę</button></div>
  </section>;
}

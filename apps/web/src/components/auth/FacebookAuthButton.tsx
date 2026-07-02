import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/auth.api';

type FacebookAuthButtonProps = {
  mode: 'login' | 'register';
  returnTo?: string;
  termsAccepted?: boolean;
  marketingConsent?: boolean;
  photoConsent?: boolean;
  ambassadorCode?: string;
};

let facebookStatusPromise: Promise<boolean> | undefined;

const loadFacebookStatus = () => {
  facebookStatusPromise ??= authApi
    .getFacebookStatus()
    .then(({ enabled }) => enabled)
    .catch(() => false);
  return facebookStatusPromise;
};

export const facebookErrorMessages: Record<string, string> = {
  'facebook-unavailable': 'Logowanie przez Facebook nie jest jeszcze dostępne.',
  'facebook-denied': 'Logowanie przez Facebook zostało anulowane.',
  'facebook-invalid-state': 'Sesja logowania przez Facebook wygasła. Spróbuj ponownie.',
  'facebook-email-required':
    'Facebook nie udostępnił adresu email. Dodaj email do konta Facebook albo zarejestruj się formularzem.',
  'facebook-registration-required':
    'Zaakceptuj regulamin, a następnie kliknij „Zarejestruj przez Facebook”.',
  'facebook-account-blocked': 'To konto zostało zablokowane. Skontaktuj się z salonem.',
  'facebook-account-conflict':
    'Nie można połączyć tego profilu Facebook z kontem. Skontaktuj się z salonem.',
  'facebook-failed': 'Nie udało się zalogować przez Facebook. Spróbuj ponownie.',
};

export const FacebookAuthButton = ({
  mode,
  returnTo,
  termsAccepted = false,
  marketingConsent = false,
  photoConsent = false,
  ambassadorCode,
}: FacebookAuthButtonProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadFacebookStatus().then((isEnabled) => {
      if (mounted) setEnabled(isEnabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!enabled) return null;

  const startFacebookAuth = () => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const url = new URL(`${apiBase.replace(/\/$/, '')}/auth/facebook`, window.location.origin);
    url.searchParams.set('mode', mode);
    if (returnTo) url.searchParams.set('returnTo', returnTo);

    if (mode === 'register') {
      url.searchParams.set('termsAccepted', String(termsAccepted));
      url.searchParams.set('marketingConsent', String(marketingConsent));
      url.searchParams.set('photoConsent', String(photoConsent));
      if (ambassadorCode?.trim()) {
        url.searchParams.set('ambassadorCode', ambassadorCode.trim().toUpperCase());
      }
    }

    window.location.assign(url.toString());
  };

  return (
    <Button
      type="button"
      onClick={startFacebookAuth}
      disabled={mode === 'register' && !termsAccepted}
      className="w-full bg-[#1877F2] py-6 text-sm normal-case tracking-normal text-white hover:bg-[#166FE5]"
    >
      <span
        aria-hidden="true"
        className="mr-2 flex h-5 w-5 items-end justify-center rounded-full bg-white text-base font-bold leading-[18px] text-[#1877F2]"
      >
        f
      </span>
      {mode === 'register' ? 'Zarejestruj przez Facebook' : 'Kontynuuj przez Facebook'}
    </Button>
  );
};

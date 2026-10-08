import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ExternalLink, Home, Smartphone } from 'lucide-react';
import { appHandoffApi } from '@/api/appHandoff.api';
import { isPwaAlreadyInstalled } from '@/hooks/usePwaInstall';
import {
  HANDOFF_ENTRY_PATH,
  androidIntentUrl,
  currentDeviceKey,
  detectHandoffBrowser,
  dismissHandoff,
  isHandoffDismissed,
  shouldOfferHandoff,
} from '@/lib/appHandoff';

const APP_NAME = 'BeskidStudio';

const offersHandoff = (path: string) => {
  try {
    return shouldOfferHandoff({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone: isPwaAlreadyInstalled(),
      entryPath: HANDOFF_ENTRY_PATH,
      path,
      dismissed: isHandoffDismissed(),
    });
  } catch {
    return false;
  }
};

const AppHandoffScreen = ({ path, onContinue }: { path: string; onContinue: () => void }) => {
  const { os } = detectHandoffBrowser(navigator.userAgent, navigator.maxTouchPoints);

  // Zapamiętujemy link od razu, żeby czekał, zanim klientka przełączy się do aplikacji.
  useEffect(() => {
    appHandoffApi.save(path, currentDeviceKey()).catch(() => {
      // Bez zapisu aplikacja po prostu otworzy się na stronie startowej.
    });
  }, [path]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-oak/10 bg-card p-6 text-center shadow-xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-espresso text-white">
          <Smartphone size={26} />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-semibold leading-tight text-oak">
          Otwórz w aplikacji {APP_NAME}
        </h1>
        <p className="mt-2 text-sm leading-6 text-foreground/75">
          W aplikacji jesteś już zalogowana — przeniesiemy Cię prosto do tej strony.
        </p>

        {os === 'android' ? (
          <a
            href={androidIntentUrl(window.location.origin, path)}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-espresso px-4 py-3 text-base font-semibold text-white shadow-lg shadow-espresso/20 transition hover:bg-espresso/90"
          >
            <ExternalLink size={18} />
            Otwórz w aplikacji
          </a>
        ) : (
          <ol className="mt-6 space-y-3 text-left">
            <li className="flex items-center gap-3 rounded-xl border border-oak/10 bg-white p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-oak/10 text-sm font-bold text-oak">1</span>
              <span className="text-sm font-semibold text-foreground">Wróć na ekran główny telefonu</span>
              <Home size={18} className="ml-auto shrink-0 text-oak" />
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-oak/22 bg-oak/5 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-espresso text-sm font-bold text-white">2</span>
              <span className="text-sm font-semibold text-foreground">
                Otwórz aplikację {APP_NAME} — ta strona otworzy się sama
              </span>
            </li>
          </ol>
        )}

        <p className="mt-4 text-xs leading-5 text-foreground/60">
          Zapamiętamy tę stronę przez 15 minut.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-5 min-h-11 w-full rounded-xl border border-oak/15 px-4 py-2.5 text-sm font-semibold text-oak transition hover:bg-oak/5"
        >
          Nie mam aplikacji — zaloguj się w przeglądarce
        </button>
      </div>
    </div>
  );
};

/**
 * Zastępuje przekierowanie do logowania w chronionych layoutach. Gdy ktoś wszedł
 * z linku w przeglądarce na telefonie, najpierw proponuje zainstalowaną aplikację,
 * w której sesja już jest — zamiast od razu wymuszać logowanie.
 */
export const AuthRequired = ({ from, to = '/auth/login' }: { from: string; to?: string }) => {
  const [offer, setOffer] = useState(() => offersHandoff(from));

  if (offer) {
    return (
      <AppHandoffScreen
        path={from}
        onContinue={() => {
          dismissHandoff();
          setOffer(false);
        }}
      />
    );
  }

  return <Navigate to={to} state={{ from }} replace />;
};

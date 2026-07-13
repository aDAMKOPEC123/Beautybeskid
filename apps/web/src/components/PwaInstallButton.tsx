import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Download, Home, MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import {
  PWA_INSTALL_PROMPT_EVENT,
  type PwaInstallPromptDetail,
  usePwaInstall,
} from '@/hooks/usePwaInstall';

interface Props {
  className?: string;
}

const IconBadge = ({ children }: { children: ReactNode }) => (
  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-oak/10 text-oak">
    {children}
  </span>
);

const Step = ({
  number,
  icon,
  title,
  text,
}: {
  number: number;
  icon: ReactNode;
  title: string;
  text: string;
}) => (
  <li className="flex gap-3 rounded-xl border border-oak/10 bg-white p-3 shadow-sm">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-oak text-sm font-bold text-white">
      {number}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <IconBadge>{icon}</IconBadge>
        <div>
          <p className="text-sm font-bold leading-tight text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-snug text-foreground/64">{text}</p>
        </div>
      </div>
    </div>
  </li>
);

export function PwaInstallButton({ className }: Props) {
  const { canShow, isIOS, isStandalone, platform, install, dismiss, dismissForever } = usePwaInstall();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PwaInstallPromptDetail | null>(null);

  useEffect(() => {
    const handlePromptRequest = (event: Event) => {
      if (isStandalone) return;
      const detail = (event as CustomEvent<PwaInstallPromptDetail>).detail ?? {};
      setPendingNavigation(detail);
      setModalOpen(true);
    };

    window.addEventListener(PWA_INSTALL_PROMPT_EVENT, handlePromptRequest);
    return () => window.removeEventListener(PWA_INSTALL_PROMPT_EVENT, handlePromptRequest);
  }, [isStandalone]);

  if (isStandalone || (!canShow && !modalOpen)) return null;

  const hasPendingPanelEntry = Boolean(pendingNavigation?.continueTo);
  const isAndroid = platform === 'android';
  const isIosChrome = platform === 'ios-chrome';

  const continueInBrowser = () => {
    const destination = pendingNavigation?.continueTo;
    setModalOpen(false);
    setPendingNavigation(null);
    dismiss();
    if (destination) {
      navigate(destination, { state: pendingNavigation?.navigationState });
    }
  };

  const handleInstall = async () => {
    setLoading(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted' && pendingNavigation?.continueTo) {
        continueInBrowser();
      }
    } finally {
      setLoading(false);
    }
  };

  const closeOnce = () => {
    setModalOpen(false);
    setPendingNavigation(null);
    dismiss();
  };

  const closeForever = () => {
    setModalOpen(false);
    setPendingNavigation(null);
    dismissForever();
  };

  return (
    <div className={`fixed right-4 z-50 flex flex-col items-end gap-2 ${className ?? 'bottom-20 md:bottom-4'}`}>
      {modalOpen && (
        <div
          className="fixed inset-0 z-[80] flex bg-black/45 p-2 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="flex h-[calc(100svh-1rem)] w-full flex-col overflow-hidden rounded-xl bg-[#fffdf9] shadow-2xl sm:h-auto sm:max-h-[min(680px,calc(100svh-2rem))] sm:max-w-md">
            <div className="shrink-0 border-b border-oak/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-oak text-white">
                    <Smartphone className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel">
                      Panel klienta
                    </p>
                    <h2 id="pwa-install-title" className="mt-1 font-heading text-xl font-semibold leading-tight text-oak">
                      Dodaj aplikację do telefonu
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-foreground/62">
                      Szybsze wejście i mniej problemów z logowaniem.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeOnce}
                  className="rounded-full p-2 text-foreground/45 transition hover:bg-muted hover:text-foreground"
                  aria-label="Zamknij"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {isAndroid && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-oak px-4 py-3 text-base font-semibold text-white shadow-lg shadow-oak/20 transition hover:bg-oak/90 disabled:opacity-60"
                  >
                    <Download className="h-5 w-5" />
                    {loading ? 'Otwieranie...' : 'Zainstaluj aplikację'}
                  </button>
                  <ol className="space-y-2">
                    <Step
                      number={1}
                      icon={<Download className="h-5 w-5" />}
                      title="Kliknij instalację"
                      text="Telefon pokaże okno dodania aplikacji."
                    />
                    <Step
                      number={2}
                      icon={<Check className="h-5 w-5" />}
                      title="Potwierdź"
                      text="Wybierz Zainstaluj albo Dodaj."
                    />
                    <Step
                      number={3}
                      icon={<Home className="h-5 w-5" />}
                      title="Gotowe"
                      text="Ikona pojawi się na ekranie telefonu."
                    />
                  </ol>
                </div>
              )}

              {isIOS && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-oak/12 bg-oak/5 p-3">
                    <p className="text-sm font-bold text-oak">
                      {isIosChrome ? 'Chrome na iPhonie' : 'Safari na iPhonie'}
                    </p>
                    <p className="mt-1 text-sm text-foreground/62">
                      Zrób te 3 kroki:
                    </p>
                  </div>

                  <ol className="space-y-2">
                    <Step
                      number={1}
                      icon={isIosChrome ? <MoreVertical className="h-5 w-5" /> : <Share className="h-5 w-5" />}
                      title={isIosChrome ? 'Otwórz menu Chrome' : 'Kliknij Udostępnij'}
                      text={isIosChrome ? 'Kliknij ikonę trzech kropek albo Udostępnij.' : 'To ikona kwadratu ze strzałką.'}
                    />
                    <Step
                      number={2}
                      icon={<PlusSquare className="h-5 w-5" />}
                      title="Dodaj do ekranu"
                      text="Wybierz Dodaj do ekranu początkowego."
                    />
                    <Step
                      number={3}
                      icon={<Check className="h-5 w-5" />}
                      title="Kliknij Dodaj"
                      text="Potwierdź w prawym górnym rogu."
                    />
                  </ol>

                  <div className="rounded-xl border border-caramel/20 bg-caramel/10 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-oak">
                      <Home className="h-4 w-4" />
                      Potem otwieraj panel z ikonki na ekranie telefonu.
                    </div>
                  </div>
                </div>
              )}

              {!isAndroid && !isIOS && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-oak px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    <Download className="h-5 w-5" />
                    {loading ? 'Otwieranie...' : 'Zainstaluj aplikację'}
                  </button>
                  <p className="text-sm text-foreground/62">
                    Możesz też użyć ikony instalacji w pasku adresu przeglądarki.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-oak/10 bg-white p-3">
              <div className="flex flex-col gap-2">
                {hasPendingPanelEntry && (
                  <button
                    type="button"
                    onClick={continueInBrowser}
                    className="min-h-11 rounded-xl border border-oak/20 px-4 py-2 text-sm font-semibold text-oak transition hover:bg-oak/5"
                  >
                    Kontynuuj bez instalacji
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeForever}
                  className="min-h-10 rounded-xl px-4 py-2 text-xs font-semibold text-foreground/48 transition hover:bg-muted hover:text-foreground/70"
                >
                  Nie pokazuj ponownie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {canShow && !modalOpen && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Zainstaluj aplikację"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-oak text-white shadow-lg shadow-oak/40 transition-opacity hover:opacity-90"
        >
          <Download className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

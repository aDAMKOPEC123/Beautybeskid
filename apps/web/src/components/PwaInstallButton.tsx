import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import {
  PWA_INSTALL_PROMPT_EVENT,
  type PwaInstallPromptDetail,
  usePwaInstall,
} from '@/hooks/usePwaInstall';

interface Props {
  className?: string;
}

const Step = ({ number, children }: { number: number; children: ReactNode }) => (
  <li className="flex gap-3 text-sm leading-relaxed text-foreground/76">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-oak text-xs font-bold text-white">
      {number}
    </span>
    <span>{children}</span>
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
          className="fixed inset-0 z-[80] flex items-end bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-oak/10 p-5">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-oak/10 text-oak">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="pwa-install-title" className="font-heading text-xl font-semibold text-oak">
                    Zainstaluj panel klienta
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/62">
                    Będziesz mieć szybki dostęp z ekranu głównego i stabilniejszą sesję logowania.
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

            <div className="max-h-[72vh] overflow-y-auto p-5">
              {isAndroid && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-foreground/72">
                    Kliknij przycisk poniżej. Telefon pokaże standardowe okno instalacji aplikacji BeskidStudio.
                  </p>
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-oak px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-oak/20 transition hover:bg-oak/90 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {loading ? 'Otwieranie instalacji...' : 'Zainstaluj aplikację'}
                  </button>
                  <p className="text-xs leading-relaxed text-foreground/50">
                    Jeśli okno instalacji się nie pokaże, otwórz menu Chrome <MoreVertical className="inline h-3.5 w-3.5" /> i wybierz
                    {' '}<strong>Zainstaluj aplikację</strong> albo <strong>Dodaj do ekranu głównego</strong>.
                  </p>
                </div>
              )}

              {isIOS && (
                <div className="space-y-5">
                  {isIosChrome ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
                      Na iPhonie instalacja PWA działa przez Safari. Jesteś teraz w Chrome, więc najpierw otwórz tę stronę w Safari.
                    </div>
                  ) : null}

                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-oak">
                      <Share className="h-4 w-4" />
                      Safari na iPhonie
                    </h3>
                    <ol className="mt-3 space-y-3">
                      <Step number={1}>
                        Otwórz stronę w <strong>Safari</strong>.
                      </Step>
                      <Step number={2}>
                        Na dole ekranu kliknij ikonę <strong>Udostępnij</strong>: kwadrat ze strzałką w górę.
                      </Step>
                      <Step number={3}>
                        Przewiń listę opcji w dół i wybierz <strong>Dodaj do ekranu początkowego</strong>.
                      </Step>
                      <Step number={4}>
                        Zostaw nazwę <strong>BeskidStudio</strong> i kliknij <strong>Dodaj</strong> w prawym górnym rogu.
                      </Step>
                      <Step number={5}>
                        Otwieraj panel z nowej ikonki na ekranie telefonu.
                      </Step>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-oak/12 bg-oak/5 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-oak">
                      <PlusSquare className="h-4 w-4" />
                      Chrome na iPhonie
                    </h3>
                    <ol className="mt-3 space-y-3">
                      <Step number={1}>
                        Kliknij pasek adresu, skopiuj adres strony albo wybierz <strong>Udostępnij</strong>.
                      </Step>
                      <Step number={2}>
                        Wybierz <strong>Otwórz w Safari</strong>. Jeśli nie widzisz tej opcji, skopiuj link i wklej go w Safari.
                      </Step>
                      <Step number={3}>
                        W Safari wykonaj kroki z sekcji powyżej.
                      </Step>
                    </ol>
                  </div>
                </div>
              )}

              {!isAndroid && !isIOS && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-foreground/72">
                    W przeglądarce na komputerze użyj ikony instalacji w pasku adresu albo menu przeglądarki.
                  </p>
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-oak px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {loading ? 'Otwieranie instalacji...' : 'Zainstaluj aplikację'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-oak/10 p-4">
              {hasPendingPanelEntry && (
                <button
                  type="button"
                  onClick={continueInBrowser}
                  className="min-h-11 rounded-lg border border-oak/20 px-4 py-2 text-sm font-semibold text-oak transition hover:bg-oak/5"
                >
                  Kontynuuj w przeglądarce
                </button>
              )}
              <button
                type="button"
                onClick={closeForever}
                className="min-h-10 rounded-lg px-4 py-2 text-xs font-semibold text-foreground/48 transition hover:bg-muted hover:text-foreground/70"
              >
                Nie pokazuj ponownie na tym urządzeniu
              </button>
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

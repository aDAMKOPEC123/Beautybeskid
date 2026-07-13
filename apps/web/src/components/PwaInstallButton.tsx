import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  Home,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import {
  PWA_INSTALL_PROMPT_EVENT,
  type PwaInstallPromptDetail,
  usePwaInstall,
} from '@/hooks/usePwaInstall';

interface Props {
  className?: string;
}

const IconPreview = ({
  icon,
  label,
  hint,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
}) => (
  <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-oak/14 bg-white px-2.5 py-2 align-middle shadow-sm">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-oak/10 text-oak">
      {icon}
    </span>
    <span className="min-w-0 text-left">
      <span className="block text-[12px] font-bold leading-tight text-oak">{label}</span>
      {hint && <span className="block text-[10px] leading-tight text-foreground/50">{hint}</span>}
    </span>
  </span>
);

const StepCard = ({
  number,
  icon,
  title,
  children,
}: {
  number: number;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) => (
  <li className="rounded-xl border border-oak/10 bg-white p-3.5 shadow-sm">
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-oak text-sm font-bold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-oak/10 text-oak">
            {icon}
          </span>
          <p className="text-sm font-bold text-foreground">{title}</p>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-foreground/68">{children}</div>
      </div>
    </div>
  </li>
);

const SectionTitle = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.16em] text-oak">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-oak/10 text-oak">{icon}</span>
    {children}
  </h3>
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
          <div className="flex h-[calc(100svh-1rem)] w-full flex-col overflow-hidden rounded-xl bg-[#fffdf9] shadow-2xl sm:h-auto sm:max-h-[min(760px,calc(100svh-2rem))] sm:max-w-lg">
            <div className="shrink-0 border-b border-oak/10 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-oak/10 text-oak">
                    <Smartphone className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel">
                      Panel klienta
                    </p>
                    <h2 id="pwa-install-title" className="mt-1 font-heading text-xl font-semibold leading-tight text-oak">
                      Zainstaluj aplikację na telefonie
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/62">
                      Ikona pojawi się na ekranie głównym, a panel będzie otwierał się jak zwykła aplikacja.
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {isAndroid && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-oak/12 bg-oak/5 p-4">
                    <SectionTitle icon={<Download className="h-4 w-4" />}>Android</SectionTitle>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                      Na Androidzie instalacja działa bez instrukcji ręcznej. Wystarczy kliknąć przycisk.
                    </p>
                    <button
                      type="button"
                      onClick={handleInstall}
                      disabled={loading}
                      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-oak px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-oak/20 transition hover:bg-oak/90 disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {loading ? 'Otwieranie instalacji...' : 'Zainstaluj aplikację'}
                    </button>
                  </div>

                  <div className="rounded-xl border border-oak/10 bg-white p-4">
                    <p className="text-sm font-semibold text-foreground">Gdyby okno instalacji się nie pokazało:</p>
                    <ol className="mt-3 space-y-3">
                      <StepCard number={1} icon={<MoreVertical className="h-4 w-4" />} title="Otwórz menu Chrome">
                        Kliknij ikonę trzech kropek w prawym górnym rogu przeglądarki.
                        <div className="mt-2">
                          <IconPreview icon={<MoreVertical className="h-4 w-4" />} label="Menu Chrome" hint="trzy kropki" />
                        </div>
                      </StepCard>
                      <StepCard number={2} icon={<Download className="h-4 w-4" />} title="Wybierz instalację">
                        Kliknij <strong>Zainstaluj aplikację</strong> albo <strong>Dodaj do ekranu głównego</strong>.
                      </StepCard>
                    </ol>
                  </div>
                </div>
              )}

              {isIOS && (
                <div className="space-y-4">
                  {isIosChrome ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                      <strong>Jesteś w Chrome na iPhonie.</strong> iPhone instaluje takie aplikacje przez Safari.
                      Najpierw otwórz tę stronę w Safari, potem wykonaj kroki poniżej.
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-oak/12 bg-oak/5 p-4">
                    <SectionTitle icon={<Compass className="h-4 w-4" />}>Safari na iPhonie</SectionTitle>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <IconPreview icon={<Compass className="h-4 w-4" />} label="Safari" hint="nie Chrome" />
                      <IconPreview icon={<Share className="h-4 w-4" />} label="Udostępnij" hint="kwadrat i strzałka" />
                      <IconPreview icon={<PlusSquare className="h-4 w-4" />} label="Dodaj" hint="do ekranu" />
                      <IconPreview icon={<Home className="h-4 w-4" />} label="Ikona appki" hint="na pulpicie" />
                    </div>
                  </div>

                  <ol className="space-y-3">
                    <StepCard number={1} icon={<Compass className="h-4 w-4" />} title="Otwórz tę stronę w Safari">
                      Upewnij się, że na dole lub górze widzisz pasek adresu Safari.
                    </StepCard>
                    <StepCard number={2} icon={<Share className="h-4 w-4" />} title="Kliknij Udostępnij">
                      Na dole ekranu kliknij ikonę:
                      <div className="mt-2">
                        <IconPreview icon={<Share className="h-4 w-4" />} label="Udostępnij" hint="kwadrat ze strzałką w górę" />
                      </div>
                    </StepCard>
                    <StepCard number={3} icon={<PlusSquare className="h-4 w-4" />} title="Wybierz Dodaj do ekranu">
                      Przewiń listę opcji w dół i kliknij <strong>Dodaj do ekranu początkowego</strong>.
                    </StepCard>
                    <StepCard number={4} icon={<CheckCircle2 className="h-4 w-4" />} title="Potwierdź dodanie">
                      Zostaw nazwę <strong>BeskidStudio</strong> i kliknij <strong>Dodaj</strong> w prawym górnym rogu.
                    </StepCard>
                    <StepCard number={5} icon={<Home className="h-4 w-4" />} title="Otwieraj z ikonki">
                      Wróć na ekran główny telefonu i otwieraj panel z nowej ikonki aplikacji.
                    </StepCard>
                  </ol>

                  <div className="rounded-xl border border-oak/12 bg-white p-4">
                    <SectionTitle icon={<MoreVertical className="h-4 w-4" />}>Chrome na iPhonie</SectionTitle>
                    <ol className="mt-3 space-y-3">
                      <StepCard number={1} icon={<Share className="h-4 w-4" />} title="Otwórz udostępnianie lub kopiowanie">
                        W Chrome kliknij <strong>Udostępnij</strong> albo skopiuj adres strony.
                      </StepCard>
                      <StepCard number={2} icon={<Copy className="h-4 w-4" />} title="Przenieś link do Safari">
                        Wybierz <strong>Otwórz w Safari</strong>. Jeśli nie widzisz tej opcji, wklej skopiowany link w Safari.
                      </StepCard>
                      <StepCard number={3} icon={<ArrowRight className="h-4 w-4" />} title="Dokończ w Safari">
                        W Safari wykonaj kroki z sekcji <strong>Safari na iPhonie</strong>.
                      </StepCard>
                    </ol>
                  </div>
                </div>
              )}

              {!isAndroid && !isIOS && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-oak/12 bg-oak/5 p-4">
                    <SectionTitle icon={<Download className="h-4 w-4" />}>Komputer</SectionTitle>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                      W przeglądarce na komputerze użyj ikony instalacji w pasku adresu albo menu przeglądarki.
                    </p>
                    <button
                      type="button"
                      onClick={handleInstall}
                      disabled={loading}
                      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-oak px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {loading ? 'Otwieranie instalacji...' : 'Zainstaluj aplikację'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-oak/10 bg-white p-3 sm:p-4">
              <div className="flex flex-col gap-2">
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

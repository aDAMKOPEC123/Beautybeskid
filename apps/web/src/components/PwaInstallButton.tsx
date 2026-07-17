import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Check, Download, Home, MoreHorizontal, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import {
  PWA_INSTALL_PROMPT_EVENT,
  markPwaInstallImpression,
  trackPwaInstallEvent,
  isMobileBrowser,
  isPwaAlreadyInstalled,
  isPwaInstallHiddenForever,
  isMobileAutoSnoozed,
  snoozeMobileAuto,
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
  active = false,
}: {
  number: number;
  icon: ReactNode;
  title: string;
  text: string;
  active?: boolean;
}) => (
  <li className={`flex gap-3 rounded-xl border p-3 shadow-sm ${active ? 'border-oak/22 bg-oak/5' : 'border-oak/10 bg-white'}`}>
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${active ? 'bg-espresso text-white' : 'bg-oak/10 text-oak'}`}>
      {number}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <IconBadge>{icon}</IconBadge>
        <div>
          <p className="text-sm font-bold leading-tight text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-snug text-foreground/75">{text}</p>
        </div>
      </div>
    </div>
  </li>
);

const PhonePreview = () => (
  <div className="mx-auto mb-4 flex w-full max-w-[230px] justify-center">
    <div className="relative h-[188px] w-[104px] rounded-[24px] border border-oak/20 bg-[#182f24] p-2 shadow-xl shadow-oak/15">
      <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/25" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="h-6 rounded-md bg-white/10" />
        ))}
      </div>
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-oak shadow-lg">
          <img src="/logo-64.webp" alt="" className="h-8 w-8" />
        </span>
        <span className="max-w-[74px] truncate text-[9px] font-semibold text-white">BeskidStudio</span>
      </div>
    </div>
  </div>
);

export function PwaInstallButton({ className }: Props) {
  const { canShow, isIOS, isStandalone, platform, install, dismiss, dismissForever } = usePwaInstall();
  const navigate = useNavigate();

  // Compute mobile auto-prompt eligibility once on mount (before first render)
  const shouldAutoPrompt = useRef(
    isMobileBrowser() && !isPwaAlreadyInstalled() && !isPwaInstallHiddenForever() && !isMobileAutoSnoozed()
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PwaInstallPromptDetail | null>(
    null
  );
  const [isAutoPrompt, setIsAutoPrompt] = useState(false);
  const impressionMarkedRef = useRef(false);
  const autoPromptCancelledRef = useRef(false);

  // Let the public page become interactive before offering installation.
  useEffect(() => {
    if (!shouldAutoPrompt.current) return;

    const timeoutId = window.setTimeout(() => {
      if (autoPromptCancelledRef.current) return;
      setPendingNavigation({ reason: 'manual' });
      setIsAutoPrompt(true);
      setModalOpen(true);
      trackPwaInstallEvent('mobile_auto_prompt_shown');
    }, 30_000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handlePromptRequest = (event: Event) => {
      if (isStandalone) return;
      autoPromptCancelledRef.current = true;
      const detail = (event as CustomEvent<PwaInstallPromptDetail>).detail ?? {};
      setPendingNavigation(detail);
      trackPwaInstallEvent('requested', { reason: detail.reason ?? 'manual' });
      setModalOpen(true);
    };

    window.addEventListener(PWA_INSTALL_PROMPT_EVENT, handlePromptRequest);
    return () => window.removeEventListener(PWA_INSTALL_PROMPT_EVENT, handlePromptRequest);
  }, [isStandalone]);

  const hasPendingPanelEntry = Boolean(pendingNavigation?.continueTo);
  const isAndroid = platform === 'android';
  const isIosChrome = platform === 'ios-chrome';

  const continueInBrowser = () => {
    const destination = pendingNavigation?.continueTo;
    setModalOpen(false);
    setPendingNavigation(null);
    trackPwaInstallEvent('continued_without_install', { reason: pendingNavigation?.reason });
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
    autoPromptCancelledRef.current = true;
    setModalOpen(false);
    setPendingNavigation(null);
    setIsAutoPrompt(false);
    trackPwaInstallEvent('maybe_later', { reason: pendingNavigation?.reason });
    if (isAutoPrompt) {
      snoozeMobileAuto(1);
    }
    dismiss('maybe-later');
  };

  const closeForever = () => {
    autoPromptCancelledRef.current = true;
    setModalOpen(false);
    setPendingNavigation(null);
    setIsAutoPrompt(false);
    dismissForever('footer-link');
  };

  const openManual = () => {
    autoPromptCancelledRef.current = true;
    setIsAutoPrompt(false);
    setPendingNavigation({ reason: 'manual' });
    trackPwaInstallEvent('floating_button_clicked');
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) {
      impressionMarkedRef.current = false;
      return;
    }
    if (impressionMarkedRef.current) return;
    impressionMarkedRef.current = true;
    markPwaInstallImpression(pendingNavigation?.reason ?? 'manual');
  }, [modalOpen, pendingNavigation?.reason]);

  if (isPwaAlreadyInstalled() || (!canShow && !modalOpen)) return null;

  const modal = modalOpen
    ? createPortal(
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
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-espresso text-white">
                    <Smartphone className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel">
                      {isAutoPrompt ? 'Aplikacja mobilna' : 'Panel klienta'}
                    </p>
                    <h2 id="pwa-install-title" className="mt-1 font-heading text-xl font-semibold leading-tight text-oak">
                      {isAutoPrompt ? 'Pobierz naszą aplikację' : 'Dodaj aplikację i wracaj do wizyt jednym kliknięciem'}
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-foreground/75">
                      Rezerwacje, terminy i zalecenia będą zawsze pod ręką. Zajmie to kilka sekund.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeOnce}
                  className="rounded-full p-2 text-foreground/70 transition hover:bg-muted hover:text-foreground"
                  aria-label="Zamknij"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <PhonePreview />

              {isAndroid && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={loading}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-espresso px-4 py-3 text-base font-semibold text-white shadow-lg shadow-espresso/20 transition hover:bg-espresso/90 disabled:opacity-60"
                  >
                    <Download className="h-5 w-5" />
                    {loading ? 'Otwieranie...' : 'Zainstaluj aplikację'}
                  </button>
                  <p className="text-center text-sm font-medium text-foreground/75">
                    Telefon pokaże krótkie potwierdzenie.
                  </p>
                </div>
              )}

              {isIOS && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-oak/12 bg-oak/5 p-3">
                    <p className="text-sm font-bold text-oak">
                      {isIosChrome ? 'Chrome na iPhonie' : 'Safari na iPhonie'}
                    </p>
                    <p className="mt-1 text-sm text-foreground/75">
                      Zrób tylko te 3 kroki.
                    </p>
                  </div>

                  <ol className="space-y-2">
                    <Step
                      number={1}
                      icon={<Share className="h-5 w-5" />}
                      title="Kliknij Udostępnij"
                      text={isIosChrome ? 'Ikona jest przy pasku adresu, obok linku.' : 'To kwadrat ze strzałką.'}
                      active
                    />
                    <Step
                      number={2}
                      icon={<PlusSquare className="h-5 w-5" />}
                      title="Do ekranu głównego"
                      text="Wybierz tę opcję z listy."
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
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-espresso px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    <Download className="h-5 w-5" />
                    {loading ? 'Otwieranie...' : 'Zainstaluj aplikację'}
                  </button>
                  <p className="text-sm text-foreground/75">
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
                    Kontynuuj teraz
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeOnce}
                  className="min-h-10 rounded-xl px-4 py-2 text-sm font-semibold text-foreground/75 transition hover:bg-muted hover:text-foreground"
                >
                  Może później
                </button>
                <button
                  type="button"
                  onClick={closeForever}
                  className="inline-flex min-h-8 items-center justify-center gap-1 rounded-xl px-4 py-1 text-[11px] font-semibold text-foreground/65 transition hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  Nie pokazuj więcej
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {modal}
      {canShow && !modalOpen && (
        <div className={`fixed right-4 z-50 flex flex-col items-end gap-2 ${className ?? 'bottom-20 md:bottom-4'}`}>
          <button
            type="button"
            onClick={openManual}
            aria-label="Zainstaluj aplikację"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-espresso text-white shadow-lg shadow-espresso/30 transition-opacity hover:opacity-90"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}

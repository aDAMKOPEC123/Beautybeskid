// apps/web/src/components/PwaInstallButton.tsx
import { useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallButton() {
  const { canShow, isIOS, install, dismiss, dismissForever } = usePwaInstall();
  const [cardOpen, setCardOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canShow) return null;

  const handleFabClick = () => setCardOpen((prev) => !prev);

  const handleInstall = async () => {
    setLoading(true);
    try {
      await install();
    } finally {
      setLoading(false);
      setCardOpen(false);
    }
  };

  const handleDismiss = () => {
    setCardOpen(false);
    dismiss();
  };

  const handleDismissForever = () => {
    setCardOpen(false);
    dismissForever();
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {cardOpen && (
        <div className="bg-white rounded-[14px] shadow-xl p-3.5 w-56 max-w-[calc(100vw-2rem)] animate-fade-in">
          {isIOS ? (
            <>
              <p className="font-semibold text-sm text-gray-800 mb-1.5">
                Dodaj do ekranu głównego
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                1. Kliknij <strong>Udostępnij</strong> (ikona na dole ekranu)
                <br />
                2. Wybierz <strong>"Dodaj do ekranu głównego"</strong>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 text-xs bg-gray-100 text-gray-600 rounded-lg py-1.5 font-medium"
                >
                  Zamknij
                </button>
                <button
                  onClick={handleDismissForever}
                  className="flex-1 text-xs bg-oak/10 text-oak border border-oak rounded-lg py-1.5 font-semibold"
                >
                  Nie pokazuj
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm text-gray-800 mb-0.5">
                Zainstaluj aplikację
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Szybki dostęp z ekranu głównego
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  disabled={loading}
                  className="flex-1 text-xs bg-oak text-white rounded-lg py-1.5 font-semibold disabled:opacity-60"
                >
                  {loading ? 'Instalowanie...' : 'Zainstaluj'}
                </button>
                <button
                  onClick={handleDismiss}
                  aria-label="Zamknij"
                  className="text-xs bg-gray-100 text-gray-500 rounded-lg px-3 py-1.5"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={handleFabClick}
        aria-label="Zainstaluj aplikację"
        className="w-12 h-12 rounded-full bg-oak text-white text-2xl flex items-center justify-center shadow-lg shadow-oak/40 hover:opacity-90 transition-opacity"
      >
        <span aria-hidden="true">📲</span>
      </button>
    </div>
  );
}

import { useState } from 'react';
import { Bell, X } from 'lucide-react';

interface PushPermissionPromptProps {
  onSubscribe: () => Promise<void>;
  onDismiss: () => void;
}

export const PushPermissionPrompt = ({ onSubscribe, onDismiss }: PushPermissionPromptProps) => {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await onSubscribe();
      localStorage.setItem('push_prompt_shown', '1');
    } catch {
      // subscribe() already shows a toast on failure — do NOT set flag so prompt can retry next session
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_shown', '1');
    onDismiss();
  };

  return (
    <>
      {/* Mobile: bottom sheet above bottom nav */}
      <div
        className="fixed bottom-16 inset-x-0 z-[70] md:hidden mx-3 mb-2 rounded-2xl shadow-xl border p-4"
        style={{ background: '#fff', borderColor: 'rgba(196,150,90,0.25)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(196,150,90,0.1)' }}
          >
            <Bell size={20} style={{ color: '#C4965A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#1A3828' }}>
              Włącz powiadomienia push
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(20,40,28,0.55)' }}>
              Bądź na bieżąco — dowiedz się o potwierdzeniu wizyty, nowych promocjach i komentarzach kosmetologa.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: '#1A3828', color: '#fff', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Włączanie…' : 'Włącz'}
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors border"
                style={{ borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(20,40,28,0.55)' }}
              >
                Nie teraz
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="shrink-0 p-1" style={{ color: 'rgba(20,40,28,0.3)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Desktop: floating card bottom-right */}
      <div
        className="hidden md:block fixed bottom-6 right-6 z-[70] w-80 rounded-2xl shadow-xl border p-5"
        style={{ background: '#fff', borderColor: 'rgba(196,150,90,0.25)' }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
          style={{ color: 'rgba(20,40,28,0.3)' }}
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(196,150,90,0.1)' }}
          >
            <Bell size={20} style={{ color: '#C4965A' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#1A3828' }}>
            Włącz powiadomienia push
          </p>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(20,40,28,0.55)' }}>
          Bądź na bieżąco — dowiedz się o potwierdzeniu wizyty, nowych promocjach i komentarzach kosmetologa.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: '#1A3828', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Włączanie…' : 'Włącz powiadomienia'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl text-xs font-medium border transition-colors"
            style={{ borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(20,40,28,0.55)' }}
          >
            Nie teraz
          </button>
        </div>
      </div>
    </>
  );
};

import { useEffect, useState } from 'react';
import { Fingerprint, X } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@cosmo/shared';
import { authApi } from '@/api/auth.api';
import {
  createPasskeyCredential,
  isPasskeySupported,
  storePasskeyAccount,
} from '@/lib/passkeys';

const DISMISS_KEY = 'cosmo-passkey-setup-dismissed';

export const PasskeySetupPrompt = ({ user }: { user: User | null }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user?.id) return;
      if (localStorage.getItem(DISMISS_KEY) === user.id) return;
      if (!(await isPasskeySupported())) return;

      const status = await authApi.getPasskeyStatus();
      if (!cancelled && !status.enabled) setVisible(true);
    };

    check().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!visible || !user) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, user.id);
    } catch {}
    setVisible(false);
  };

  const enable = async () => {
    try {
      setLoading(true);
      const options = await authApi.getPasskeyRegistrationOptions();
      const credential = await createPasskeyCredential(options);
      await authApi.verifyPasskeyRegistration(credential);
      storePasskeyAccount(user);
      toast.success('Logowanie Face ID / biometrią zostało włączone.');
      setVisible(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Nie udało się włączyć biometrii.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-xl border border-oak/12 bg-white p-3 shadow-2xl">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-oak/10 text-oak">
          <Fingerprint className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Włącz szybkie logowanie</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Po wylogowaniu wejdziesz Face ID albo odciskiem palca.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={enable}
              disabled={loading}
              className="min-h-10 flex-1 rounded-lg bg-oak px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Włączanie...' : 'Włącz'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-10 rounded-lg px-3 text-sm font-semibold text-foreground/60 hover:bg-muted"
            >
              Później
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-muted"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// filepath: apps/web/src/pages/auth/Login.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, LoginInput } from '@cosmo/shared';
import { Fingerprint } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { FacebookAuthButton, facebookErrorMessages } from '@/components/auth/FacebookAuthButton';
import { getPanelPath } from '@/lib/panel-routing';
import { PageSEO } from '@/components/shared/SEO';
import {
  getPasskeyCredential,
  getStoredPasskeyAccount,
  isPasskeySupported,
} from '@/lib/passkeys';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyAccount] = useState(() => getStoredPasskeyAccount());
  const [rememberMe, setRememberMe] = useState(true);
  const { user, setAccessToken, setUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const panelEntry = Boolean((location.state as { panelEntry?: boolean } | null)?.panelEntry);
  const pwaPromptAfterLogin = Boolean((location.state as { pwaPromptAfterLogin?: boolean } | null)?.pwaPromptAfterLogin);
  const { isSupported, permission, subscribe } = usePushSubscription();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from || getPanelPath(user?.role), { replace: true });
      return;
    }
  }, [from, isAuthenticated, navigate, user?.role]);

  useEffect(() => {
    let cancelled = false;
    const checkPasskey = async () => {
      if (!passkeyAccount) return;
      const supported = await isPasskeySupported();
      if (!cancelled) setPasskeyAvailable(supported);
    };
    checkPasskey();
    return () => {
      cancelled = true;
    };
  }, [passkeyAccount]);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Konto aktywowane! Możesz się teraz zalogować.');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('error') === 'invalid-token') {
      toast.error('Link aktywacyjny jest nieprawidłowy lub został już użyty.');
      setSearchParams({}, { replace: true });
    }
    const facebookError = searchParams.get('facebookError');
    if (facebookError) {
      toast.error(
        facebookErrorMessages[facebookError] ?? facebookErrorMessages['facebook-failed'],
      );
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true);
      const res = await authApi.login({ ...data, rememberMe });
      setAccessToken(res.accessToken);
      setUser(res.user);

      if (res.user?.mustChangePassword) {
        navigate('/user/zmien-haslo', { replace: true });
        return;
      }

      toast.success('Zalogowano pomyślnie.');
      if (isSupported && permission !== 'denied') {
        setTimeout(() => subscribe(), 1000);
      }
      navigate(from || getPanelPath(res.user?.role), {
        replace: true,
        state: pwaPromptAfterLogin ? { pwaPromptReason: 'post-login' } : undefined,
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!passkeyAccount) return;

    try {
      setPasskeyLoading(true);
      const options = await authApi.getPasskeyLoginOptions(passkeyAccount.userId);
      const credential = await getPasskeyCredential(options);
      const res = await authApi.verifyPasskeyLogin(passkeyAccount.userId, credential);
      setAccessToken(res.accessToken);
      setUser(res.user);

      toast.success('Zalogowano biometrycznie.');
      if (isSupported && permission !== 'denied') {
        setTimeout(() => subscribe(), 1000);
      }
      navigate(from || getPanelPath(res.user?.role), {
        replace: true,
        state: pwaPromptAfterLogin ? { pwaPromptReason: 'post-login' } : undefined,
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Nie udało się zalogować biometrycznie.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <PageSEO
        title="Logowanie"
        description="Zaloguj się do swojego konta w salonie BeskidStudio By Wiktoria Ćwik."
        noIndex
      />
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          {panelEntry && (
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-oak">
              Wejście do panelu klienta
            </p>
          )}
          <CardTitle className="text-3xl text-center font-heading text-primary font-bold">
            {panelEntry ? 'Zaloguj się do panelu' : 'Logowanie'}
          </CardTitle>
          {panelEntry && (
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              Po zalogowaniu przejdziesz od razu do swojego konta, wizyt i zaleceń.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {passkeyAvailable && passkeyAccount && (
            <div className="mb-5 rounded-xl border border-oak/12 bg-oak/5 p-3">
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-oak px-4 text-sm font-semibold text-white shadow-lg shadow-oak/15 disabled:opacity-60"
              >
                <Fingerprint className="h-5 w-5" />
                {passkeyLoading ? 'Potwierdzanie...' : 'Zaloguj przez Face ID / biometrię'}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Konto: {passkeyAccount.name}
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="sr-only">Adres email</label>
              <Input id="login-email" type="email" autoComplete="email" placeholder="Twój email" className="bg-muted/50 py-6" {...register('email')} />
              {errors.email && <span className="text-xs text-destructive mt-1 block px-1">{errors.email.message as string}</span>}
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">Hasło</label>
              <Input id="login-password" type="password" autoComplete="current-password" placeholder="Hasło" className="bg-muted/50 py-6" {...register('password')} />
              {errors.password && <span className="text-xs text-destructive mt-1 block px-1">{errors.password.message as string}</span>}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Zapamiętaj mnie
                </label>
              </div>
              <Link to="/auth/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Zapomniałeś hasła?</Link>
            </div>
            <Button type="submit" className="w-full py-6 text-base font-semibold shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
          </form>

          {/* Google OAuth */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">lub</span>
            </div>
          </div>
          <div className="space-y-3">
            <GoogleAuthButton mode="login" />
            <FacebookAuthButton mode="login" returnTo={from} />
            <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
              Jeśli nie masz jeszcze konta, kontynuując przez Google lub Facebook utworzysz je i akceptujesz{' '}
              <a href="/regulamin" target="_blank" rel="noreferrer" className="text-primary underline hover:opacity-80">
                regulamin i politykę prywatności
              </a>
              .
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground border-t pt-6 bg-muted/10 rounded-b-xl">
          Nie masz konta? <Link to="/auth/register" className="ml-2 font-bold text-primary hover:underline">Zarejestruj się</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

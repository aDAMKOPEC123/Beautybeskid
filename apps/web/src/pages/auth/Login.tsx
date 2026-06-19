// filepath: apps/web/src/pages/auth/Login.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, LoginInput } from '@cosmo/shared';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { setAccessToken, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const { isSupported, permission, subscribe } = usePushSubscription();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Konto aktywowane! Możesz się teraz zalogować.');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('error') === 'invalid-token') {
      toast.error('Link aktywacyjny jest nieprawidłowy lub został już użyty.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true);
      const res = await authApi.login({ ...data, rememberMe });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);

      if (res.data.user?.mustChangePassword) {
        navigate('/user/zmien-haslo', { replace: true });
        return;
      }

      toast.success('Zalogowano pomyślnie.');
      if (isSupported && permission !== 'denied') {
        setTimeout(() => subscribe(), 1000);
      }
      navigate(from, { replace: true });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-heading text-primary font-bold">Logowanie</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Input type="email" placeholder="Twój email" className="bg-muted/50 py-6" {...register('email')} />
              {errors.email && <span className="text-xs text-destructive mt-1 block px-1">{errors.email.message as string}</span>}
            </div>
            <div>
              <Input type="password" placeholder="Hasło" className="bg-muted/50 py-6" {...register('password')} />
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
          <GoogleAuthButton />
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground border-t pt-6 bg-muted/10 rounded-b-xl">
          Nie masz konta? <Link to="/auth/register" className="ml-2 font-bold text-primary hover:underline">Zarejestruj się</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

// filepath: apps/web/src/pages/auth/ResetPassword.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@cosmo/shared';
import { authApi } from '@/api/auth.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageSEO } from '@/components/shared/SEO';

export const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onSubmit = async (data: any) => {
    if (!token) return toast.error('Brak tokenu!');
    try {
      setLoading(true);
      await authApi.resetPassword({ token, password: data.password });
      toast.success('Hasło zmienione. Możesz się zalogować.');
      navigate('/auth/login');
    } catch (e: any) {
      const msg: string = e.response?.data?.message || 'Wystąpił błąd.';
      if (msg.toLowerCase().includes('wygasł') || msg.toLowerCase().includes('nieprawidłowy')) {
        setExpired(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex justify-center p-8">
        <PageSEO title="Reset hasła" description="Resetowanie hasła." canonical="/auth/reset-password" noIndex />
        <Card className="w-full max-w-md p-8 text-center text-destructive border-destructive">
          <h1 className="text-2xl font-heading font-bold">Nieprawidłowy link</h1>
          <p className="mt-3">W adresie brakuje tokenu resetowania hasła.</p>
        </Card>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
        <PageSEO title="Link resetowania wygasł" description="Link resetowania hasła wygasł." canonical="/auth/reset-password" noIndex />
        <Card className="w-full max-w-md animate-enter">
          <CardHeader>
            <h1 className="text-2xl text-center font-heading text-destructive font-bold">Link wygasł</h1>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Link do resetu hasła jest ważny przez <strong>1 godzinę</strong>. Wyślij nowy link i spróbuj ponownie.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full py-6 text-base font-semibold">
              <Link to="/auth/forgot-password">Wyślij nowy link</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/auth/login">Wróć do logowania</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <PageSEO title="Nowe hasło" description="Ustaw nowe hasło do konta." canonical="/auth/reset-password" noIndex />
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <h1 className="text-3xl text-center font-heading text-primary font-bold">Nowe hasło</h1>
          <p className="text-center text-sm text-muted-foreground mt-2">Podaj nowe, silne hasło i je zapamiętaj.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="sr-only">Nowe hasło</label>
              <Input id="reset-password" type="password" autoComplete="new-password" placeholder="Podaj nowe hasło" className="bg-muted/50 py-6" {...register('password')} />
              {errors.password && <span className="text-xs text-destructive mt-1 block px-1">{errors.password.message as string}</span>}
            </div>
            <Button type="submit" className="w-full py-6 mt-4 text-base font-semibold shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zmień hasło i przejdź do logowania'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

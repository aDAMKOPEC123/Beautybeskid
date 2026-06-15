// filepath: apps/web/src/pages/auth/ResetPassword.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@cosmo/shared';
import { authApi } from '@/api/auth.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
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
      toast.error(e.response?.data?.message || 'Wystąpił błąd.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex justify-center p-8">
        <Card className="w-full max-w-md p-8 text-center text-destructive border-destructive">
          Nieprawidłowy link do resetu hasła (brak tokenu).
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-heading text-primary font-bold">Nowe Hasło</CardTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">Podaj nowe, silne hasło i je zapamiętaj.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input type="password" placeholder="Podaj nowe hasło" className="bg-muted/50 py-6" {...register('password')} />
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

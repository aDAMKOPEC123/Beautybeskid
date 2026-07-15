// filepath: apps/web/src/pages/auth/ForgotPassword.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { forgotPasswordSchema } from '@cosmo/shared';
import { authApi } from '@/api/auth.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { PageSEO } from '@/components/shared/SEO';

export const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      await authApi.forgotPassword(data);
      toast.success('Jeśli podany adres istnieje w bazie, wysłano na niego link resetujący hasło.');
      reset();
    } catch (e: any) {
      toast.error('Wystąpił błąd.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <PageSEO
        title="Resetowanie hasła"
        description="Zresetuj hasło do konta w BeskidStudio By Wiktoria Ćwik."
        canonical="/auth/forgot-password"
        noIndex
      />
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <h1 className="text-3xl text-center font-heading text-primary font-bold">Zresetuj hasło</h1>
          <p className="text-center text-sm text-muted-foreground mt-2">Podaj email przypisany do Twojego konta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div>
              <label htmlFor="forgot-email" className="sr-only">Adres email</label>
              <Input id="forgot-email" type="email" autoComplete="email" placeholder="Twój email" className="bg-muted/50 py-6" {...register('email')} />
              {errors.email && <span className="text-xs text-destructive mt-1 block px-1">{errors.email.message as string}</span>}
            </div>
            <Button type="submit" className="w-full py-6 text-base font-semibold shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm border-t pt-6 bg-muted/10 rounded-b-xl">
          <Link to="/auth/login" className="font-bold text-primary hover:underline">Powrót do logowania</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

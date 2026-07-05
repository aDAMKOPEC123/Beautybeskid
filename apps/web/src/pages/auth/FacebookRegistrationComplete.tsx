import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { PageSEO } from '@/components/shared/SEO';

type Provider = 'Facebook' | 'Google';

const SocialRegistrationComplete = ({ provider }: { provider: Provider }) => {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const request =
      provider === 'Facebook'
        ? authApi.getFacebookRegistration()
        : authApi.getGoogleRegistration();

    request
      .then((data) => {
        if (!active) return;
        setName(data.name);
        setEmail(data.email);
      })
      .catch(() => {
        if (!active) return;
        toast.error(`Rejestracja przez ${provider} wygasła. Rozpocznij ją ponownie.`);
        navigate('/auth/register', { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, provider]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+\s+\S+/.test(name.trim())) {
      toast.error('Podaj imię i nazwisko.');
      return;
    }
    if (!/^[+0-9()\s-]{7,30}$/.test(phone.trim())) {
      toast.error('Podaj prawidłowy numer telefonu.');
      return;
    }

    try {
      setSubmitting(true);
      const form = { name: name.trim(), phone: phone.trim() };
      const result =
        provider === 'Facebook'
          ? await authApi.completeFacebookRegistration(form)
          : await authApi.completeGoogleRegistration(form);
      setAccessToken(result.accessToken);
      setUser(result.user);
      toast.success('Konto zostało utworzone.');
      navigate('/user', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się dokończyć rejestracji.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-b-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <PageSEO title="Dokończ rejestrację" description="Uzupełnij dane rejestracyjne." noIndex />
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <CardTitle className="text-center font-heading text-3xl font-bold text-primary">
            Dokończ rejestrację
          </CardTitle>
          <p className="pt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Potrzebujemy tylko danych niezbędnych do obsługi wizyt. Resztę informacji uzupełnisz później w profilu.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="social-name" className="mb-1.5 block text-sm font-medium">
                Imię i nazwisko
              </label>
              <Input
                id="social-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="bg-muted/50 py-6"
                required
              />
            </div>
            <div>
              <label htmlFor="social-phone" className="mb-1.5 block text-sm font-medium">
                Numer telefonu
              </label>
              <Input
                id="social-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="np. +48 532 128 227"
                autoComplete="tel"
                className="bg-muted/50 py-6"
                required
              />
            </div>
            <div>
              <label htmlFor="social-email" className="mb-1.5 block text-sm font-medium">
                Email z konta {provider}
              </label>
              <Input
                id="social-email"
                type="email"
                value={email}
                className="bg-muted/30 py-6 text-muted-foreground"
                readOnly
              />
            </div>
            <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={submitting}>
              {submitting ? 'Tworzenie konta…' : 'Utwórz konto'}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Klikając „Utwórz konto”, potwierdzasz akceptację{' '}
              <a href="/regulamin" target="_blank" rel="noreferrer" className="text-primary underline">
                regulaminu i polityki prywatności
              </a>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const FacebookRegistrationComplete = () => (
  <SocialRegistrationComplete provider="Facebook" />
);

export const GoogleRegistrationComplete = () => (
  <SocialRegistrationComplete provider="Google" />
);

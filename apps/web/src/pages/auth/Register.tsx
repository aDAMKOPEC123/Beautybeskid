// filepath: apps/web/src/pages/auth/Register.tsx
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { registerSchema } from '@cosmo/shared';
import { authApi } from '@/api/auth.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Camera, ImageIcon, UserRound } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

export const Register = () => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: any) => {
    if (!termsAccepted) {
      toast.error('Musisz zaakceptować regulamin, aby się zarejestrować.');
      return;
    }
    try {
      setLoading(true);
      await authApi.register(data, avatar ?? undefined, termsAccepted, marketingConsent, photoConsent);
      setRegisteredEmail(data.email);
      setEmailSent(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {emailSent ? (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
          <Card className="w-full max-w-md animate-enter">
            <CardHeader>
              <CardTitle className="text-3xl text-center font-heading text-primary font-bold">Sprawdź skrzynkę</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Wysłaliśmy link aktywacyjny na adres
              </p>
              <p className="font-semibold text-foreground">{registeredEmail}</p>
              <p className="text-sm text-muted-foreground">
                Kliknij link w emailu, aby aktywować konto i zalogować się.
              </p>
            </CardContent>
            <CardFooter className="justify-center text-sm text-muted-foreground border-t pt-6 bg-muted/10 rounded-b-xl">
              Masz już konto? <Link to="/auth/login" className="ml-2 font-bold text-primary hover:underline">Zaloguj się</Link>
            </CardFooter>
          </Card>
        </div>
      ) : (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-heading text-primary font-bold">Rejestracja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-3 pb-2">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserRound className="w-8 h-8 text-primary/40" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Zdjęcie profilowe (opcjonalne)</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-1" /> Galeria
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> Aparat
                </Button>
              </div>
              <input ref={galleryInputRef} type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/bmp,image/tiff"
                className="hidden" onChange={handleFileSelect} />
              <input ref={cameraInputRef} type="file"
                accept="image/*" capture="user"
                className="hidden" onChange={handleFileSelect} />
            </div>
            <div>
              <Input placeholder="Imię i nazwisko" className="bg-muted/50 py-6" {...register('name')} />
              {errors.name && <span className="text-xs text-destructive mt-1 block px-1">{errors.name.message as string}</span>}
            </div>
            <div>
              <Input type="email" placeholder="Twój email" className="bg-muted/50 py-6" {...register('email')} />
              {errors.email && <span className="text-xs text-destructive mt-1 block px-1">{errors.email.message as string}</span>}
            </div>
            <div>
              <Input type="tel" placeholder="Telefon (opcjonalnie)" className="bg-muted/50 py-6" {...register('phone')} />
            </div>
            <div>
              <Input
                placeholder="Kod ambasadorski (opcjonalnie)"
                className="bg-muted/50 py-6 uppercase"
                {...register('ambassadorCode')}
                onChange={e => {
                  e.target.value = e.target.value.toUpperCase();
                  register('ambassadorCode').onChange(e);
                }}
              />
            </div>
            <div>
              <Input type="password" placeholder="Hasło" className="bg-muted/50 py-6" {...register('password')} />
              {errors.password && <span className="text-xs text-destructive mt-1 block px-1">{errors.password.message as string}</span>}
            </div>
            <div className="space-y-3 pt-2 border-t border-border/50">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span className="text-sm text-foreground">
                  Akceptuję{' '}
                  <a href="/regulamin" target="_blank" className="text-primary underline hover:opacity-80">
                    regulamin gabinetu COSMO
                  </a>{' '}
                  <span className="text-destructive font-bold">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={e => setMarketingConsent(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span className="text-sm text-muted-foreground">
                  Wyrażam zgodę na otrzymywanie powiadomień marketingowych (promocje, newsletter, SMS) — opcjonalne
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={e => setPhotoConsent(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span className="text-sm text-muted-foreground">
                  Wyrażam zgodę na wykorzystanie zdjęć efektów zabiegów w celach marketingowych — opcjonalne
                </span>
              </label>

              <p className="text-xs text-muted-foreground pl-1">
                <span className="text-destructive font-bold">*</span> Pole wymagane
              </p>
            </div>

            <Button type="submit" className="w-full py-6 mt-4 text-base font-semibold shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
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
          Masz już konto? <Link to="/auth/login" className="ml-2 font-bold text-primary hover:underline">Zaloguj się</Link>
        </CardFooter>
      </Card>
    </div>
      )}
    </>
  );
};

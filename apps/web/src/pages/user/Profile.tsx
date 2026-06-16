import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { api } from '@/lib/axios';
import { Loader2, Bell, BellOff, X } from 'lucide-react';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from 'sonner';
import { useTour } from '@/hooks/useTour';
import { DecoLine } from '@/components/shared/DecoElements';

export const UserProfile = () => {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { startTour } = useTour();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushSubscription();

  const handleRestartTour = async () => {
    try {
      await usersApi.updateOnboarding(false);
    } catch {
      // non-blocking — start tour even if PATCH fails
    }
    startTour();
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const res = await api.get('/terms');
      return res.data.data.terms;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile-consents'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data.user;
    },
  });

  const [marketingConsent, setMarketingConsent] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [cardAllergies, setCardAllergies] = useState('');
  const [cardConditions, setCardConditions] = useState('');
  const [cardPreferences, setCardPreferences] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setMarketingConsent(profile.marketingConsent ?? false);
      setPhotoConsent(profile.photoConsent ?? false);
      setCardAllergies(profile.cardAllergies ?? '');
      setCardConditions(profile.cardConditions ?? '');
      setCardPreferences(profile.cardPreferences ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (isEditModalOpen) {
      setEditName(user?.name ?? '');
      setEditPhone(user?.phone ?? '');
    }
  }, [isEditModalOpen, user]);

  useEffect(() => {
    if (!isEditModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEditModalOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isEditModalOpen]);

  const { mutate: saveCard, isPending: savingCard } = useMutation({
    mutationFn: () => usersApi.updateMyCard({ cardAllergies, cardConditions, cardPreferences }),
    onSuccess: () => {
      toast.success('Kartoteka została zapisana.');
      queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
    },
    onError: () => toast.error('Nie udało się zapisać kartoteki.'),
  });

  const { mutate: saveConsents, isPending: savingConsents } = useMutation({
    mutationFn: (data: { marketingConsent: boolean; photoConsent: boolean }) =>
      api.patch('/users/me/consents', data),
    onSuccess: () => {
      toast.success('Zgody zostały zaktualizowane.');
      queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
    },
    onError: () => toast.error('Nie udało się zapisać zgód.'),
  });

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        name: editName.trim(),
        phone: editPhone.trim() || null,
      }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
      toast.success('Dane zostały zaktualizowane.');
      setIsEditModalOpen(false);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Nie udało się zaktualizować danych.'),
  });

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      toast.error('Imię i nazwisko nie może być puste.');
      return;
    }
    saveProfile();
  };

  const { mutate: doChangePassword, isPending: changingPassword } = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Hasło zostało zmienione.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Błąd zmiany hasła'),
  });

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error('Podaj obecne hasło');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Nowe hasła nie są identyczne');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }
    doChangePassword();
  };

  const { mutate: uploadAvatar, isPending } = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setUploadError(null);
    },
    onError: () => setUploadError('Nie udało się przesłać zdjęcia. Spróbuj ponownie.'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
  };

  const cardSection = (
    title: string,
    subtitle?: string,
    children?: React.ReactNode,
    headerAction?: React.ReactNode,
  ) => (
    <div
      className="max-w-xl rounded-[20px] overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', background: '#fff' }}
    >
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <DecoLine />
            <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
              {title}
            </span>
          </div>
          {headerAction}
        </div>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'rgba(20,40,28,0.5)' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 animate-enter" data-tour="profile-form">
      <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A3828' }}>Twój Profil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-24 h-24 rounded-full cursor-pointer group"
          onClick={() => !isPending && fileInputRef.current?.click()}
        >
          {user?.avatarPath ? (
            <img
              src={user.avatarPath}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover ring-2 ring-caramel/40 shadow-[0_0_20px_rgba(196,150,90,0.2)]"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold ring-2 ring-caramel/40 shadow-[0_0_20px_rgba(196,150,90,0.2)]"
              style={{ background: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}

          {!isPending && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Zmień</span>
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        <p className="text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>Kliknij, aby zmienić zdjęcie profilowe</p>
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/bmp,image/tiff"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Account data */}
      {cardSection(
        'Dane konta',
        undefined,
        <div>
          {[
            { label: 'Imię i nazwisko', value: user?.name },
            { label: 'Adres Email', value: user?.email },
            { label: 'Numer telefonu', value: user?.phone || 'Brak wpisanego telefonu' },
          ].map(({ label, value }, idx, arr) => (
            <div
              key={label}
              className="grid grid-cols-3 py-5 px-6 transition-colors"
              style={{
                borderBottom: idx < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : undefined,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              <span className="font-medium flex items-center" style={{ color: 'rgba(20,40,28,0.5)' }}>{label}</span>
              <span className="col-span-2 font-semibold text-lg" style={{ color: '#1A3828' }}>{value}</span>
            </div>
          ))}
        </div>,
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#1A3828' }}
        >
          Edytuj dane
        </button>
      )}

      {/* Patient card */}
      {cardSection(
        'Kartoteka',
        'Uzupełnij informacje, które pomogą nam lepiej dopasować zabiegi do Twoich potrzeb.',
        <div className="p-6 space-y-4">
          {[
            { label: 'Alergie / uczulenia', value: cardAllergies, setter: setCardAllergies, placeholder: 'Np. alergia na lateks, nikiel...' },
            { label: 'Dolegliwości', value: cardConditions, setter: setCardConditions, placeholder: 'Np. cukrzyca, choroby skóry...' },
            { label: 'Upodobania', value: cardPreferences, setter: setCardPreferences, placeholder: 'Np. preferuję zabiegi bez perfum...' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1A3828' }}>{label}</label>
              <textarea
                className="w-full rounded-xl px-3 py-3 text-sm resize-none outline-none transition-colors"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5', minHeight: '48px' }}
                rows={2}
                placeholder={placeholder}
                value={value}
                onChange={e => setter(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = '#C4965A'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
              />
            </div>
          ))}
          <div className="pt-1">
            <button
              onClick={() => saveCard()}
              disabled={savingCard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: '#1A3828', color: '#fff' }}
            >
              {savingCard && <Loader2 className="w-4 h-4 animate-spin" />}
              Zapisz kartotekę
            </button>
          </div>
        </div>
      )}

      {/* Consents */}
      {cardSection(
        'Zgody',
        'Możesz w dowolnym momencie zmienić swoje zgody opcjonalne.',
        <div className="p-6 space-y-5">
          {[
            {
              checked: marketingConsent,
              setter: setMarketingConsent,
              title: 'Zgoda marketingowa',
              desc: 'Powiadomienia o promocjach i nowościach, newsletter, komunikaty SMS/e-mail.',
            },
            {
              checked: photoConsent,
              setter: setPhotoConsent,
              title: 'Zgoda na wykorzystanie zdjęć',
              desc: 'Zdjęcia efektów zabiegów mogą być wykorzystane w celach dokumentacyjnych i marketingowych.',
            },
          ].map(({ checked, setter, title, desc }) => (
            <label key={title} className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setter(e.target.checked)}
                className="mt-1 w-4 h-4"
                style={{ accentColor: '#C4965A' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1A3828' }}>{title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(20,40,28,0.5)' }}>{desc}</p>
              </div>
            </label>
          ))}
          <div className="pt-1">
            <button
              onClick={() => saveConsents({ marketingConsent, photoConsent })}
              disabled={savingConsents}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: '#1A3828', color: '#fff' }}
            >
              {savingConsents && <Loader2 className="w-4 h-4 animate-spin" />}
              Zapisz zgody
            </button>
          </div>
        </div>
      )}

      {/* Terms */}
      {terms && cardSection(
        'Regulamin',
        `Wersja: ${terms.version} · Ostatnia aktualizacja: ${new Date(terms.updatedAt).toLocaleDateString('pl-PL')}`,
        <div className="p-6">
          <div className="max-h-96 overflow-y-auto pr-1">
            <pre
              className="whitespace-pre-wrap text-xs leading-relaxed font-sans"
              style={{ color: 'rgba(20,40,28,0.55)' }}
            >
              {terms.content}
            </pre>
          </div>
        </div>
      )}

      {/* Push notifications */}
      {isSupported && (
        <section className="mt-8">
          <h3
            className="text-sm font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'rgba(20,40,28,0.4)', letterSpacing: '0.12em' }}
          >
            Powiadomienia push
          </h3>
          <div
            className="flex items-center justify-between p-4 rounded-2xl border"
            style={{ borderColor: 'rgba(0,0,0,0.07)', background: 'rgba(250,250,249,0.8)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(196,150,90,0.1)' }}
              >
                {isSubscribed ? (
                  <Bell size={18} style={{ color: '#C4965A' }} />
                ) : (
                  <BellOff size={18} style={{ color: 'rgba(20,40,28,0.35)' }} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1A3828' }}>
                  {isSubscribed ? 'Powiadomienia aktywne' : 'Powiadomienia wyłączone'}
                </p>
                <p className="text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
                  {permission === 'denied'
                    ? 'Zablokowane w ustawieniach przeglądarki'
                    : isSubscribed
                    ? 'Otrzymujesz powiadomienia o wizytach i promocjach'
                    : 'Włącz, aby być na bieżąco z wizytami i promocjami'}
                </p>
              </div>
            </div>
            {permission !== 'denied' && (
              <button
                onClick={isSubscribed ? unsubscribe : subscribe}
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                style={
                  isSubscribed
                    ? { background: 'rgba(0,0,0,0.05)', color: 'rgba(20,40,28,0.6)' }
                    : { background: '#1A3828', color: '#fff' }
                }
              >
                {isSubscribed ? 'Wyłącz' : 'Włącz'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Change password */}
      {cardSection(
        'Zmiana hasła',
        undefined,
        <div className="p-6 space-y-4">
          {[
            { label: 'Obecne hasło', id: 'pwd-current', autocomplete: 'current-password', value: currentPassword, setter: setCurrentPassword },
            { label: 'Nowe hasło (min. 8 znaków)', id: 'pwd-new', autocomplete: 'new-password', value: newPassword, setter: setNewPassword },
            { label: 'Powtórz nowe hasło', id: 'pwd-confirm', autocomplete: 'new-password', value: confirmPassword, setter: setConfirmPassword },
          ].map(({ label, id, autocomplete, value, setter }) => (
            <div key={id} className="space-y-1.5">
              <label htmlFor={id} className="text-sm font-medium" style={{ color: '#1A3828' }}>{label}</label>
              <input
                id={id}
                type="password"
                autoComplete={autocomplete}
                className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5' }}
                value={value}
                onChange={(e) => setter(e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
              />
            </div>
          ))}
          <div className="pt-1">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: '#1A3828', color: '#fff' }}
            >
              {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              Zmień hasło
            </button>
          </div>
        </div>
      )}

      {/* Restart tour */}
      <div className="max-w-xl pt-4 border-t border-border/50">
        <button
          onClick={handleRestartTour}
          type="button"
          className="text-sm font-medium px-4 py-2 rounded-full border border-border text-foreground transition-colors hover:bg-accent flex items-center gap-2"
        >
          <span>↺</span>
          Powtórz przewodnik po aplikacji
        </button>
      </div>

      {/* Edit personal data modal — rendered via portal to avoid z-index issues inside scrollable container */}
      {isEditModalOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="rounded-[20px] bg-white max-w-md w-full mx-4"
            style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DecoLine />
                  <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
                    Edytuj dane
                  </span>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ color: 'rgba(20,40,28,0.4)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="text-sm font-medium" style={{ color: '#1A3828' }}>
                  Imię i nazwisko
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
                  style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5' }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-phone" className="text-sm font-medium" style={{ color: '#1A3828' }}>
                  Numer telefonu <span className="font-normal" style={{ color: 'rgba(20,40,28,0.4)' }}>(opcjonalny)</span>
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
                  style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5' }}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: '#1A3828' }}>
                  Adres e-mail
                </label>
                <p
                  className="text-sm px-3 py-3 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.03)', color: 'rgba(20,40,28,0.5)' }}
                >
                  {user?.email}{' '}
                  <span className="text-xs italic">— nie można zmienić</span>
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                  style={{ background: '#1A3828', color: '#fff' }}
                >
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Zapisz zmiany
                </button>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold border transition-colors hover:bg-gray-50 disabled:opacity-60"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#1A3828' }}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

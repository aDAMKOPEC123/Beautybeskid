import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { trackAcademyEvent } from '@/lib/academyAnalytics';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';

export function AcademyAuth({ mode }: { mode: 'login' | 'register' }) {
  const { isAuthenticated, setAccessToken, setUser } = useAuth();
  const navigate = useNavigate(); const location = useLocation();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [sending, setSending] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false); const [privacyAccepted, setPrivacyAccepted] = useState(false);
  // Logowanie przez Google zakłada konto, jeśli jeszcze go nie ma — wtedy backend
  // wymaga zgód, których ekran logowania normalnie nie pokazuje. Trzymamy credential,
  // odsłaniamy zgody i ponawiamy, zamiast zostawiać użytkowniczkę z błędem bez wyjścia.
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const { data: commerce } = useQuery({ queryKey: ['academy', 'commerce-info'], queryFn: academyApi.getCommerceInfo });
  if (isAuthenticated) return <Navigate to="/" replace />;
  const legal = { termsAccepted, privacyAccepted, termsVersion: commerce?.documentVersions?.TERMS, privacyVersion: commerce?.documentVersions?.PRIVACY };
  const consentsVisible = mode === 'register' || pendingGoogleCredential !== null;
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); setSending(true); try { const response = await api.post(`/academy/auth/${mode === 'login' ? 'login' : 'register'}`, mode === 'login' ? { email, password } : { name, email, password, ...legal }); setAccessToken(response.data.data.accessToken); setUser(response.data.data.user); trackAcademyEvent(mode === 'register' ? 'SIGN_UP' : 'LOGIN'); navigate((location.state as any)?.from || '/'); } catch (err: any) { setError(err?.response?.data?.message || 'Nie udało się zalogować do Akademii.'); } finally { setSending(false); } };
  const googleSuccess = async (credential?: string) => {
    if (!credential) return setError('Google nie zwrócił danych logowania.');
    if (consentsVisible && (!termsAccepted || !privacyAccepted)) { setPendingGoogleCredential(credential); return setError('Zaakceptuj Regulamin i Politykę prywatności.'); }
    setError(''); setSending(true);
    try {
      const response = await api.post('/academy/auth/google', { credential, ...legal });
      setPendingGoogleCredential(null);
      setAccessToken(response.data.data.accessToken); setUser(response.data.data.user);
      trackAcademyEvent(pendingGoogleCredential ? 'SIGN_UP' : 'LOGIN', { metadata: { provider: 'google' } });
      navigate((location.state as any)?.from || '/');
    } catch (err: any) {
      if (err?.response?.data?.code === 'LEGAL_ACCEPTANCE_REQUIRED') {
        setPendingGoogleCredential(credential);
        setError('Zakładamy dla Ciebie konto w Akademii — zaakceptuj Regulamin i Politykę prywatności, aby dokończyć.');
      } else {
        setError(err?.response?.data?.message || 'Nie udało się zalogować przez Google.');
      }
    } finally { setSending(false); }
  };
  return <main className="academy-auth"><section><Link to="/" className="academy-auth-brand"><GraduationCap />Akademia BeskidStudio</Link><p className="academy-kicker">Twoja niezależna przestrzeń nauki</p><h1>{mode === 'login' ? 'Zaloguj się do Akademii' : 'Załóż konto w Akademii'}</h1><p className="academy-auth-copy">To konto działa wyłącznie w Akademii i nie jest połączone z kontem na stronie salonu.</p>{consentsVisible && <div className="academy-auth-consents"><label><input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} required={mode === 'register'} /><span>Akceptuję <Link target="_blank" to="/regulamin">Regulamin Akademii</Link>.</span></label><label><input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} required={mode === 'register'} /><span>Zapoznałam/em się z <Link target="_blank" to="/polityka-prywatnosci">Polityką prywatności</Link>.</span></label>{pendingGoogleCredential && <button type="button" disabled={sending || !termsAccepted || !privacyAccepted || !commerce} onClick={() => googleSuccess(pendingGoogleCredential)}>{sending ? 'Chwila…' : 'Dokończ zakładanie konta przez Google'}</button>}</div>}<GoogleButton onSuccess={googleSuccess} /><div className="academy-auth-divider"><span>lub przez email</span></div><form onSubmit={submit}>{mode === 'register' && <label><span>Imię i nazwisko</span><div><UserRound /><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required /></div></label>}<label><span>Adres email</span><div><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></div></label><label><span>Hasło</span><div><LockKeyhole /><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></div></label>{mode === 'login' && <Link className="academy-forgot-link" to="/przypomnij-haslo">Nie pamiętam hasła</Link>}{error && <p className="academy-auth-error">{error}</p>}<button disabled={sending || (mode === 'register' && (!termsAccepted || !privacyAccepted || !commerce))}>{sending ? 'Chwila…' : mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}</button></form><p className="academy-auth-switch">{mode === 'login' ? <>Nie masz konta? <Link to="/rejestracja">Załóż je w Akademii</Link></> : <>Masz już konto? <Link to="/logowanie">Zaloguj się</Link></>}</p></section></main>;
}

/**
 * Przycisk Google renderuje się w iframe o sztywnej szerokości — na sztywno
 * podane 360px rozpychało kartę logowania poza ekran telefonu. Szerokość
 * bierzemy z kontenera i trzymamy w zakresie, który akceptuje Google (200–400).
 */
function GoogleButton({ onSuccess }: { onSuccess: (credential?: string) => void }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get('/academy/auth/google-config').then((response) => setClientId(response.data.data.clientId)).catch(() => setClientId(null)); }, []);

  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(200, Math.min(400, Math.floor(node.getBoundingClientRect().width))));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [clientId]);

  if (!clientId) return null;
  return <div className="academy-google" ref={holder}>
    {width !== null && (
      <GoogleOAuthProvider clientId={clientId}>
        <GoogleLogin onSuccess={(response) => onSuccess(response.credential)} onError={() => onSuccess()} useOneTap={false} width={String(width)} text="continue_with" />
      </GoogleOAuthProvider>
    )}
  </div>;
}

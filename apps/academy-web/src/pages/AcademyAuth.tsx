import { FormEvent, useEffect, useState } from 'react';
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
  const { data: commerce } = useQuery({ queryKey: ['academy', 'commerce-info'], queryFn: academyApi.getCommerceInfo });
  if (isAuthenticated) return <Navigate to="/" replace />;
  const legal = { termsAccepted, privacyAccepted, termsVersion: commerce?.documentVersions?.TERMS, privacyVersion: commerce?.documentVersions?.PRIVACY };
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); setSending(true); try { const response = await api.post(`/academy/auth/${mode === 'login' ? 'login' : 'register'}`, mode === 'login' ? { email, password } : { name, email, password, ...legal }); setAccessToken(response.data.data.accessToken); setUser(response.data.data.user); trackAcademyEvent(mode === 'register' ? 'SIGN_UP' : 'LOGIN'); navigate((location.state as any)?.from || '/'); } catch (err: any) { setError(err?.response?.data?.message || 'Nie udało się zalogować do Akademii.'); } finally { setSending(false); } };
  const googleSuccess = async (credential?: string) => { if (!credential) return setError('Google nie zwrócił danych logowania.'); if (mode === 'register' && (!termsAccepted || !privacyAccepted)) return setError('Zaakceptuj Regulamin i Politykę prywatności.'); setError(''); setSending(true); try { const response = await api.post('/academy/auth/google', { credential, ...legal }); setAccessToken(response.data.data.accessToken); setUser(response.data.data.user); trackAcademyEvent('LOGIN', { metadata: { provider: 'google' } }); navigate((location.state as any)?.from || '/'); } catch (err: any) { setError(err?.response?.data?.message || 'Nie udało się zalogować przez Google.'); } finally { setSending(false); } };
  return <main className="academy-auth"><section><Link to="/" className="academy-auth-brand"><GraduationCap />Akademia BeskidStudio</Link><p className="academy-kicker">Twoja niezależna przestrzeń nauki</p><h1>{mode === 'login' ? 'Zaloguj się do Akademii' : 'Załóż konto w Akademii'}</h1><p className="academy-auth-copy">To konto działa wyłącznie w Akademii i nie jest połączone z kontem na stronie salonu.</p>{mode === 'register' && <div className="academy-auth-consents"><label><input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} required /><span>Akceptuję <Link target="_blank" to="/regulamin">Regulamin Akademii</Link>.</span></label><label><input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} required /><span>Zapoznałam/em się z <Link target="_blank" to="/polityka-prywatnosci">Polityką prywatności</Link>.</span></label></div>}<GoogleButton onSuccess={googleSuccess} /><div className="academy-auth-divider"><span>lub przez email</span></div><form onSubmit={submit}>{mode === 'register' && <label><span>Imię i nazwisko</span><div><UserRound /><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required /></div></label>}<label><span>Adres email</span><div><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></div></label><label><span>Hasło</span><div><LockKeyhole /><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></div></label>{mode === 'login' && <Link className="academy-forgot-link" to="/przypomnij-haslo">Nie pamiętam hasła</Link>}{error && <p className="academy-auth-error">{error}</p>}<button disabled={sending || (mode === 'register' && (!termsAccepted || !privacyAccepted || !commerce))}>{sending ? 'Chwila…' : mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}</button></form><p className="academy-auth-switch">{mode === 'login' ? <>Nie masz konta? <Link to="/rejestracja">Załóż je w Akademii</Link></> : <>Masz już konto? <Link to="/logowanie">Zaloguj się</Link></>}</p></section></main>;
}

function GoogleButton({ onSuccess }: { onSuccess: (credential?: string) => void }) {
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => { api.get('/academy/auth/google-config').then((response) => setClientId(response.data.data.clientId)).catch(() => setClientId(null)); }, []);
  if (!clientId) return null;
  return <div className="academy-google"><GoogleOAuthProvider clientId={clientId}><GoogleLogin onSuccess={(response) => onSuccess(response.credential)} onError={() => onSuccess()} useOneTap={false} width="360" text="continue_with" /></GoogleOAuthProvider></div>;
}

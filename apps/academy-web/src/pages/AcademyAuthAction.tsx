import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { api } from '@/lib/axios';

export function AcademyAuthAction({ mode }: { mode: 'forgot' | 'reset' | 'verify' }) {
  const [params] = useSearchParams(); const token = params.get('token') || '';
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'success'|'error'>('idle'); const [message, setMessage] = useState('');
  useEffect(() => {
    if (mode !== 'verify' || !token) return;
    setStatus('sending'); api.post('/academy/auth/verify-email', { token }).then(() => { setStatus('success'); setMessage('Adres e-mail został potwierdzony. Możesz kupować kursy.'); }).catch((error) => { setStatus('error'); setMessage(error?.response?.data?.message || 'Link jest nieprawidłowy lub wygasł.'); });
  }, [mode, token]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setStatus('sending'); setMessage('');
    try { if (mode === 'forgot') await api.post('/academy/auth/forgot-password', { email }); else await api.post('/academy/auth/reset-password', { token, password }); setStatus('success'); setMessage(mode === 'forgot' ? 'Jeśli konto istnieje, wysłaliśmy link do ustawienia nowego hasła.' : 'Hasło zostało zmienione. Możesz się zalogować.'); }
    catch (error: any) { setStatus('error'); setMessage(error?.response?.data?.message || 'Nie udało się wykonać operacji.'); }
  };
  return <main className="academy-auth"><section><Link to="/" className="academy-auth-brand"><GraduationCap />Akademia BeskidStudio</Link><h1>{mode === 'forgot' ? 'Odzyskaj dostęp' : mode === 'reset' ? 'Ustaw nowe hasło' : 'Potwierdzenie e-mail'}</h1>{mode === 'verify' ? <div className="academy-auth-action">{status === 'sending' && <p role="status">Sprawdzamy link…</p>}{message && <p role="alert"><CheckCircle2 />{message}</p>}<Link to="/logowanie">Przejdź do logowania</Link></div> : status === 'success' ? <div className="academy-auth-action"><CheckCircle2 /><p>{message}</p><Link to="/logowanie">Przejdź do logowania</Link></div> : <form onSubmit={submit}>{mode === 'forgot' ? <label><span>Adres e-mail</span><div><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div></label> : <label><span>Nowe hasło</span><div><input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></div></label>}{message && <p className="academy-auth-error">{message}</p>}<button disabled={status === 'sending' || (mode === 'reset' && !token)}>{status === 'sending' ? 'Chwila…' : mode === 'forgot' ? 'Wyślij link' : 'Zmień hasło'}</button></form>}</section></main>;
}

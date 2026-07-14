import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { MessageCircleHeart, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function AcademyConsultation() {
  const { isAuthenticated, user } = useAuth();
  const client = useQueryClient(); const [content, setContent] = useState(''); const [sending, setSending] = useState(false);
  const { data: thread, isLoading, error } = useQuery({ queryKey: ['academy-support'], queryFn: academyApi.getMySupportThread, enabled: isAuthenticated, retry: 1 });
  const send = async (event: FormEvent) => { event.preventDefault(); if(!content.trim() || !thread?.id) return; setSending(true); try { await academyApi.sendSupportMessage(content.trim()); setContent(''); await client.invalidateQueries({queryKey:['academy-support']}); } finally { setSending(false); } };
  if (!isAuthenticated) return <div className="academy-profile-empty"><MessageCircleHeart /><h2>Najpierw zaloguj się</h2><p>Czat z kosmetologiem jest prywatny i dostępny dla zalogowanych kursantek.</p><Link to="/logowanie">Zaloguj się</Link></div>;
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  return <div className="consultation-page"><section className="consultation-hero"><div className="consultation-icon"><MessageCircleHeart /></div><p className="academy-kicker">Wsparcie w Akademii</p><h1>Zapytaj kosmetologa</h1><p>Rozmawiasz jako {user?.name || user?.email}. Ten czat istnieje wyłącznie w Akademii.</p></section><section className="consultation-chat"><header><div><strong>Twoja konsultacja</strong><small>Odpowiedź pojawi się w tym wątku Akademii</small></div><ShieldCheck /></header><div className="consultation-messages">{isLoading ? <p>Ładujemy rozmowę…</p> : error ? <p>Nie udało się otworzyć czatu. Odśwież stronę lub zaloguj się ponownie.</p> : messages.length ? messages.map((message: any) => <div key={message.id} className={`consultation-message ${message.authorId === user?.id ? 'own' : ''}`}><p>{message.content}</p><small>{new Date(message.createdAt).toLocaleString('pl-PL', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</small></div>) : <div className="consultation-empty"><MessageCircleHeart /><strong>Rozpocznij rozmowę</strong><p>Opisz, przy którym materiale potrzebujesz wsparcia.</p></div>}</div><form onSubmit={send}><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Np. Jak rozpoznać przeciwwskazanie opisane w lekcji 2?" rows={2}/><button disabled={sending || !content.trim()}><Send />{sending ? 'Wysyłanie…' : 'Wyślij pytanie'}</button></form></section></div>;
}

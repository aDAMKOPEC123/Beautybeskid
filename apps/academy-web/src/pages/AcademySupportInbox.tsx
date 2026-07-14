import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircleHeart, Send, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { academyApi } from '@/api/academy.api';
import { useAuth } from '@/hooks/useAuth';

export function AcademySupportInbox() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const { data: threads = [], isLoading } = useQuery({ queryKey: ['academy-admin-support'], queryFn: academyApi.adminSupportThreads, enabled: user?.role === 'ADMIN', refetchInterval: 15_000 });
  const selected = useMemo(() => (threads as any[]).find((thread) => thread.id === selectedId) ?? (threads as any[])[0], [threads, selectedId]);
  const send = useMutation({
    mutationFn: () => academyApi.adminSendSupportMessage(selected.id, content.trim()),
    onSuccess: async () => { setContent(''); await client.invalidateQueries({ queryKey: ['academy-admin-support'] }); },
  });

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  const onSubmit = (event: FormEvent) => { event.preventDefault(); if (selected && content.trim()) send.mutate(); };

  return <div className="academy-inbox">
    <section className="academy-inbox-intro"><div><p className="academy-kicker">Panel administratora</p><h1>Wiadomości Akademii</h1><p>To osobna skrzynka wsparcia. Żadna z tych rozmów nie jest widoczna w czacie salonu na kosmetologwiktoriacwik.pl.</p></div><ShieldCheck /></section>
    <section className="academy-inbox-card">
      <aside className="academy-thread-list"><header><strong>Rozmowy kursantek</strong><span>{(threads as any[]).reduce((sum, thread) => sum + thread.adminUnread, 0)} nowych</span></header>{isLoading ? <p className="academy-inbox-status">Ładujemy rozmowy…</p> : (threads as any[]).length ? (threads as any[]).map((thread) => <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={selected?.id === thread.id ? 'selected' : ''}><span className="academy-thread-avatar">{(thread.user?.name?.[0] || thread.user?.email?.[0] || '?').toUpperCase()}</span><span><strong>{thread.user?.name || 'Kursantka'}</strong><small>{thread.messages?.at(-1)?.content || 'Brak wiadomości'}</small></span>{thread.adminUnread > 0 && <em>{thread.adminUnread}</em>}</button>) : <p className="academy-inbox-status">Nie ma jeszcze wiadomości z Akademii.</p>}</aside>
      <div className="academy-inbox-conversation">{selected ? <><header><div><strong>{selected.user?.name || selected.user?.email}</strong><small>{selected.user?.email} · rozmowa tylko w Akademii</small></div><MessageCircleHeart /></header><div className="academy-inbox-messages">{selected.messages?.map((message: any) => <div className={`academy-inbox-message ${message.authorId === user?.id ? 'own' : ''}`} key={message.id}><p>{message.content}</p><small>{message.author?.name || 'Kursantka'} · {new Date(message.createdAt).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div>)}</div><form onSubmit={onSubmit}><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={2} placeholder="Odpowiedz jako administrator Akademii…"/><button disabled={!content.trim() || send.isPending}><Send />{send.isPending ? 'Wysyłanie…' : 'Wyślij'}</button></form></> : <div className="academy-inbox-empty"><MessageCircleHeart /><strong>Wybierz rozmowę</strong><p>Nowe pytania kursantek pojawią się tutaj.</p></div>}</div>
    </section>
  </div>;
}

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, MessageCircleHeart, Search, Send, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { academyApi } from '@/api/academy.api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = { COURSE_CONTENT: 'Treść kursu', PROCEDURE: 'Zabieg', CONTRAINDICATIONS: 'Przeciwwskazania', TECHNICAL: 'Techniczne', CERTIFICATE: 'Certyfikat', PAYMENT: 'Płatność', INVOICE: 'Faktura', REFUND: 'Zwrot', COMPLAINT: 'Reklamacja', OTHER: 'Inne' };
const statusLabels: Record<string, string> = { OPEN: 'Otwarta', WAITING_FOR_USER: 'Oczekuje na kursantkę', RESOLVED: 'Zakończona', ARCHIVED: 'Archiwum' };

export function AcademySupportInbox() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const { data: threads = [], isLoading } = useQuery({ queryKey: ['academy-admin-support'], queryFn: academyApi.adminSupportThreads, enabled: user?.role === 'ADMIN', refetchInterval: 15_000 });
  const filtered = useMemo(() => (threads as any[]).filter(thread => {
    const matchesText = `${thread.user?.name || ''} ${thread.user?.email || ''} ${thread.messages?.at(-1)?.content || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? !['RESOLVED', 'ARCHIVED'].includes(thread.status) : thread.status === status);
    return matchesText && matchesStatus;
  }), [threads, search, status]);
  const selected = useMemo(() => filtered.find(thread => thread.id === selectedId) ?? filtered[0], [filtered, selectedId]);
  const send = useMutation({
    mutationFn: () => academyApi.adminSendSupportMessage(selected.id, content.trim()),
    onSuccess: async () => { setContent(''); await client.invalidateQueries({ queryKey: ['academy-admin-support'] }); },
    onError: () => toast.error('Nie udało się wysłać odpowiedzi'),
  });
  const updateStatus = useMutation({
    mutationFn: (nextStatus: string) => academyApi.adminSetSupportStatus(selected.id, nextStatus),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['academy-admin-support'] }); toast.success('Status rozmowy został zmieniony'); },
    onError: () => toast.error('Nie udało się zmienić statusu'),
  });
  useEffect(() => {
    if (!selected?.id || !selected.adminUnread) return;
    academyApi.adminMarkSupportRead(selected.id).then(() => client.invalidateQueries({ queryKey: ['academy-admin-support'] }));
  }, [selected?.id, selected?.adminUnread, client]);

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  const onSubmit = (event: FormEvent) => { event.preventDefault(); if (selected && content.trim()) send.mutate(); };
  const openAttachment = async (url: string) => { try { const blob = await academyApi.getSupportAttachment(url); const objectUrl = URL.createObjectURL(blob); window.open(objectUrl, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000); } catch { toast.error('Nie udało się otworzyć załącznika'); } };

  return <div className="academy-inbox">
    <section className="academy-inbox-intro"><div><p className="academy-kicker">Panel administratora</p><h1>Wiadomości Akademii</h1><p>Prywatna skrzynka pytań kursantek, oddzielona od czatu salonu.</p></div><ShieldCheck /></section>
    <section className="academy-inbox-card">
      <aside className="academy-thread-list">
        <header><strong>Rozmowy kursantek</strong><span>{(threads as any[]).reduce((sum, thread) => sum + thread.adminUnread, 0)} nowych</span></header>
        <div className="space-y-2 p-3"><label className="flex items-center gap-2 rounded-lg border px-2"><Search className="h-4 w-4" /><input className="w-full border-0 bg-transparent py-2" value={search} onChange={event => setSearch(event.target.value)} placeholder="Szukaj osoby lub wiadomości" /></label><select className="w-full rounded-lg border p-2" value={status} onChange={event => setStatus(event.target.value)}><option value="ACTIVE">Aktywne</option><option value="RESOLVED">Zakończone</option><option value="ARCHIVED">Archiwum</option><option value="ALL">Wszystkie</option></select></div>
        {isLoading ? <p className="academy-inbox-status">Ładujemy rozmowy…</p> : filtered.length ? filtered.map(thread => <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={selected?.id === thread.id ? 'selected' : ''}><span className="academy-thread-avatar">{(thread.user?.name?.[0] || thread.user?.email?.[0] || '?').toUpperCase()}</span><span><strong>{thread.user?.name || 'Kursantka'}</strong><small>{categoryLabels[thread.category]} · {statusLabels[thread.status]}</small><small>{thread.messages?.at(-1)?.content || 'Brak wiadomości'}</small></span>{thread.adminUnread > 0 && <em>{thread.adminUnread}</em>}</button>) : <p className="academy-inbox-status">Brak rozmów spełniających kryteria.</p>}
      </aside>
      <div className="academy-inbox-conversation">{selected ? <>
        <header><div><strong>{selected.user?.name || selected.user?.email}</strong><small>{selected.user?.email} · {categoryLabels[selected.category]}</small></div><select value={selected.status} onChange={event => updateStatus.mutate(event.target.value)} disabled={updateStatus.isPending}><option value="OPEN">Otwarta</option><option value="WAITING_FOR_USER">Oczekuje na kursantkę</option><option value="RESOLVED">Zakończona</option><option value="ARCHIVED">Archiwum</option></select><MessageCircleHeart /></header>
        <div className="academy-inbox-messages">{selected.messages?.map((message: any) => <div className={`academy-inbox-message ${message.authorId === user?.id ? 'own' : ''}`} key={message.id}><p>{message.content}</p>{message.attachmentUrl && <button type="button" className="mt-2 inline-flex items-center gap-2 text-sm underline" onClick={() => openAttachment(message.attachmentUrl)}><Image className="h-4 w-4" />Otwórz prywatne zdjęcie</button>}<small>{message.author?.name || 'Kursantka'} · {new Date(message.createdAt).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div>)}</div>
        {selected.rating && <p className="border-t p-3 text-sm">Ocena konsultacji: {'★'.repeat(selected.rating)} {selected.ratingComment || ''}</p>}
        <form onSubmit={onSubmit}><textarea value={content} onChange={event => setContent(event.target.value)} rows={2} maxLength={2000} placeholder="Odpowiedz jako administrator Akademii…"/><small>{content.length}/2000</small><button disabled={!content.trim() || send.isPending}><Send />{send.isPending ? 'Wysyłanie…' : 'Wyślij'}</button></form>
      </> : <div className="academy-inbox-empty"><MessageCircleHeart /><strong>Wybierz rozmowę</strong><p>Nowe pytania kursantek pojawią się tutaj.</p></div>}</div>
    </section>
  </div>;
}

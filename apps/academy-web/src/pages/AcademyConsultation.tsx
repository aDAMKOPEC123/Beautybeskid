import { FormEvent, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Image, MessageCircleHeart, Paperclip, Send, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const categories = [
  ['COURSE_CONTENT', 'Treść kursu'],
  ['PROCEDURE', 'Przebieg zabiegu'],
  ['CONTRAINDICATIONS', 'Przeciwwskazania'],
  ['CERTIFICATE', 'Certyfikat'],
  ['TECHNICAL', 'Problem techniczny'],
  ['PAYMENT', 'Płatność'],
  ['INVOICE', 'Faktura'],
  ['REFUND', 'Zwrot płatności'],
  ['COMPLAINT', 'Reklamacja'],
  ['OTHER', 'Inne'],
];

export function AcademyConsultation() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const initialContext = location.state as { course?: string; lesson?: string; courseId?: string; lessonId?: string } | null;
  const client = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(initialContext?.lesson ? `Kurs: ${initialContext.course}\nLekcja: ${initialContext.lesson}\n\n` : '');
  const [category, setCategory] = useState('COURSE_CONTENT');
  const [attachment, setAttachment] = useState<File | undefined>();
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(0);
  const { data: thread, isLoading, error, refetch } = useQuery({ queryKey: ['academy-support'], queryFn: academyApi.getMySupportThread, enabled: isAuthenticated, retry: 1, refetchInterval: 15_000 });

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim() || !thread?.id || (attachment && !consent)) return;
    setSending(true);
    try {
      await academyApi.sendSupportMessage({ content: content.trim(), category, attachment, sensitiveDataConsent: consent, courseId: initialContext?.courseId, lessonId: initialContext?.lessonId });
      setContent(''); setAttachment(undefined); setConsent(false);
      if (fileRef.current) fileRef.current.value = '';
      await client.invalidateQueries({ queryKey: ['academy-support'] });
      toast.success('Pytanie zostało wysłane');
    } catch { toast.error('Nie udało się wysłać wiadomości. Spróbuj ponownie.'); }
    finally { setSending(false); }
  };

  const openAttachment = async (url: string) => {
    try {
      const blob = await academyApi.getSupportAttachment(url);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch { toast.error('Nie udało się otworzyć załącznika'); }
  };

  const submitRating = async (value: number) => {
    try { await academyApi.rateSupportThread(thread.id, value); setRating(value); await refetch(); toast.success('Dziękujemy za ocenę konsultacji'); }
    catch { toast.error('Nie udało się zapisać oceny'); }
  };

  if (!isAuthenticated) return <div className="academy-profile-empty"><MessageCircleHeart /><h2>Najpierw zaloguj się</h2><p>Czat z kosmetologiem jest prywatny i dostępny dla zalogowanych kursantek.</p><Link to="/logowanie">Zaloguj się</Link></div>;
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];

  return <div className="consultation-page">
    <section className="consultation-hero"><div className="consultation-icon"><MessageCircleHeart /></div><p className="academy-kicker">Wsparcie w Akademii</p><h1>Zapytaj kosmetologa</h1><p>Rozmawiasz jako {user?.name || user?.email}. Zwykle odpowiadamy w ciągu 1–2 dni roboczych.</p></section>
    <section className="consultation-chat">
      <header><div><strong>Twoja konsultacja</strong><small>Odpowiedzi odświeżają się automatycznie · status: {thread?.status === 'RESOLVED' ? 'zakończona' : thread?.status === 'WAITING_FOR_USER' ? 'oczekuje na Ciebie' : 'otwarta'}</small></div><ShieldCheck /></header>
      <div className="consultation-messages">
        {isLoading ? <p>Ładujemy rozmowę…</p> : error ? <div className="consultation-empty"><p>Nie udało się otworzyć czatu.</p><button onClick={() => refetch()}>Spróbuj ponownie</button></div> : messages.length ? messages.map((message: any) => <div key={message.id} className={`consultation-message ${message.authorId === user?.id ? 'own' : ''}`}><p>{message.content}</p>{message.attachmentUrl && <button type="button" className="mt-2 inline-flex items-center gap-2 text-sm underline" onClick={() => openAttachment(message.attachmentUrl)}><Image className="h-4 w-4" />Otwórz prywatne zdjęcie</button>}<small>{new Date(message.createdAt).toLocaleString('pl-PL', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}{message.authorId === user?.id && message.readAt ? ' · przeczytano' : ''}</small></div>) : <div className="consultation-empty"><MessageCircleHeart /><strong>Rozpocznij rozmowę</strong><p>Wybierz kategorię i opisz materiał, przy którym potrzebujesz wsparcia.</p></div>}
      </div>
      {thread?.status === 'RESOLVED' && <div className="border-t p-4 text-center"><p className="text-sm font-medium">Jak oceniasz tę konsultację?</p><div className="mt-2 flex justify-center gap-1">{[1,2,3,4,5].map(value => <button type="button" key={value} aria-label={`Oceń ${value} na 5`} onClick={() => submitRating(value)}><Star className={(thread.rating || rating) >= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'} /></button>)}</div></div>}
      <form onSubmit={send}>
        <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Kategoria pytania">{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        <textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Np. Kurs: …, lekcja 2 — jak rozpoznać opisane przeciwwskazanie?" rows={3} maxLength={2000} aria-describedby="support-privacy" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span id="support-privacy">Nie przesyłaj danych medycznych. Zdjęcie zostanie zapisane prywatnie i wymaga zgody.</span><span>{content.length}/2000</span></div>
        <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2"><Paperclip />{attachment ? attachment.name : 'Dodaj zdjęcie'}</button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={event => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { toast.error('Zdjęcie może mieć maksymalnie 5 MB'); event.target.value = ''; return; } setAttachment(file); }} />{attachment && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Wyrażam zgodę na przetwarzanie zdjęcia wyłącznie w celu tej konsultacji.</label>}</div>
        <button disabled={sending || !content.trim() || Boolean(attachment && !consent)}><Send />{sending ? 'Wysyłanie…' : 'Wyślij pytanie'}</button>
      </form>
    </section>
  </div>;
}

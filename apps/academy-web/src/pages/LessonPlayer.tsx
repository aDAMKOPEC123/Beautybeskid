import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { CheckCircle, ChevronLeft, Download, FileText, ImageIcon, MessageCircle, MessageCircleHeart, NotebookPen, Play, Reply, Save, Send, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LessonQuizPlayer } from '@/components/LessonQuizPlayer';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { sanitizeLessonHtml } from '@/lib/sanitizeLessonHtml';

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }
let youtubeApiPromise: Promise<any> | null = null;
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
};

function YouTubeProgressPlayer({ videoId, initialSeconds, onProgress }: { videoId: string; initialSeconds?: number; onProgress: (state: { playedSeconds: number }) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let player: any;
    let timer: number | undefined;
    let disposed = false;
    loadYouTubeApi().then((YT) => {
      if (disposed || !hostRef.current) return;
      player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { if (initialSeconds && initialSeconds > 0) player.seekTo(initialSeconds, true); },
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.PLAYING) timer = window.setInterval(() => onProgress({ playedSeconds: player.getCurrentTime() }), 10_000);
            else if (timer) { window.clearInterval(timer); timer = undefined; }
          },
        },
      });
    });
    return () => { disposed = true; if (timer) window.clearInterval(timer); player?.destroy?.(); };
  }, [videoId, initialSeconds, onProgress]);
  return <div ref={hostRef} className="w-full h-full" title="Odtwarzacz lekcji wideo" />;
}

export function LessonPlayer() {
  const { slug, lessonSlug } = useParams<{ slug: string; lessonSlug: string }>();
  const queryClient = useQueryClient();
  const progressRef = useRef(0);
  const [note, setNote] = useState('');
  const [videoStarted, setVideoStarted] = useState(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['academy', 'lesson', slug, lessonSlug],
    queryFn: () => academyApi.getLessonBySlug(slug!, lessonSlug!),
    enabled: !!slug && !!lessonSlug,
  });

  const completeMutation = useMutation({
    mutationFn: () => academyApi.markLessonComplete(lesson!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy', 'course', slug] });
      queryClient.invalidateQueries({ queryKey: ['academy', 'lesson', slug, lessonSlug] });
      toast.success('Lekcja oznaczona jako ukończona');
    },
    onError: () => toast.error('Nie udało się oznaczyć lekcji jako ukończonej'),
  });
  useEffect(() => { setNote(lesson?.notes?.[0]?.content ?? ''); }, [lesson?.id, lesson?.notes]);
  useEffect(() => { setVideoStarted(false); }, [lesson?.id]);
  const noteMutation = useMutation({
    mutationFn: () => academyApi.saveLessonNote(lesson!.id, note.trim(), progressRef.current || undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academy', 'lesson', slug, lessonSlug] }); toast.success('Notatka została zapisana'); },
    onError: () => toast.error('Nie udało się zapisać notatki'),
  });
  const deleteNoteMutation = useMutation({
    mutationFn: () => academyApi.deleteLessonNote(lesson!.id),
    onSuccess: () => { setNote(''); queryClient.invalidateQueries({ queryKey: ['academy', 'lesson', slug, lessonSlug] }); toast.success('Notatka została usunięta'); },
    onError: () => toast.error('Nie udało się usunąć notatki'),
  });

  const videoProgressMutation = useMutation({
    mutationFn: (watchedSeconds: number) =>
      academyApi.updateVideoProgress(lesson!.id, watchedSeconds),
  });

  const handleProgress = useCallback(
    ({ playedSeconds }: { playedSeconds: number }) => {
      const seconds = Math.round(playedSeconds);
      if (Math.abs(seconds - progressRef.current) >= 10) {
        progressRef.current = seconds;
        videoProgressMutation.mutate(seconds);
      }
    },
    [lesson?.id]
  );

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  );
  if (!lesson) return <p className="text-muted-foreground">Nie znaleziono lekcji.</p>;

  const isCompleted = lesson.userProgress?.completed;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to={`/kurs/${slug}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Powrót do kursu
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold font-heading">{lesson.title}</h1>
      </div>

      {/* Video lesson */}
      {lesson.type === 'VIDEO' && lesson.videoId && (
        <div className="rounded-lg overflow-hidden aspect-video bg-black">
          {videoStarted ? <YouTubeProgressPlayer videoId={lesson.videoId} initialSeconds={lesson.userProgress?.watchedSeconds} onProgress={handleProgress} /> : <button className="academy-video-consent" onClick={() => setVideoStarted(true)}><Play /><strong>Uruchom lekcję wideo</strong><span>Film pochodzi z YouTube. Po uruchomieniu nawiążesz połączenie z tym dostawcą.</span></button>}
        </div>
      )}

      {/* Text lesson — content is admin-authored HTML */}
      {lesson.type === 'TEXT' && lesson.contentHtml && (
        <div
          className="prose prose-sm max-w-none bg-card rounded-lg border p-6"
          dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(lesson.contentHtml) }}
        />
      )}

      {/* Quiz lesson */}
      {lesson.type === 'QUIZ' && lesson.quiz && (
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">{lesson.quiz.title}</h2>
          <LessonQuizPlayer quiz={lesson.quiz} />
        </div>
      )}

      {/* Mark complete button (not shown for quiz lessons — quiz submission handles completion) */}
      {lesson.type !== 'QUIZ' && (
        <div className="flex justify-end">
          <button
            onClick={() => completeMutation.mutate()}
            disabled={isCompleted || completeMutation.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isCompleted
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {isCompleted
              ? 'Ukończono'
              : completeMutation.isPending
              ? 'Zapisywanie...'
              : 'Oznacz jako ukończone'}
          </button>
        </div>
      )}
      {lesson.type === 'VIDEO' && lesson.transcriptHtml && <details className="academy-transcript"><summary>Transkrypcja lekcji</summary><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(lesson.transcriptHtml) }} /></details>}
      <section className="rounded-xl border bg-card p-5 space-y-3" aria-labelledby="lesson-note-title">
        <div className="flex items-center gap-2"><NotebookPen className="w-5 h-5 text-primary" /><h2 id="lesson-note-title" className="font-semibold">Moja notatka</h2></div>
        <textarea className="w-full min-h-32 rounded-lg border bg-background p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} placeholder="Zapisz najważniejsze wnioski z tej lekcji…" />
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{note.length}/5000{progressRef.current > 0 ? ` · przy ${Math.floor(progressRef.current / 60)}:${String(progressRef.current % 60).padStart(2, '0')}` : ''}</span><div className="flex gap-2">{lesson.notes?.length > 0 && <button className="flex items-center gap-1 px-3 py-2 text-xs text-destructive" onClick={() => deleteNoteMutation.mutate()} disabled={deleteNoteMutation.isPending}><Trash2 className="w-4 h-4" />Usuń</button>}<button className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={() => noteMutation.mutate()} disabled={!note.trim() || noteMutation.isPending}><Save className="w-4 h-4" />{noteMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}</button></div></div>
      </section>
      {/* Attachments */}
      {lesson.attachments?.length > 0 && (
        <section className="rounded-xl border bg-card p-5 space-y-3" aria-labelledby="attachments-title">
          <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><h2 id="attachments-title" className="font-semibold">Materiały do pobrania</h2></div>
          <div className="divide-y">
            {lesson.attachments.map((att: any) => (
              <a key={att.id} href={academyApi.downloadAttachmentUrl(lesson.id, att.id)} className="flex items-center gap-3 py-3 text-sm hover:bg-accent/50 rounded-md px-2 transition-colors" download>
                <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{att.originalName}</p>
                  {att.description && <p className="text-xs text-muted-foreground">{att.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{(att.fileSize / 1024 / 1024).toFixed(1)} MB</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Case Studies */}
      {lesson.caseStudies?.length > 0 && (
        <section className="space-y-4" aria-labelledby="case-studies-title">
          <div className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /><h2 id="case-studies-title" className="font-semibold">Studia przypadków</h2></div>
          {lesson.caseStudies.map((cs: any) => (
            <div key={cs.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="p-5 space-y-3">
                <h3 className="font-semibold text-lg">{cs.title}</h3>
                {cs.problemDescription && <div><p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Problem</p><div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(cs.problemDescription) }} /></div>}
                {cs.treatmentDescription && <div><p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Zastosowany zabieg</p><div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(cs.treatmentDescription) }} /></div>}
                {cs.resultsDescription && <div><p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Efekty</p><div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(cs.resultsDescription) }} /></div>}
              </div>
              {cs.images?.length > 0 && (
                <div className="border-t p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cs.images.map((img: any) => (
                      <figure key={img.id} className="space-y-1">
                        <img src={img.imageUrl} alt={img.caption || cs.title} className="w-full aspect-[4/3] object-cover rounded-lg" loading="lazy" />
                        <figcaption className="text-xs text-muted-foreground text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${img.type === 'BEFORE' ? 'bg-red-100 text-red-700' : img.type === 'AFTER' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{img.type === 'BEFORE' ? 'Przed' : img.type === 'AFTER' ? 'Po' : 'W trakcie'}</span>
                          {img.caption && <span className="ml-1">{img.caption}</span>}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Comments */}
      <LessonComments lessonId={lesson.id} />

      <Link to="/zapytaj-kosmetologa" state={{ course: slug, lesson: lesson.title }} className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-semibold text-primary"><MessageCircleHeart className="w-5 h-5" />Zapytaj kosmetologa o tę lekcję</Link>
    </div>
  );
}

function LessonComments({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['academy', 'comments', lessonId],
    queryFn: () => academyApi.getLessonComments(lessonId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['academy', 'comments', lessonId] });

  const addMutation = useMutation({
    mutationFn: () => academyApi.addLessonComment(lessonId, newComment.trim()),
    onSuccess: () => { setNewComment(''); invalidate(); toast.success('Komentarz dodany'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nie udało się dodać komentarza'),
  });

  const replyMutation = useMutation({
    mutationFn: (commentId: string) => academyApi.addCommentReply(commentId, replyText.trim()),
    onSuccess: () => { setReplyingTo(null); setReplyText(''); invalidate(); toast.success('Odpowiedź dodana'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nie udało się dodać odpowiedzi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => academyApi.deleteComment(commentId),
    onSuccess: () => { invalidate(); toast.success('Komentarz usunięty'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nie udało się usunąć komentarza'),
  });

  const canDelete = (comment: any) => user?.role === 'ADMIN' || comment.user?.id === user?.id;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4" aria-labelledby="comments-title">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h2 id="comments-title" className="font-semibold">Dyskusja ({(comments as any[]).length})</h2>
      </div>

      {/* New comment form */}
      <div className="space-y-2">
        <textarea
          className="w-full min-h-20 rounded-lg border bg-background p-3 text-sm"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={2000}
          placeholder="Zadaj pytanie lub podziel się refleksją…"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{newComment.length}/2000</span>
          <button
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            onClick={() => addMutation.mutate()}
            disabled={!newComment.trim() || addMutation.isPending}
          >
            <Send className="w-3.5 h-3.5" />
            {addMutation.isPending ? 'Wysyłanie…' : 'Wyślij'}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {(comments as any[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Brak komentarzy — bądź pierwszą osobą!</p>}
        {(comments as any[]).map((comment: any) => (
          <div key={comment.id} className="space-y-2">
            <div className="rounded-lg bg-accent/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{comment.user?.name || 'Użytkownik'}</span>
                {comment.isAdminReply && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">Instruktor</span>}
                <span className="text-xs text-muted-foreground ml-auto">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              <div className="flex gap-2 mt-2">
                <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}>
                  <Reply className="w-3.5 h-3.5" />Odpowiedz
                </button>
                {canDelete(comment) && <button className="text-xs text-destructive/70 hover:text-destructive flex items-center gap-1" onClick={() => { if (confirm('Usunąć komentarz?')) deleteMutation.mutate(comment.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />Usuń
                </button>}
              </div>
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="ml-6 space-y-2">
                <textarea
                  className="w-full min-h-16 rounded-lg border bg-background p-3 text-sm"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={2000}
                  placeholder="Napisz odpowiedź…"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button className="text-xs text-muted-foreground px-3 py-1.5" onClick={() => setReplyingTo(null)}>Anuluj</button>
                  <button
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    onClick={() => replyMutation.mutate(comment.id)}
                    disabled={!replyText.trim() || replyMutation.isPending}
                  >
                    <Send className="w-3 h-3" />{replyMutation.isPending ? 'Wysyłanie…' : 'Wyślij'}
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies?.length > 0 && (
              <div className="ml-6 space-y-2">
                {comment.replies.map((reply: any) => (
                  <div key={reply.id} className="rounded-lg bg-accent/20 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{reply.user?.name || 'Użytkownik'}</span>
                      {reply.isAdminReply && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">Instruktor</span>}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(reply.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

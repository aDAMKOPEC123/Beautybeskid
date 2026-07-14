import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { CheckCircle, ChevronLeft, MessageCircleHeart, NotebookPen, Play, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LessonQuizPlayer } from '@/components/LessonQuizPlayer';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';

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
    },
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
    [lesson]
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
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(lesson.contentHtml, {
              ADD_TAGS: ['iframe', 'img'],
              ADD_ATTR: ['allowfullscreen', 'frameborder', 'loading', 'allow', 'style', 'width', 'height', 'alt', 'title'],
              // Videos may only come from approved platforms; course images use the Academy uploads path.
              ALLOWED_URI_REGEXP: /^(?:(?:https?):\/\/(?:www\.youtube\.com|player\.vimeo\.com)\/|\/uploads\/academy-lessons\/|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
            }),
          }}
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
      {lesson.type === 'VIDEO' && lesson.transcriptHtml && <details className="academy-transcript"><summary>Transkrypcja lekcji</summary><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.transcriptHtml) }} /></details>}
      <section className="rounded-xl border bg-card p-5 space-y-3" aria-labelledby="lesson-note-title">
        <div className="flex items-center gap-2"><NotebookPen className="w-5 h-5 text-primary" /><h2 id="lesson-note-title" className="font-semibold">Moja notatka</h2></div>
        <textarea className="w-full min-h-32 rounded-lg border bg-background p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} placeholder="Zapisz najważniejsze wnioski z tej lekcji…" />
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{note.length}/5000{progressRef.current > 0 ? ` · przy ${Math.floor(progressRef.current / 60)}:${String(progressRef.current % 60).padStart(2, '0')}` : ''}</span><div className="flex gap-2">{lesson.notes?.length > 0 && <button className="flex items-center gap-1 px-3 py-2 text-xs text-destructive" onClick={() => deleteNoteMutation.mutate()} disabled={deleteNoteMutation.isPending}><Trash2 className="w-4 h-4" />Usuń</button>}<button className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={() => noteMutation.mutate()} disabled={!note.trim() || noteMutation.isPending}><Save className="w-4 h-4" />{noteMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}</button></div></div>
      </section>
      <Link to="/zapytaj-kosmetologa" state={{ course: slug, lesson: lesson.title }} className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-semibold text-primary"><MessageCircleHeart className="w-5 h-5" />Zapytaj kosmetologa o tę lekcję</Link>
    </div>
  );
}

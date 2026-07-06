import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import React, { useCallback, useRef } from 'react';
import ReactPlayer from 'react-player';
import { LessonQuizPlayer } from '@/components/LessonQuizPlayer';
import DOMPurify from 'dompurify';

export function LessonPlayer() {
  const { slug, lessonSlug } = useParams<{ slug: string; lessonSlug: string }>();
  const queryClient = useQueryClient();
  const progressRef = useRef(0);

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
          Powrot do kursu
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold font-heading">{lesson.title}</h1>
      </div>

      {/* Video lesson */}
      {lesson.type === 'VIDEO' && lesson.videoId && (
        <div className="rounded-lg overflow-hidden aspect-video bg-black">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {React.createElement(ReactPlayer as any, {
            url: `https://www.youtube.com/watch?v=${lesson.videoId}`,
            width: '100%',
            height: '100%',
            controls: true,
            onProgress: (state: any) => handleProgress(state),
          })}
        </div>
      )}

      {/* Text lesson — content is admin-authored HTML */}
      {lesson.type === 'TEXT' && lesson.contentHtml && (
        <div
          className="prose prose-sm max-w-none bg-card rounded-lg border p-6"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.contentHtml) }}
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
              ? 'Ukonczono'
              : completeMutation.isPending
              ? 'Zapisywanie...'
              : 'Oznacz jako ukonczone'}
          </button>
        </div>
      )}
    </div>
  );
}

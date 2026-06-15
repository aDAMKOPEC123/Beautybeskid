import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { LessonQuizPlayer } from '@/components/academy/LessonQuizPlayer';
import { Clock, Star } from 'lucide-react';

export function StandaloneQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['academy', 'quiz', quizId],
    queryFn: () => academyApi.getStandaloneQuiz(quizId!),
    enabled: !!quizId,
  });

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded-lg" />
    </div>
  );
  if (!quiz) return <p className="text-muted-foreground">Nie znaleziono quizu.</p>;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Quiz standalone</span>
        </div>
        <h1 className="text-2xl font-bold font-heading">{quiz.title}</h1>
        {quiz.description && (
          <p className="text-muted-foreground text-sm">{quiz.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{quiz.questions?.length ?? 0} pytań</span>
          <span>Próg zdania: {quiz.passingScore}%</span>
          <span>Maks. prób: {quiz.maxAttempts} / 24h</span>
          {quiz.timeLimitMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {quiz.timeLimitMinutes} min
            </span>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <LessonQuizPlayer quiz={quiz} isStandalone />
      </div>
    </div>
  );
}

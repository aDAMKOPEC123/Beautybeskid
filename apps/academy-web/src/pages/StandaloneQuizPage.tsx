import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { LessonQuizPlayer } from '@/components/LessonQuizPlayer';
import { ArrowRight, CheckCircle2, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function StandaloneQuizPage() {
  const { isAuthenticated } = useAuth();
  const { quizId } = useParams<{ quizId: string }>();

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['academy', 'quiz', quizId],
    queryFn: () => academyApi.getStandaloneQuiz(quizId!),
    enabled: !!quizId && isAuthenticated,
  });
  const { data: quizzes = [], isLoading: listLoading, isError, refetch } = useQuery({
    queryKey: ['academy', 'quizzes'], queryFn: academyApi.getStandaloneQuizzes, enabled: !quizId && isAuthenticated,
  });
  if (!isAuthenticated) return <div className="academy-profile-empty"><Star /><h2>Quizy czekają po zakupie</h2><p>Zaloguj się, aby po zakupie kursu rozwiązywać quizy i zapisywać wyniki.</p><Link to="/logowanie">Zaloguj się do Akademii</Link></div>;

  if (isLoading || listLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded-lg" />
    </div>
  );
  if (!quizId) return <div className="space-y-6"><div><p className="academy-kicker text-caramel">Sprawdź swoją wiedzę</p><h1 className="text-2xl font-bold font-heading">Quizy i historia wyników</h1><p className="text-sm text-muted-foreground">Wracaj do quizów, obserwuj postęp i utrwalaj materiał.</p></div>{isError ? <div className="academy-empty"><Star /><h2>Nie udało się pobrać quizów</h2><button onClick={() => refetch()}>Spróbuj ponownie</button></div> : (quizzes as any[]).length ? <div className="grid gap-4 sm:grid-cols-2">{(quizzes as any[]).map(item => <Link key={item.id} to={`/quiz/${item.id}`} className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md"><div className="flex items-start justify-between"><Star className="text-primary" /><ArrowRight className="w-4 h-4" /></div><h2 className="font-semibold">{item.title}</h2><p className="text-xs text-muted-foreground">{item._count?.questions ?? 0} pytań · próg {item.passingScore}%</p>{item.attempts?.length ? <div className="border-t pt-3"><p className="text-xs font-semibold">Ostatni wynik: {item.attempts[0].score}%</p><p className="flex items-center gap-1 text-xs text-muted-foreground">{item.attempts[0].passed && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}{item.attempts.length} zapisanych prób</p></div> : <p className="border-t pt-3 text-xs text-muted-foreground">Jeszcze nierozwiązany</p>}</Link>)}</div> : <div className="academy-empty"><Star /><h2>Brak dostępnych quizów</h2><p>Nowe zestawy wiedzy pojawią się tutaj.</p></div>}</div>;
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

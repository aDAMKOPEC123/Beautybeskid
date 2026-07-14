import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Clock, CheckCircle, BarChart2, Flame, NotebookPen, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useState } from 'react';

const difficultyLabel: Record<string, string> = {
  BEGINNER: 'Początkujący',
  INTERMEDIATE: 'Średniozaawansowany',
  ADVANCED: 'Zaawansowany',
};

export function MyCourses() {
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const { data: courses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['academy', 'my-courses'],
    queryFn: academyApi.getCourses,
    enabled: isAuthenticated,
  });
  const { data: dashboard, refetch: refetchDashboard } = useQuery({ queryKey: ['academy', 'learning-dashboard'], queryFn: academyApi.getLearningDashboard, enabled: isAuthenticated });

  if (!isAuthenticated) return <div className="academy-profile-empty"><BarChart2 /><h2>Tu pojawi się Twoja nauka</h2><p>Po zalogowaniu i zakupie kursu zobaczysz tutaj wszystkie materiały, postęp oraz ukończone lekcje.</p><Link to="/logowanie">Zaloguj się do Akademii</Link></div>;

  const myCourses = useMemo(() => (courses as any[])
    .filter((course) => filter === 'ALL' || (filter === 'COMPLETED' ? !!course.progress?.completedAt : !course.progress?.completedAt))
    .sort((a, b) => new Date(b.progress?.startedAt ?? 0).getTime() - new Date(a.progress?.startedAt ?? 0).getTime()), [courses, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading mb-1">Moja nauka</h1>
        <p className="text-muted-foreground text-sm">Wszystkie zakupione kursy i Twój aktualny postęp</p>
      </div>
      {dashboard && <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-card p-4"><Target className="text-primary"/><p className="mt-2 text-xs text-muted-foreground">Cel tygodniowy</p><strong>{dashboard.weeklyMinutes}/{dashboard.goal.weeklyMinutesGoal} min</strong><div className="mt-2 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{width:`${Math.min(100,dashboard.weeklyMinutes/dashboard.goal.weeklyMinutesGoal*100)}%`}}/></div><select className="mt-3 w-full rounded border p-1 text-xs" value={dashboard.goal.weeklyMinutesGoal} onChange={async e=>{await academyApi.updateLearningGoal(Number(e.target.value));refetchDashboard();}}><option value="30">30 min</option><option value="60">60 min</option><option value="120">120 min</option><option value="180">180 min</option></select></div><div className="rounded-xl border bg-card p-4"><Flame className="text-orange-500"/><p className="mt-2 text-xs text-muted-foreground">Seria nauki</p><strong>{dashboard.goal.currentStreak} dni</strong><p className="text-xs text-muted-foreground">Rekord: {dashboard.goal.longestStreak}</p></div><div className="rounded-xl border bg-card p-4"><NotebookPen className="text-primary"/><p className="mt-2 text-xs text-muted-foreground">Twoje notatki</p><strong>{dashboard.notes.length}</strong><p className="text-xs text-muted-foreground">ze wszystkich lekcji</p></div></section>}

      {dashboard?.nextSteps?.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Następny krok</h2>{dashboard.nextSteps.map((step:any)=><div key={step.courseId} className="flex items-center justify-between rounded-xl border bg-card p-4"><div><strong className="text-sm">{step.courseTitle}</strong><p className="text-xs text-muted-foreground">{step.completedModules}/{step.moduleCount} modułów ukończonych</p></div>{step.nextLesson ? <Link className="text-sm font-semibold text-primary" to={`/kurs/${step.courseSlug}/lekcja/${step.nextLesson.slug}`}>Kontynuuj: {step.nextLesson.title}</Link> : <span className="text-sm text-green-600">Kurs ukończony</span>}</div>)}</section>}

      {dashboard?.notes?.length > 0 && <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">Wszystkie notatki</summary><div className="mt-3 space-y-3">{dashboard.notes.map((note:any)=><Link key={note.id} to={`/kurs/${note.lesson.module.course.slug}/lekcja/${note.lesson.slug}`} className="block rounded-lg bg-muted/50 p-3"><strong className="text-sm">{note.lesson.title}</strong><p className="text-xs text-muted-foreground">{note.lesson.module.course.title}</p><p className="mt-1 line-clamp-2 text-sm">{note.content}</p></Link>)}</div></details>}

      <div className="academy-filters" aria-label="Filtr kursów">
        {([['ALL', 'Wszystkie'], ['ACTIVE', 'Do ukończenia'], ['COMPLETED', 'Ukończone']] as const).map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="academy-empty"><BarChart2 /><h2>Nie udało się pobrać Twoich kursów</h2><p>Sprawdź połączenie i spróbuj ponownie.</p><button onClick={() => refetch()}>Spróbuj ponownie</button></div>
      ) : myCourses.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{filter === 'ALL' ? 'Nie masz jeszcze żadnego kursu.' : 'W tej kategorii nie ma jeszcze kursów.'}</p>
          <Link to="/" className="text-sm text-primary hover:underline">
            Przeglądaj katalog
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myCourses.map((course: any) => {
            const progress = course.progress?.percentComplete ?? 0;
            return (
            <Link
              key={course.id}
              to={`/kurs/${course.slug}`}
              className="flex items-center gap-4 bg-card rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-16 h-16 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-6 h-6 text-primary/40" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="font-semibold text-sm line-clamp-1">{course.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.estimatedMinutes} min
                  </span>
                  <span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>
                  {course.progress?.startedAt && <span>Aktywność: {new Date(course.progress.startedAt).toLocaleDateString('pl-PL')}</span>}
                </div>
                <div className="space-y-0.5">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progress > 0 ? `${Math.round(progress)}% ukończono` : 'Gotowy do rozpoczęcia'}
                    {progress > 0 && progress < 100 && course.estimatedMinutes > 0 ? ` · około ${Math.ceil(course.estimatedMinutes * (100 - progress) / 100)} min pozostało` : ''}
                  </p>
                </div>
              </div>
              {course.progress?.completedAt ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : <span className="text-xs font-semibold text-primary">{progress > 0 ? 'Kontynuuj' : 'Rozpocznij'}</span>}
            </Link>
          )})}
        </div>
      )}
    </div>
  );
}

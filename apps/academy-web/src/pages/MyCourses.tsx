import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Clock, CheckCircle, BarChart2 } from 'lucide-react';

const difficultyLabel: Record<string, string> = {
  BEGINNER: 'Poczatkujacy',
  INTERMEDIATE: 'Sredniozaawansowany',
  ADVANCED: 'Zaawansowany',
};

export function MyCourses() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['academy', 'my-courses'],
    queryFn: academyApi.getCourses,
  });

  // Filter to only courses the user has started or completed
  const myCourses = (courses as any[]).filter((c: any) => c.progress !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading mb-1">Moje Kursy</h1>
        <p className="text-muted-foreground text-sm">Kursy, ktore rozpoczales/as lub ukonczyles/as</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : myCourses.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nie rozpoczales/as jeszcze zadnego kursu.</p>
          <Link to="/" className="text-sm text-primary hover:underline">
            Przegladaj katalog
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myCourses.map((course: any) => (
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
                </div>
                <div className="space-y-0.5">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${course.progress.percentComplete}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(course.progress.percentComplete)}% ukonczono
                  </p>
                </div>
              </div>
              {course.progress.completedAt && (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

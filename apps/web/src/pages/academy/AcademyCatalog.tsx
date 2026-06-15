import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Clock, BarChart2, Star } from 'lucide-react';

const difficultyLabel: Record<string, string> = {
  BEGINNER: 'Początkujący',
  INTERMEDIATE: 'Średniozaawansowany',
  ADVANCED: 'Zaawansowany',
};

export function AcademyCatalog() {
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['academy', 'courses'],
    queryFn: academyApi.getCourses,
  });

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ['academy', 'quizzes'],
    queryFn: academyApi.getStandaloneQuizzes,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading mb-1">Katalog kursów</h1>
        <p className="text-muted-foreground text-sm">Przeglądaj dostępne kursy i quizy</p>
      </div>

      {/* Courses */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Kursy</h2>
        {coursesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-muted-foreground text-sm">Brak dostępnych kursów.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course: any) => (
              <Link
                key={course.id}
                to={`/akademia/kurs/${course.slug}`}
                className="group bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
              >
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-36 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <BarChart2 className="w-8 h-8 text-primary/40" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.estimatedMinutes} min
                    </span>
                    <span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>
                  </div>
                  {course.progress && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${course.progress.percentComplete}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(course.progress.percentComplete)}% ukończono
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Standalone quizzes */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quizy standalone</h2>
        {quizzesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Brak dostępnych quizów.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quizzes.map((quiz: any) => (
              <Link
                key={quiz.id}
                to={`/akademia/quiz/${quiz.id}`}
                className="group bg-card rounded-lg border p-4 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {quiz._count?.questions ?? 0} pytań · Próg zdania: {quiz.passingScore}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

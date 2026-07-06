import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { ChevronDown, Clock, Play, FileText, HelpCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const lessonTypeIcon: Record<string, React.ElementType> = {
  VIDEO: Play,
  TEXT: FileText,
  QUIZ: HelpCircle,
};

const difficultyLabel: Record<string, string> = {
  BEGINNER: 'Poczatkujacy',
  INTERMEDIATE: 'Sredniozaawansowany',
  ADVANCED: 'Zaawansowany',
};

export function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const { data: course, isLoading } = useQuery({
    queryKey: ['academy', 'course', slug],
    queryFn: () => academyApi.getCourseBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-muted rounded-lg" />
      <div className="h-8 bg-muted rounded w-1/2" />
    </div>
  );
  if (!course) return <p className="text-muted-foreground">Nie znaleziono kursu.</p>;

  const lessonProgressMap = new Map(
    (course.lessonProgress ?? []).map((lp: any) => [lp.lessonId, lp])
  );

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const percent = course.userProgress?.percentComplete ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {course.thumbnailUrl && (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-48 object-cover" loading="lazy" />
        )}
        <div className="p-6 space-y-3">
          <h1 className="text-2xl font-bold font-heading">{course.title}</h1>
          <p className="text-muted-foreground text-sm">{course.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {course.estimatedMinutes} min
            </span>
            <span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>
          </div>
          {course.userProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Postep kursu</span>
                <span>{Math.round(percent)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Zawartosc kursu</h2>
        {course.modules?.map((mod: any) => {
          const isOpen = openModules.has(mod.id);
          return (
            <div key={mod.id} className="bg-card rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-accent/50 transition-colors"
              >
                <span>{mod.title}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{mod.lessons?.length ?? 0} lekcji</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t divide-y">
                  {mod.lessons?.map((lesson: any) => {
                    const Icon = lessonTypeIcon[lesson.type] ?? FileText;
                    const progress = lessonProgressMap.get(lesson.id) as any;
                    return (
                      <Link
                        key={lesson.id}
                        to={`/kurs/${slug}/lekcja/${lesson.slug}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/50 transition-colors"
                      >
                        {progress?.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1">{lesson.title}</span>
                        <span className="text-xs text-muted-foreground">{lesson.estimatedMinutes} min</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

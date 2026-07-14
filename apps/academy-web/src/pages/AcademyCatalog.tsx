import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Flame, GraduationCap, Search, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const difficultyLabel: Record<string, string> = { BEGINNER: 'Podstawowy', INTERMEDIATE: 'Średniozaawansowany', ADVANCED: 'Zaawansowany' };

export function AcademyCatalog() {
  const { user } = useAuth();
  const hasAccess = !!user?.hasAcademyAccess || user?.role === 'ADMIN';
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const { data: courses = [], isLoading: coursesLoading } = useQuery({ queryKey: ['academy', 'courses', hasAccess], queryFn: hasAccess ? academyApi.getCourses : academyApi.getPublicCourses });
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({ queryKey: ['academy', 'quizzes'], queryFn: academyApi.getStandaloneQuizzes, enabled: hasAccess });
  const filteredCourses = useMemo(() => (courses as any[]).filter(course => {
    const phrase = `${course.title} ${course.description || ''}`.toLowerCase();
    return phrase.includes(query.toLowerCase()) && (level === 'ALL' || course.difficulty === level);
  }), [courses, query, level]);
  const started = (courses as any[]).filter(c => c.progress && !c.progress.completedAt);
  const completed = (courses as any[]).filter(c => c.progress?.completedAt).length;

  return <div className="academy-page space-y-10">
    <section className="academy-hero">
      <div className="academy-hero-orbit orbit-one" /><div className="academy-hero-orbit orbit-two" />
      <div className="relative z-[1] max-w-2xl">
        <p className="academy-kicker"><Sparkles className="w-3.5 h-3.5" />Twoja przestrzeń rozwoju</p>
        <h1>Ucz się w swoim tempie.<br /><i>Rośnij z pewnością.</i></h1>
        <p className="academy-hero-copy">Praktyczna wiedza kosmetologiczna, dopracowana lekcja po lekcji — dostępna dokładnie wtedy, gdy jej potrzebujesz.</p>
        <div className="academy-hero-actions"><a href="#kursy" className="academy-button academy-button-light">Odkryj kursy <ArrowRight className="w-4 h-4" /></a>{started[0] && <Link to={`/kurs/${started[0].slug}`} className="academy-text-button">Kontynuuj naukę</Link>}{!user && <a href="https://kosmetologwiktoriacwik.pl/auth/login" className="academy-text-button">Zaloguj się</a>}</div>
      </div>
      <div className="academy-hero-stat"><span className="academy-stat-icon"><Flame className="w-5 h-5" /></span><strong>{started.length || '—'}</strong><span>kurs{started.length === 1 ? '' : 'y'} w toku</span></div>
    </section>

    <section className="academy-overview" aria-label="Twój postęp">
      <div><span className="overview-icon sage"><BookOpen /></span><p>Rozpoczęte</p><strong>{started.length}</strong></div>
      <div><span className="overview-icon gold"><CheckCircle2 /></span><p>Ukończone</p><strong>{completed}</strong></div>
      <div><span className="overview-icon lilac"><GraduationCap /></span><p>Dostępne kursy</p><strong>{(courses as any[]).length}</strong></div>
    </section>

    <section id="kursy" className="scroll-mt-24">
      <div className="academy-section-heading"><div><p className="academy-kicker text-caramel">Biblioteka wiedzy</p><h2>Znajdź swój następny krok</h2></div><p>Wybierz temat, który przybliży Cię do pewniejszej praktyki.</p></div>
      <div className="academy-discovery-bar"><label><Search className="w-4 h-4" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj kursu lub tematu…" aria-label="Szukaj kursu" /></label><div className="academy-filters">{[['ALL', 'Wszystkie'], ['BEGINNER', 'Podstawy'], ['INTERMEDIATE', 'Rozwój'], ['ADVANCED', 'Ekspert']].map(([key, label]) => <button key={key} onClick={() => setLevel(key)} className={level === key ? 'selected' : ''}>{label}</button>)}</div></div>
      {coursesLoading ? <div className="academy-course-grid">{[1,2,3].map(i => <div key={i} className="academy-skeleton h-[310px]" />)}</div> : filteredCourses.length === 0 ? <div className="academy-empty"><Search /><h3>Nie znaleźliśmy pasującego kursu</h3><p>Spróbuj zmienić frazę lub wyczyścić filtr.</p></div> : <div className="academy-course-grid">{filteredCourses.map(course => <CourseCard key={course.id} course={course} />)}</div>}
    </section>
    <section className="academy-quiz-section"><div><p className="academy-kicker text-caramel">{hasAccess ? 'Sprawdź siebie' : 'Dostęp po zakupie'}</p><h2>{hasAccess ? 'Krótka sesja wiedzy?' : 'W środku czeka pełna praktyka'}</h2><p>{hasAccess ? 'Quizy pomagają utrwalić materiał i pokazują, co warto jeszcze powtórzyć.' : 'Po zakupie kurs pojawi się w zakładce „Moja nauka”, razem z quizami, materiałami i certyfikatem.'}</p></div><div className="academy-quiz-list">{hasAccess && quizzesLoading ? <div className="academy-skeleton h-28" /> : hasAccess ? (quizzes as any[]).slice(0, 3).map(quiz => <Link key={quiz.id} to={`/quiz/${quiz.id}`}><span><Star className="w-4 h-4" /></span><div><strong>{quiz.title}</strong><small>{quiz._count?.questions ?? 0} pytań · próg {quiz.passingScore}%</small></div><ArrowRight className="w-4 h-4" /></Link>) : <a href="https://kosmetologwiktoriacwik.pl/auth/login"><span><GraduationCap className="w-4 h-4" /></span><div><strong>Załóż konto lub zaloguj się</strong><small>Przed zakupem przygotujemy Twoją przestrzeń nauki.</small></div><ArrowRight className="w-4 h-4" /></a>}</div></section>
  </div>;
}

function CourseCard({ course }: { course: any }) {
  const progress = course.progress?.percentComplete;
  return <Link to={`/kurs/${course.slug}`} className="academy-course-card">
    <div className="academy-course-cover">{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} loading="lazy" /> : <div className="academy-course-placeholder"><GraduationCap /></div>}<span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>{progress !== undefined && <div className="academy-cover-progress"><div style={{width: `${progress}%`}} /></div>}</div>
    <div className="academy-course-body"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="w-3.5 h-3.5" />{course.estimatedMinutes} min nauki</div><h3>{course.title}</h3><p>{course.description || 'Starannie przygotowany kurs dla specjalistek beauty.'}</p><div className="academy-card-footer">{progress !== undefined ? <span>{Math.round(progress)}% ukończono</span> : <span>Otwórz program</span>}<ArrowRight className="w-4 h-4" /></div></div>
  </Link>;
}

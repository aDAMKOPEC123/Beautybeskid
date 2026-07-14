import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import {
  ArrowRight, Award, BookOpen, Check, CheckCircle2, Clock3, GraduationCap,
  HeartHandshake, PlayCircle, Search, ShieldCheck, Sparkles, Star, Target,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet-async';

const difficultyLabel: Record<string, string> = { BEGINNER: 'Podstawowy', INTERMEDIATE: 'Średniozaawansowany', ADVANCED: 'Zaawansowany' };
const levels = [['ALL', 'Wszystkie'], ['BEGINNER', 'Od podstaw'], ['INTERMEDIATE', 'Rozwijam praktykę'], ['ADVANCED', 'Poziom ekspert']];

export function AcademyCatalog() {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const { data: publicCourses = [], isLoading: coursesLoading } = useQuery({ queryKey: ['academy', 'public-courses'], queryFn: academyApi.getPublicCourses });
  const { data: enrolledCourses = [] } = useQuery({ queryKey: ['academy', 'enrolled-courses'], queryFn: academyApi.getCourses, enabled: isAuthenticated });
  const enrolledMap = useMemo(() => new Map((enrolledCourses as any[]).map(course => [course.id, course])), [enrolledCourses]);
  const courses = useMemo(() => (publicCourses as any[]).map(course => ({ ...course, ...(enrolledMap.get(course.id) || {}), isEnrolled: enrolledMap.has(course.id) })), [publicCourses, enrolledMap]);
  const hasAccess = user?.role === 'ADMIN' || (enrolledCourses as any[]).length > 0;
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({ queryKey: ['academy', 'quizzes'], queryFn: academyApi.getStandaloneQuizzes, enabled: hasAccess });
  const filteredCourses = useMemo(() => (courses as any[]).filter(course => {
    const phrase = `${course.title} ${course.description || ''} ${(course.tags || []).join(' ')}`.toLowerCase();
    return phrase.includes(query.trim().toLowerCase()) && (level === 'ALL' || course.difficulty === level);
  }), [courses, query, level]);
  const started = (courses as any[]).filter(c => c.progress && !c.progress.completedAt);
  const completed = (courses as any[]).filter(c => c.progress?.completedAt).length;

  const chooseLevel = (value: string) => {
    setLevel(value);
    document.getElementById('kursy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return <div className="academy-page academy-homepage">
    <Helmet>
      <title>Praktyczne kursy kosmetologii online | Akademia BeskidStudio</title>
      <meta name="description" content="Rozwijaj praktykę beauty dzięki kursom kosmetologicznym online Wiktorii Ćwik. Konkretne procedury, quizy, materiały i certyfikat — uczysz się we własnym tempie." />
      <link rel="canonical" href="https://akademia.kosmetologwiktoriacwik.pl/" />
      <meta property="og:title" content="Akademia Kosmetologii | BeskidStudio" />
      <meta property="og:description" content="Praktyczna kosmetologia, którą wykorzystasz w gabinecie — krok po kroku." />
    </Helmet>

    <section className="academy-sales-hero">
      <div className="academy-hero-orbit orbit-one" /><div className="academy-hero-orbit orbit-two" />
      <div className="academy-sales-copy">
        <p className="academy-kicker"><Sparkles className="w-3.5 h-3.5" />Akademia praktycznej kosmetologii</p>
        <h1>Więcej pewności w gabinecie.<br /><i>Mniej zgadywania.</i></h1>
        <p>Ucz się na konkretnych procedurach i przypadkach. Krótkie lekcje, jasna ścieżka i wiedza, którą możesz przełożyć na swoją pracę od razu.</p>
        <div className="academy-hero-actions">
          <a href="#kursy" className="academy-button academy-button-light">Wybierz kurs <ArrowRight className="w-4 h-4" /></a>
          {started[0] ? <Link to={`/kurs/${started[0].slug}`} className="academy-text-button"><PlayCircle className="w-4 h-4" />Kontynuuj naukę</Link> : <a href="#jak-to-dziala" className="academy-text-button">Zobacz, jak to działa</a>}
        </div>
        <div className="academy-hero-assurances"><span><Check />Nauka we własnym tempie</span><span><Check />Dostęp online 24/7</span><span><Check />Certyfikat ukończenia</span></div>
      </div>
      <div className="academy-hero-path" aria-label="Co otrzymujesz w Akademii">
        <p>Twoja ścieżka</p>
        <div><span>01</span><strong>Obejrzyj konkretną lekcję</strong><PlayCircle /></div>
        <div><span>02</span><strong>Sprawdź wiedzę w praktyce</strong><Target /></div>
        <div><span>03</span><strong>Potwierdź nowe kompetencje</strong><Award /></div>
      </div>
    </section>

    {isAuthenticated && <section className="academy-overview" aria-label="Twój postęp">
      <div><span className="overview-icon sage"><BookOpen /></span><p>Rozpoczęte</p><strong>{started.length}</strong></div>
      <div><span className="overview-icon gold"><CheckCircle2 /></span><p>Ukończone</p><strong>{completed}</strong></div>
      <div><span className="overview-icon lilac"><GraduationCap /></span><p>Twoje kursy</p><strong>{(courses as any[]).length}</strong></div>
    </section>}

    <section className="academy-value-strip" aria-label="Najważniejsze korzyści">
      <div><ShieldCheck /><span><strong>Wiedza od praktyka</strong><small>Bez zbędnej teorii</small></span></div>
      <div><Clock3 /><span><strong>Krótkie lekcje</strong><small>Uczysz się, kiedy możesz</small></span></div>
      <div><HeartHandshake /><span><strong>Wsparcie kosmetologa</strong><small>Nie zostajesz z pytaniem sama</small></span></div>
    </section>

    <section className="academy-level-picker" aria-labelledby="level-title">
      <div><p className="academy-kicker text-caramel">Dopasuj naukę do siebie</p><h2 id="level-title">Gdzie jesteś dzisiaj?</h2><p>Jedno kliknięcie pokaże kursy najlepiej dopasowane do Twojego etapu.</p></div>
      <div className="academy-level-cards">
        <button onClick={() => chooseLevel('BEGINNER')}><span>01</span><strong>Zaczynam</strong><small>Chcę zbudować mocne podstawy</small><ArrowRight /></button>
        <button onClick={() => chooseLevel('INTERMEDIATE')}><span>02</span><strong>Pracuję w beauty</strong><small>Chcę działać pewniej i skuteczniej</small><ArrowRight /></button>
        <button onClick={() => chooseLevel('ADVANCED')}><span>03</span><strong>Specjalizuję się</strong><small>Szukam zaawansowanej wiedzy</small><ArrowRight /></button>
      </div>
    </section>

    <section id="kursy" className="academy-catalog-section scroll-mt-24">
      <div className="academy-section-heading"><div><p className="academy-kicker text-caramel">Kursy online</p><h2>Wybierz swój następny krok</h2></div><p>Najpierw zobacz program i efekty nauki. Decyzję podejmujesz bez presji.</p></div>
      <div className="academy-discovery-bar"><label><Search className="w-4 h-4" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Czego chcesz się nauczyć?" aria-label="Szukaj kursu" /></label><div className="academy-filters">{levels.map(([key, label]) => <button key={key} onClick={() => setLevel(key)} className={level === key ? 'selected' : ''}>{label}</button>)}</div></div>
      {coursesLoading ? <div className="academy-course-grid">{[1,2,3].map(i => <div key={i} className="academy-skeleton h-[360px]" />)}</div> : filteredCourses.length === 0 ? <div className="academy-empty"><Search /><h3>Nie znaleźliśmy pasującego kursu</h3><p>Zmień frazę lub wybierz inny poziom.</p><button onClick={() => { setQuery(''); setLevel('ALL'); }}>Pokaż wszystkie kursy</button></div> : <div className="academy-course-grid">{filteredCourses.map((course, index) => <CourseCard key={course.id} course={course} featured={index === 0 && level === 'ALL' && !query} />)}</div>}
    </section>

    <section id="jak-to-dziala" className="academy-how-section">
      <div><p className="academy-kicker text-caramel">Prosty proces</p><h2>Od „nie jestem pewna” do „wiem, co robię”</h2></div>
      <ol><li><span>1</span><div><strong>Wybierasz konkretny cel</strong><p>Program kursu pokazuje dokładnie, czego i w jakiej kolejności się nauczysz.</p></div></li><li><span>2</span><div><strong>Uczysz się na swoich zasadach</strong><p>Wracasz do lekcji, robisz notatki i utrwalasz materiał quizami.</p></div></li><li><span>3</span><div><strong>Wdrażasz i potwierdzasz wiedzę</strong><p>Stosujesz nowe umiejętności w praktyce i zdobywasz certyfikat.</p></div></li></ol>
    </section>

    <section className="academy-quiz-section"><div><p className="academy-kicker text-caramel">{hasAccess ? 'Sprawdź siebie' : 'W cenie kursu'}</p><h2>{hasAccess ? 'Krótka sesja wiedzy?' : 'Nie tylko oglądasz. Naprawdę się uczysz.'}</h2><p>{hasAccess ? 'Quizy utrwalają materiał i pokazują, co warto jeszcze powtórzyć.' : 'Lekcje, uporządkowany program, quizy, materiały i certyfikat tworzą jedną spójną ścieżkę.'}</p></div><div className="academy-quiz-list">{hasAccess && quizzesLoading ? <div className="academy-skeleton h-28" /> : hasAccess ? (quizzes as any[]).slice(0, 3).map(quiz => <Link key={quiz.id} to={`/quiz/${quiz.id}`}><span><Star className="w-4 h-4" /></span><div><strong>{quiz.title}</strong><small>{quiz._count?.questions ?? 0} pytań · próg {quiz.passingScore}%</small></div><ArrowRight className="w-4 h-4" /></Link>) : <a href="#kursy"><span><GraduationCap className="w-4 h-4" /></span><div><strong>Znajdź kurs dla siebie</strong><small>Zobacz program przed podjęciem decyzji.</small></div><ArrowRight className="w-4 h-4" /></a>}</div></section>

    {!isAuthenticated && <section className="academy-final-cta"><div><p className="academy-kicker">Twoja wiedza pracuje razem z Tobą</p><h2>Zacznij od jednego konkretnego kroku.</h2><p>Przejrzyj dostępne programy i wybierz obszar, który dziś najbardziej rozwinie Twoją praktykę.</p></div><a href="#kursy" className="academy-button academy-button-light">Zobacz kursy <ArrowRight /></a></section>}
  </div>;
}

function CourseCard({ course, featured }: { course: any; featured?: boolean }) {
  const progress = course.progress?.percentComplete;
  return <Link to={`/kurs/${course.slug}`} className={`academy-course-card ${featured ? 'featured' : ''}`}>
    <div className="academy-course-cover">{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} loading="lazy" /> : <div className="academy-course-placeholder"><GraduationCap /></div>}<span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>{featured && <em>Najlepszy na start</em>}{progress !== undefined && <div className="academy-cover-progress"><div style={{width: `${progress}%`}} /></div>}</div>
    <div className="academy-course-body"><div className="academy-course-meta"><span><Clock3 />{course.estimatedMinutes} min</span>{course.lessonCount > 0 && <span><PlayCircle />{course.lessonCount} lekcji</span>}</div><h3>{course.title}</h3><p>{course.description || 'Starannie przygotowany kurs dla specjalistek beauty.'}</p>{!course.isEnrolled && <strong className="academy-course-price">{formatPrice(course.price)}</strong>}<div className="academy-card-footer">{course.isEnrolled ? <span>{progress !== undefined ? `${Math.round(progress)}% ukończono` : 'Przejdź do kursu'}</span> : <span>Zobacz program i kup kurs</span>}<ArrowRight className="w-4 h-4" /></div></div>
  </Link>;
}

function formatPrice(value: unknown) {
  const price = Number(value || 0);
  return price > 0 ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(price) : 'Cena wkrótce';
}

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { ChevronDown, Clock, Play, FileText, HelpCircle, CheckCircle, ChevronRight, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trackAcademyEvent } from '@/lib/academyAnalytics';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { Helmet } from 'react-helmet-async';
import { DocumentTitle } from '@/components/DocumentTitle';

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
  const { user, isAuthenticated } = useAuth();
  const { data: enrolledCourses = [] } = useQuery({ queryKey: ['academy', 'enrolled-courses'], queryFn: academyApi.getCourses, enabled: isAuthenticated });
  const hasAccess = user?.role === 'ADMIN' || (enrolledCourses as any[]).some((course) => course.slug === slug);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['academy', 'course', slug, hasAccess],
    queryFn: () => hasAccess ? academyApi.getCourseBySlug(slug!) : academyApi.getPublicCourseBySlug(slug!),
    enabled: !!slug,
  });
  useEffect(() => { if (course?.id && !hasAccess) trackAcademyEvent('COURSE_VIEW', { courseId: course.id }); }, [course?.id, hasAccess]);

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
  const price = Number(course.price || 0);
  const formattedPrice = course.isComingSoon ? 'Wkrótce' : course.isFree ? 'Bezpłatny' : price > 0 ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(price) : 'Cena wkrótce';
  const registerInterest = async () => {
    setSubmittingInterest(true);
    try {
      trackAcademyEvent('CHECKOUT_STARTED', { courseId: course.id });
      const result = await academyApi.registerCourseInterest(course.id);
      if (result.status === 'ENROLLED') {
        toast.success('Kurs został dodany do Twojej nauki');
        window.location.reload();
        return;
      }
      toast.info('Ten kurs wymaga przejścia przez podsumowanie zamówienia.');
    } catch {
      toast.error('Nie udało się zapisać zainteresowania. Spróbuj ponownie.');
    } finally { setSubmittingInterest(false); }
  };

  if (!hasAccess) return <div className="space-y-6">
    <DocumentTitle title={`${course.title} | Akademia BeskidStudio`} /><Helmet><meta name="description" content={String(course.description).slice(0, 155)} /><link rel="canonical" href={`https://akademia.kosmetologwiktoriacwik.pl/kurs/${course.slug}`} /><meta property="og:title" content={course.title} /><meta property="og:description" content={String(course.description).slice(0, 200)} />{course.thumbnailUrl && <meta property="og:image" content={course.thumbnailUrl} />}<script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'Course', name: course.title, description: course.description, provider: { '@type': 'Organization', name: 'Akademia BeskidStudio' }, offers: Number(course.price) > 0 ? { '@type': 'Offer', price: Number(course.price).toFixed(2), priceCurrency: 'PLN', availability: course.isComingSoon ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock' } : undefined })}</script></Helmet>
    <div className="academy-preview-hero">
      {course.thumbnailUrl && <img src={course.thumbnailUrl} alt={course.title} width="1280" height="720" />}
      <div className="academy-preview-overlay"><span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span><h1>{course.title}</h1><p>{course.description}</p><div className="flex gap-3 text-sm"><Clock className="w-4 h-4" />{course.estimatedMinutes > 0 ? `${course.estimatedMinutes} min materiału` : 'Program w przygotowaniu'}</div></div>
    </div>
    <div className="academy-purchase-box"><div><p className="academy-kicker text-caramel">{course.isFree ? 'Bezpłatny dostęp' : 'Pełny dostęp'}</p><h2>Opanuj temat krok po kroku</h2><p>Otrzymasz wszystkie lekcje, materiały, quizy i certyfikat ukończenia.</p></div><div className="academy-purchase-action"><strong>{formattedPrice}</strong>{Number(course.compareAtPrice) > price && <del>{Number(course.compareAtPrice).toLocaleString('pl-PL')} zł</del>}{Number(course.lowestPrice30Days) > 0 && Number(course.compareAtPrice) > price && <small>Najniższa cena z 30 dni przed obniżką: {Number(course.lowestPrice30Days).toLocaleString('pl-PL')} zł</small>}{course.isComingSoon || (!course.isFree && price <= 0) ? <span className="academy-button academy-buy disabled" aria-disabled="true">{course.isComingSoon ? 'Kurs w przygotowaniu' : 'Cena wymaga uzupełnienia'} <ChevronRight className="w-4 h-4" /></span> : isAuthenticated ? course.isFree ? <button disabled={submittingInterest} className="academy-button academy-buy" onClick={registerInterest}>{submittingInterest ? 'Dodajemy…' : 'Dodaj bezpłatny kurs'} <ChevronRight className="w-4 h-4" /></button> : <Link className="academy-button academy-buy" to={`/zamowienie/kurs/${slug}`} onClick={()=>trackAcademyEvent('CHECKOUT_STARTED',{courseId:course.id})}>Przejdź do zamówienia <ChevronRight className="w-4 h-4" /></Link> : <Link className="academy-button academy-buy" to="/logowanie" state={{ from: course.isFree ? `/kurs/${slug}` : `/zamowienie/kurs/${slug}` }} onClick={()=>trackAcademyEvent('CHECKOUT_STARTED',{courseId:course.id})}>Zaloguj się, aby kontynuować <ChevronRight className="w-4 h-4" /></Link>}<small>{course.accessDays ? `Dostęp przez ${course.accessDays} dni.` : 'Dostęp bez ograniczenia czasowego.'} Certyfikat potwierdza ukończenie kursu i nie nadaje kwalifikacji zawodowych.</small></div></div>
    <section className="academy-preview-program"><p className="academy-kicker text-caramel">Program kursu</p><h2>Czego się nauczysz</h2>{course.modules?.map((module: any, index: number) => <div key={module.id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{module.title}</strong><p>{module.lessonCount} lekcji{module.estimatedMinutes > 0 ? ` · ${module.estimatedMinutes} min praktyki` : ' · zakres w przygotowaniu'}</p></div><span className="academy-locked">Dostęp po zakupie</span></div>)}</section>
    {course.previewLesson && <section className="rounded-xl border bg-card p-6 space-y-4"><p className="academy-kicker text-caramel">Bezpłatny podgląd</p><h2 className="font-heading text-2xl font-semibold">{course.previewLesson.title}</h2>{course.previewLesson.type === 'VIDEO' && course.previewLesson.videoId ? <><ExternalVideo videoId={course.previewLesson.videoId} title={course.previewLesson.title} />{course.previewLesson.transcriptHtml && <details className="academy-transcript"><summary>Transkrypcja filmu</summary><div className="prose max-w-none" dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(course.previewLesson.transcriptHtml)}} /></details>}</> : course.previewLesson.contentHtml && <div className="prose max-w-none" dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(course.previewLesson.contentHtml)}} />}</section>}
    <section className="rounded-xl bg-primary/5 p-6"><p className="academy-kicker text-caramel">Prowadząca</p><h2 className="font-heading text-2xl font-semibold">{course.instructorName || 'Wiktoria Ćwik'}</h2><p className="mt-2 text-sm text-muted-foreground">{course.instructorBio || 'Dyplomowana kosmetolog i praktyk gabinetowy. Program powstał z myślą o wiedzy, którą można bezpiecznie zastosować w codziennej pracy.'}</p></section>
    {course.academyReviews?.length > 0 && <section className="space-y-3"><h2 className="font-heading text-2xl font-semibold">Zweryfikowane opinie kursantek</h2><p className="text-sm text-muted-foreground">Opinię może dodać wyłącznie osoba, która ukończyła ten kurs.</p><div className="grid gap-3 sm:grid-cols-2">{course.academyReviews.map((review:any)=><blockquote key={review.id} className="rounded-xl border bg-card p-5"><p className="text-amber-600">{'★'.repeat(review.rating)}</p><p className="mt-2 text-sm">{review.content}</p><footer className="mt-3 text-xs text-muted-foreground">{review.user.name} · zweryfikowane ukończenie</footer></blockquote>)}</div></section>}
    {course.bundles?.length > 0 && <section className="space-y-3"><p className="academy-kicker text-caramel">Pakiety</p><h2 className="font-heading text-2xl font-semibold">Ten kurs kupisz także w pakiecie</h2><div className="grid gap-3 sm:grid-cols-2">{course.bundles.map((bundle:any)=><Link key={bundle.id} to={`/pakiet/${bundle.slug}`} className="rounded-xl border bg-card p-5"><strong>{bundle.title}</strong><p className="mt-2 text-sm text-muted-foreground">{bundle.description}</p><span className="mt-3 block font-semibold">{Number(bundle.price).toLocaleString('pl-PL')} zł</span></Link>)}</div></section>}
    {course.recommendedCourses?.length > 0 && <section className="space-y-3"><p className="academy-kicker text-caramel">Kontynuuj ścieżkę</p><h2 className="font-heading text-2xl font-semibold">Polecane kursy z tego pakietu</h2><div className="grid gap-3 sm:grid-cols-3">{course.recommendedCourses.map((recommended:any) => <Link key={recommended.id} to={`/kurs/${recommended.slug}`} className="rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">{recommended.thumbnailUrl && <img className="mb-3 aspect-video w-full rounded-lg object-cover" src={recommended.thumbnailUrl} alt="" loading="lazy" />}<strong>{recommended.title}</strong><p className="mt-1 text-sm text-muted-foreground">{recommended.isFree ? 'Bezpłatny' : Number(recommended.price) > 0 ? `${Number(recommended.price).toLocaleString('pl-PL')} zł` : 'Cena wkrótce'}</p></Link>)}</div></section>}
  </div>;

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
      {course.userProgress?.completedAt && <section className="rounded-xl border bg-card p-6 space-y-3"><div className="flex items-center gap-2"><Star className="text-amber-500" /><h2 className="font-semibold">Oceń ukończony kurs</h2></div><div className="flex gap-2" aria-label="Ocena kursu">{[1,2,3,4,5].map(value=><button key={value} aria-label={`${value} gwiazdek`} aria-pressed={reviewRating===value} onClick={()=>setReviewRating(value)}><Star className={value<=reviewRating?'fill-amber-400 text-amber-400':'text-muted-foreground'} /></button>)}</div><textarea className="w-full rounded-lg border p-3 text-sm" minLength={10} maxLength={1500} value={reviewContent} onChange={e=>setReviewContent(e.target.value)} placeholder="Napisz, co było dla Ciebie najbardziej wartościowe…"/><button className="academy-button academy-buy" disabled={reviewContent.trim().length<10} onClick={async()=>{try{await academyApi.submitCourseReview(course.id,reviewRating,reviewContent.trim());setReviewContent('');toast.success('Dziękujemy — opinia trafiła do moderacji');}catch{toast.error('Nie udało się zapisać opinii');}}}>Wyślij opinię</button></section>}
    </div>
  );
}

function ExternalVideo({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded) return <div className="aspect-video overflow-hidden rounded-xl"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  return <div className="academy-external-video"><Play /><p>Film jest osadzony z YouTube. Po uruchomieniu serwis może zapisać własne dane zgodnie ze swoją polityką.</p><button onClick={() => setLoaded(true)}>Uruchom film</button></div>;
}

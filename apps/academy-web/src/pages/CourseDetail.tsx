import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { ChevronDown, Clock, Play, FileText, HelpCircle, CheckCircle, ChevronRight, Star, Shield, Award, BookOpen, Lock, UserPlus, ArrowRight } from 'lucide-react';
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
  BEGINNER: 'Początkujący',
  INTERMEDIATE: 'Średniozaawansowany',
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

  const totalLessons = course.modules?.reduce((acc: number, mod: any) => acc + (mod.lessonCount || mod.lessons?.length || 0), 0) ?? 0;
  const totalMinutes = course.estimatedMinutes || course.modules?.reduce((acc: number, mod: any) => acc + (mod.estimatedMinutes || 0), 0) || 0;

  if (!hasAccess) return <div className="academy-sales-page">
    <DocumentTitle title={`${course.title} | Akademia BeskidStudio`} /><Helmet><meta name="description" content={String(course.description).slice(0, 155)} /><link rel="canonical" href={`https://akademia.kosmetologwiktoriacwik.pl/kurs/${course.slug}`} /><meta property="og:title" content={course.title} /><meta property="og:description" content={String(course.description).slice(0, 200)} />{course.thumbnailUrl && <meta property="og:image" content={course.thumbnailUrl} />}<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={course.title} /><meta name="twitter:description" content={String(course.description).slice(0, 200)} />{course.thumbnailUrl && <meta name="twitter:image" content={course.thumbnailUrl} />}<script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'Course', name: course.title, description: course.description, url: `https://akademia.kosmetologwiktoriacwik.pl/kurs/${course.slug}`, image: course.thumbnailUrl || undefined, provider: { '@type': 'Organization', name: 'Akademia BeskidStudio', url: 'https://akademia.kosmetologwiktoriacwik.pl' }, instructor: { '@type': 'Person', name: course.instructorName || 'Wiktoria Ćwik' }, educationalLevel: course.difficulty === 'BEGINNER' ? 'Beginner' : course.difficulty === 'INTERMEDIATE' ? 'Intermediate' : course.difficulty === 'ADVANCED' ? 'Advanced' : undefined, inLanguage: 'pl', ...(totalMinutes > 0 ? { timeRequired: `PT${totalMinutes}M` } : {}), ...(course.academyReviews?.length > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: (course.academyReviews.reduce((s: number, r: any) => s + r.rating, 0) / course.academyReviews.length).toFixed(1), reviewCount: course.academyReviews.length, bestRating: 5, worstRating: 1 } } : {}), offers: Number(course.price) > 0 ? { '@type': 'Offer', price: Number(course.price).toFixed(2), priceCurrency: 'PLN', availability: course.isComingSoon ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock' } : undefined })}</script></Helmet>

    {/* Hero with course info */}
    <div className="academy-preview-hero">
      {course.thumbnailUrl && <img src={course.thumbnailUrl} alt={course.title} width="1280" height="720" fetchPriority="high" />}
      <div className="academy-preview-overlay">
        <span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div className="academy-hero-stats-row">
          {totalMinutes > 0 && <span><Clock className="w-4 h-4" />{totalMinutes} min materiału</span>}
          {totalLessons > 0 && <span><BookOpen className="w-4 h-4" />{totalLessons} lekcji</span>}
          <span><Award className="w-4 h-4" />Certyfikat ukończenia</span>
        </div>
      </div>
    </div>

    {/* Primary purchase section — prominent conversion area */}
    <div className="academy-purchase-card">
      <div className="academy-purchase-card-left">
        <p className="academy-kicker text-caramel">{course.isFree ? 'Bezpłatny dostęp' : 'Pełny dostęp do kursu'}</p>
        <h2>Opanuj temat krok po kroku</h2>
        <ul className="academy-purchase-includes">
          <li><CheckCircle className="w-4 h-4" />{totalLessons > 0 ? `${totalLessons} lekcji wideo i tekstowych` : 'Kompletny program lekcji'}</li>
          <li><CheckCircle className="w-4 h-4" />Quizy sprawdzające wiedzę</li>
          <li><CheckCircle className="w-4 h-4" />Materiały do pobrania (PDF)</li>
          <li><CheckCircle className="w-4 h-4" />Certyfikat ukończenia kursu</li>
          <li><CheckCircle className="w-4 h-4" />{course.accessDays ? `${course.accessDays} dni dostępu` : 'Dostęp bez limitu czasowego'}</li>
        </ul>
      </div>
      <div className="academy-purchase-card-right">
        <div className="academy-purchase-price-block">
          <strong className="academy-price-big">{formattedPrice}</strong>
          {Number(course.compareAtPrice) > price && <><del className="academy-price-old">{Number(course.compareAtPrice).toLocaleString('pl-PL')} zł</del><span className="academy-price-save">-{Math.round((1 - price / Number(course.compareAtPrice)) * 100)}%</span></>}
        </div>
        {Number(course.lowestPrice30Days) > 0 && Number(course.compareAtPrice) > price && <small className="academy-price-lowest">Najniższa cena z 30 dni: {Number(course.lowestPrice30Days).toLocaleString('pl-PL')} zł</small>}

        {course.isComingSoon || (!course.isFree && price <= 0)
          ? <span className="academy-cta-button disabled" aria-disabled="true">{course.isComingSoon ? 'Kurs w przygotowaniu' : 'Cena wkrótce'}</span>
          : isAuthenticated
            ? course.isFree
              ? <button disabled={submittingInterest} className="academy-cta-button" onClick={registerInterest}>{submittingInterest ? 'Dodajemy...' : 'Rozpocznij naukę za darmo'} <ArrowRight className="w-4 h-4" /></button>
              : <Link className="academy-cta-button" to={`/zamowienie/kurs/${slug}`} onClick={() => trackAcademyEvent('CHECKOUT_STARTED', { courseId: course.id })}>Kup kurs i zacznij naukę <ArrowRight className="w-4 h-4" /></Link>
            : <>
              <Link className="academy-cta-button" to="/rejestracja" state={{ from: course.isFree ? `/kurs/${slug}` : `/zamowienie/kurs/${slug}` }} onClick={() => trackAcademyEvent('CHECKOUT_STARTED', { courseId: course.id })}>
                <UserPlus className="w-4 h-4" />{course.isFree ? 'Załóż konto i zacznij za darmo' : 'Załóż konto i kup kurs'}
              </Link>
              <Link className="academy-cta-login" to="/logowanie" state={{ from: course.isFree ? `/kurs/${slug}` : `/zamowienie/kurs/${slug}` }}>
                Masz już konto? <strong>Zaloguj się</strong>
              </Link>
            </>
        }
        <div className="academy-trust-signals">
          <span><Shield className="w-3.5 h-3.5" />Bezpieczna płatność</span>
          <span><Lock className="w-3.5 h-3.5" />14 dni na zwrot</span>
        </div>
      </div>
    </div>

    {/* Free preview lesson — if available, show it prominently */}
    {course.previewLesson && <section className="academy-preview-lesson-section">
      <div className="academy-preview-lesson-badge"><Play className="w-4 h-4" />Bezpłatny fragment kursu</div>
      <h2>{course.previewLesson.title}</h2>
      {course.previewLesson.type === 'VIDEO' && course.previewLesson.videoId
        ? <><ExternalVideo videoId={course.previewLesson.videoId} title={course.previewLesson.title} />{course.previewLesson.transcriptHtml && <details className="academy-transcript"><summary>Transkrypcja filmu</summary><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.previewLesson.transcriptHtml) }} /></details>}</>
        : course.previewLesson.contentHtml && <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.previewLesson.contentHtml) }} />}
      {!isAuthenticated && <div className="academy-preview-lesson-cta">
        <p>Podoba Ci się? Cały kurs zawiera {totalLessons > 0 ? `${totalLessons} lekcji` : 'pełny program'}.</p>
        <Link to="/rejestracja" state={{ from: course.isFree ? `/kurs/${slug}` : `/zamowienie/kurs/${slug}` }}>Załóż konto i kontynuuj naukę <ArrowRight className="w-4 h-4" /></Link>
      </div>}
    </section>}

    {/* Course program */}
    <section className="academy-preview-program">
      <p className="academy-kicker text-caramel">Program kursu</p>
      <h2>Czego się nauczysz</h2>
      {course.modules?.map((module: any, index: number) => <div key={module.id}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div><strong>{module.title}</strong><p>{module.lessonCount} lekcji{module.estimatedMinutes > 0 ? ` · ${module.estimatedMinutes} min praktyki` : ' · zakres w przygotowaniu'}</p></div>
        <span className="academy-locked"><Lock className="w-3 h-3" />{isAuthenticated ? 'Dostęp po zakupie' : 'Po rejestracji'}</span>
      </div>)}
    </section>

    <SalesDetails course={course} />

    {/* Reviews — social proof */}
    {course.academyReviews?.length > 0 && <section className="academy-reviews-section">
      <div className="academy-reviews-header">
        <div><p className="academy-kicker text-caramel">Opinie kursantek</p><h2>Co mówią osoby, które ukończyły ten kurs</h2></div>
        <div className="academy-reviews-avg"><Star className="w-5 h-5" /><strong>{(course.academyReviews.reduce((s: number, r: any) => s + r.rating, 0) / course.academyReviews.length).toFixed(1)}</strong><span>/ 5 ({course.academyReviews.length} {course.academyReviews.length === 1 ? 'opinia' : course.academyReviews.length < 5 ? 'opinie' : 'opinii'})</span></div>
      </div>
      <div className="academy-reviews-grid">{course.academyReviews.map((review: any) => <blockquote key={review.id}><p className="academy-review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p><p>{review.content}</p><footer><strong>{review.user.name}</strong><span>Zweryfikowane ukończenie</span></footer></blockquote>)}</div>
    </section>}

    {/* Instructor */}
    <section className="academy-instructor-section">
      <p className="academy-kicker text-caramel">Prowadząca</p>
      <h2>{course.instructorName || 'Wiktoria Ćwik'}</h2>
      <p>{course.instructorBio || 'Dyplomowana kosmetolog i praktyk gabinetowy. Program powstał z myślą o wiedzy, którą można bezpiecznie zastosować w codziennej pracy.'}</p>
    </section>

    {/* Bundles cross-sell */}
    {course.bundles?.length > 0 && <section className="space-y-3"><p className="academy-kicker text-caramel">Pakiety</p><h2 className="font-heading text-2xl font-semibold">Ten kurs kupisz także w pakiecie</h2><div className="grid gap-3 sm:grid-cols-2">{course.bundles.map((bundle: any) => <Link key={bundle.id} to={`/pakiet/${bundle.slug}`} className="rounded-xl border bg-card p-5"><strong>{bundle.title}</strong><p className="mt-2 text-sm text-muted-foreground">{bundle.description}</p><span className="mt-3 block font-semibold">{Number(bundle.price).toLocaleString('pl-PL')} zł</span></Link>)}</div></section>}

    {/* Recommended courses */}
    {course.recommendedCourses?.length > 0 && <section className="space-y-3"><p className="academy-kicker text-caramel">Kontynuuj ścieżkę</p><h2 className="font-heading text-2xl font-semibold">Polecane kursy</h2><div className="grid gap-3 sm:grid-cols-3">{course.recommendedCourses.map((recommended: any) => <Link key={recommended.id} to={`/kurs/${recommended.slug}`} className="rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">{recommended.thumbnailUrl && <img className="mb-3 aspect-video w-full rounded-lg object-cover" src={recommended.thumbnailUrl} alt="" loading="lazy" />}<strong>{recommended.title}</strong><p className="mt-1 text-sm text-muted-foreground">{recommended.isFree ? 'Bezpłatny' : Number(recommended.price) > 0 ? `${Number(recommended.price).toLocaleString('pl-PL')} zł` : 'Cena wkrótce'}</p></Link>)}</div></section>}

    {/* Bottom CTA for anonymous users */}
    {!isAuthenticated && <section className="academy-bottom-cta">
      <div>
        <h2>Gotowa, żeby zacząć?</h2>
        <p>Załóż darmowe konto w 30 sekund. Nie potrzebujesz karty płatniczej.</p>
      </div>
      <div className="academy-bottom-cta-actions">
        <Link to="/rejestracja" state={{ from: course.isFree ? `/kurs/${slug}` : `/zamowienie/kurs/${slug}` }} className="academy-cta-button"><UserPlus className="w-4 h-4" />{course.isFree ? 'Załóż konto i zacznij za darmo' : 'Załóż konto i kup kurs'}</Link>
        <Link to="/logowanie" state={{ from: course.isFree ? `/kurs/${slug}` : `/zamowienie/kurs/${slug}` }} className="academy-cta-login">Masz już konto? <strong>Zaloguj się</strong></Link>
      </div>
    </section>}
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
                <span>Postęp kursu</span>
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
        <h2 className="text-lg font-semibold">Zawartość kursu</h2>
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
      {course.userProgress?.completedAt && <section className="rounded-xl border bg-card p-6 space-y-3"><div className="flex items-center gap-2"><Star className="text-amber-500" /><h2 className="font-semibold">Oceń ukończony kurs</h2></div><div className="flex gap-2" aria-label="Ocena kursu">{[1,2,3,4,5].map(value=><button key={value} aria-label={`${value} ${value === 1 ? 'gwiazdka' : value < 5 ? 'gwiazdki' : 'gwiazdek'}`} aria-pressed={reviewRating===value} onClick={()=>setReviewRating(value)}><Star className={value<=reviewRating?'fill-amber-400 text-amber-400':'text-muted-foreground'} /></button>)}</div><textarea className="w-full rounded-lg border p-3 text-sm" minLength={10} maxLength={1500} value={reviewContent} onChange={e=>setReviewContent(e.target.value)} placeholder="Napisz, co było dla Ciebie najbardziej wartościowe…"/><button className="academy-button academy-buy" disabled={reviewContent.trim().length<10} onClick={async()=>{try{await academyApi.submitCourseReview(course.id,reviewRating,reviewContent.trim());setReviewContent('');toast.success('Dziękujemy — opinia trafiła do moderacji');}catch{toast.error('Nie udało się zapisać opinii');}}}>Wyślij opinię</button></section>}
    </div>
  );
}

function ExternalVideo({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded) return <div className="aspect-video overflow-hidden rounded-xl"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  return <div className="academy-external-video"><Play /><p>Film jest osadzony z YouTube. Po uruchomieniu serwis może zapisać własne dane zgodnie ze swoją polityką.</p><button onClick={() => setLoaded(true)}>Uruchom film</button></div>;
}

function SalesDetails({course}:{course:any}){const faqs=Array.isArray(course.salesFaqs)?course.salesFaqs:[];return <><section className="academy-sales-details">{course.learningOutcomes?.length>0&&<div><h2>Po kursie potrafisz</h2><ul>{course.learningOutcomes.map((item:string)=><li key={item}><CheckCircle className="w-4 h-4"/>{item}</li>)}</ul></div>}{course.targetAudience&&<div><h2>Dla kogo jest ten kurs</h2><p>{course.targetAudience}</p>{course.notForAudience&&<><h3>Ten kurs nie jest dla Ciebie, jeśli</h3><p>{course.notForAudience}</p></>}</div>}{course.prerequisites?.length>0&&<div><h2>Przed rozpoczęciem</h2><ul>{course.prerequisites.map((item:string)=><li key={item}>{item}</li>)}</ul></div>}</section>{course.trailerVideoId&&<section className="rounded-xl border bg-card p-6 space-y-4"><p className="academy-kicker text-caramel">Zwiastun kursu</p><ExternalVideo videoId={course.trailerVideoId} title={`Zwiastun ${course.title}`}/></section>}{course.samplePdfUrl&&<a className="academy-sample-download" href={course.samplePdfUrl} target="_blank" rel="noreferrer"><FileText/>Pobierz bezpłatną próbkę materiału PDF</a>}{faqs.length>0&&<section className="academy-faq-list"><h2>Pytania o ten kurs</h2>{faqs.map((faq:any,index:number)=><details key={index}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>}{!course.isComingSoon&&!course.isFree&&Number(course.price)>0&&<aside className="academy-sticky-buy"><span><strong>{Number(course.price).toLocaleString('pl-PL')} zł</strong><small>{course.accessDays?`${course.accessDays} dni dostępu`:'Dostęp bezterminowy'}</small></span><Link to={`/zamowienie/kurs/${course.slug}`}>Kup kurs</Link></aside>}</>}

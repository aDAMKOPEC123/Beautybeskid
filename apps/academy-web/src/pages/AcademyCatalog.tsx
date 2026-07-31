import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import {
  ArrowRight, Award, BookOpen, Check, CheckCircle2, Clock3, GraduationCap,
  Heart, HeartHandshake, PlayCircle, Search, ShieldCheck, Sparkles, Star, Target,
  Mail, UsersRound, UserPlus, Shield,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet-async';
import { trackAcademyEvent } from '@/lib/academyAnalytics';
import { DocumentTitle } from '@/components/DocumentTitle';
import { useCartStore } from '@/store/cart.store';

const difficultyLabel: Record<string, string> = { BEGINNER: 'Podstawowy', INTERMEDIATE: 'Średniozaawansowany', ADVANCED: 'Zaawansowany' };
const levels = [['ALL', 'Wszystkie'], ['BEGINNER', 'Od podstaw'], ['INTERMEDIATE', 'Rozwijam praktykę'], ['ADVANCED', 'Poziom ekspert']];

export function AcademyCatalog() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const deferredQuery = useDeferredValue(query);
  const [level, setLevel] = useState(searchParams.get('poziom') ?? 'ALL');
  const [tag, setTag] = useState(searchParams.get('temat') ?? 'ALL');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'RECOMMENDED');
  const [savedOnly, setSavedOnly] = useState(searchParams.get('zapisane') === '1');
  const { data: publicCourses = [], isLoading: coursesLoading, isError: coursesError, refetch: refetchCourses } = useQuery({ queryKey: ['academy', 'public-courses'], queryFn: academyApi.getPublicCourses });
  const { data: enrolledCourses = [] } = useQuery({ queryKey: ['academy', 'enrolled-courses'], queryFn: academyApi.getCourses, enabled: isAuthenticated });
  const { data: favorites = [] } = useQuery({ queryKey: ['academy', 'favorites'], queryFn: academyApi.getFavorites, enabled: isAuthenticated });
  const { data: bundles = [] } = useQuery({ queryKey: ['academy', 'public-bundles'], queryFn: academyApi.getPublicBundles });
  const { data: storefront } = useQuery({ queryKey: ['academy', 'storefront'], queryFn: academyApi.getStorefront });
  const favoriteIds = useMemo(() => new Set((favorites as any[]).map(item => item.courseId)), [favorites]);
  const enrolledMap = useMemo(() => new Map((enrolledCourses as any[]).map(course => [course.id, course])), [enrolledCourses]);
  const courses = useMemo(() => (publicCourses as any[]).map(course => ({ ...course, ...(enrolledMap.get(course.id) || {}), isEnrolled: enrolledMap.has(course.id) })), [publicCourses, enrolledMap]);
  const hasAccess = user?.role === 'ADMIN' || (enrolledCourses as any[]).length > 0;
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({ queryKey: ['academy', 'quizzes'], queryFn: academyApi.getStandaloneQuizzes, enabled: hasAccess });
  const availableTags = useMemo(() => Array.from(new Set((courses as any[]).flatMap(course => course.tags || []))).sort(), [courses]);
  const filteredCourses = useMemo(() => (courses as any[]).filter(course => {
    const phrase = `${course.title} ${course.description || ''} ${(course.tags || []).join(' ')}`.toLowerCase();
    return phrase.includes(deferredQuery.trim().toLowerCase()) && (level === 'ALL' || course.difficulty === level) && (tag === 'ALL' || course.tags?.includes(tag)) && (!savedOnly || favoriteIds.has(course.id));
  }).sort((a, b) => sort === 'PRICE_ASC' ? Number(a.price) - Number(b.price) : sort === 'DURATION' ? a.estimatedMinutes - b.estimatedMinutes : sort === 'NEWEST' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : Number(a.displayOrder||0)-Number(b.displayOrder||0)), [courses, deferredQuery, level, tag, savedOnly, favoriteIds, sort]);
  const started = (courses as any[]).filter(c => c.progress && !c.progress.completedAt);
  const completed = (courses as any[]).filter(c => c.progress?.completedAt).length;
  useEffect(() => { trackAcademyEvent('CATALOG_VIEW'); }, []);
  useEffect(() => {
    const next: Record<string, string> = {};
    if (deferredQuery) next.q = deferredQuery;
    if (level !== 'ALL') next.poziom = level;
    if (tag !== 'ALL') next.temat = tag;
    if (sort !== 'RECOMMENDED') next.sort = sort;
    if (savedOnly) next.zapisane = '1';
    setSearchParams(next, { replace: true });
  }, [deferredQuery, level, tag, sort, savedOnly, setSearchParams]);

  const chooseLevel = (value: string) => {
    setLevel(value);
    document.getElementById('kursy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const toggleFavorite = async (courseId: string) => {
    if (!isAuthenticated) return;
    if (favoriteIds.has(courseId)) await academyApi.removeFavorite(courseId); else await academyApi.addFavorite(courseId);
    await queryClient.invalidateQueries({ queryKey: ['academy', 'favorites'] });
  };

  const totalStudents = storefront?.socialProof?.students || '50';
  const totalCompletions = storefront?.socialProof?.completions || '30';
  const preview = (courses as any[]).find(course => course.previewLessonId) || (courses as any[])[0];

  return <div className="academy-page academy-homepage">
    <DocumentTitle title="Praktyczne kursy kosmetologii online | Akademia BeskidStudio" />
    <Helmet>
      <meta name="description" content="Rozwijaj praktykę beauty dzięki kursom kosmetologicznym online Wiktorii Ćwik. Konkretne procedury, quizy, materiały i certyfikat — uczysz się we własnym tempie." />
      <link rel="canonical" href="https://akademia.kosmetologwiktoriacwik.pl/" />
      <meta property="og:title" content="Akademia Kosmetologii | BeskidStudio" />
      <meta property="og:description" content="Praktyczna kosmetologia, którą wykorzystasz w gabinecie — krok po kroku." />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Akademia Kosmetologii | BeskidStudio" />
      <meta name="twitter:description" content="Praktyczne kursy kosmetologiczne online — uczysz się we własnym tempie." />
    </Helmet>

    {/* === PROMOTION BAR (conditional) === */}
    {storefront?.activePromotion && <div className="academy-promotion-bar">
      <Sparkles /><strong>{storefront.activePromotion.publicLabel || storefront.activePromotion.name}</strong>
      <span>Oferta ograniczona czasowo</span>
      <Countdown until={storefront.activePromotion.endsAt} />
      <a href="#kursy">Zobacz kursy</a>
    </div>}

    {/* === 1. HERO — above the fold === */}
    <section className="academy-sales-hero">
      <div className="academy-hero-bg-glow" />
      <div className="academy-sales-copy">
        <p className="academy-kicker"><Sparkles className="w-3.5 h-3.5" />Akademia praktycznej kosmetologii</p>
        <h1>Więcej pewności<br />w gabinecie.<br /><i>Mniej zgadywania.</i></h1>
        <p className="academy-hero-subtitle">Ucz się na konkretnych procedurach i przypadkach klinicznych. Krótkie lekcje, jasna ścieżka i wiedza, którą wykorzystasz od razu.</p>
        <div className="academy-hero-actions">
          <a href="#kursy" className="academy-button academy-button-light">Wybierz kurs <ArrowRight className="w-4 h-4" /></a>
          {started[0]
            ? <Link to={`/kurs/${started[0].slug}`} className="academy-text-button"><PlayCircle className="w-4 h-4" />Kontynuuj naukę</Link>
            : !isAuthenticated && <Link to="/rejestracja" className="academy-text-button"><UserPlus className="w-4 h-4" />Załóż darmowe konto</Link>}
        </div>
        <div className="academy-hero-trust-row">
          <span><UsersRound className="w-4 h-4" /><strong>{totalStudents}+</strong> kursantek</span>
          <span><Award className="w-4 h-4" /><strong>{totalCompletions}+</strong> ukończeń</span>
          <span><Star className="w-4 h-4" /><strong>4.9</strong> ocena</span>
        </div>
      </div>
      <div className="academy-hero-visual">
        <div className="academy-hero-path" aria-label="Co otrzymujesz w Akademii">
          <p>Twoja ścieżka rozwoju</p>
          <div><span>01</span><strong>Obejrzyj lekcję</strong><PlayCircle /></div>
          <div><span>02</span><strong>Sprawdź wiedzę</strong><Target /></div>
          <div><span>03</span><strong>Zdobądź certyfikat</strong><Award /></div>
        </div>
      </div>
    </section>

    {/* === 2. VALUE STRIP — key benefits === */}
    <section className="academy-value-strip" aria-label="Najważniejsze korzyści">
      <div><ShieldCheck /><span><strong>Wiedza od praktyka</strong><small>Procedury prosto z gabinetu</small></span></div>
      <div><Clock3 /><span><strong>Krótkie lekcje</strong><small>Uczysz się w swoim tempie</small></span></div>
      <div><HeartHandshake /><span><strong>Wsparcie prowadzącej</strong><small>Zadajesz pytania, dostajesz odpowiedzi</small></span></div>
    </section>

    {/* === 3. SOCIAL PROOF — reviews & stats === */}
    <SocialProof data={storefront?.socialProof} />

    {/* === 4. USER PROGRESS (logged in only) === */}
    {isAuthenticated && <section className="academy-overview" aria-label="Twój postęp">
      <div><span className="overview-icon sage"><BookOpen /></span><p>Rozpoczęte</p><strong>{started.length}</strong></div>
      <div><span className="overview-icon gold"><CheckCircle2 /></span><p>Ukończone</p><strong>{completed}</strong></div>
      <div><span className="overview-icon lilac"><GraduationCap /></span><p>Twoje kursy</p><strong>{(enrolledCourses as any[]).length}</strong></div>
    </section>}

    {/* === 5. BANNER SLIDER (conditional) === */}
    {storefront?.banners?.length > 0 && <AcademyBannerSlider banners={storefront.banners} />}

    {/* === 6. LEVEL PICKER — segmentation === */}
    <section className="academy-level-picker" aria-labelledby="level-title">
      <div>
        <p className="academy-kicker text-caramel">Dopasuj naukę do siebie</p>
        <h2 id="level-title">Gdzie jesteś dzisiaj?</h2>
        <p>Wybierz swój poziom, a pokażemy kursy najlepiej dopasowane do Twojego etapu.</p>
      </div>
      <div className="academy-level-cards">
        <button onClick={() => chooseLevel('BEGINNER')}><span>01</span><strong>Zaczynam</strong><small>Chcę zbudować mocne podstawy kosmetologiczne</small><ArrowRight /></button>
        <button onClick={() => chooseLevel('INTERMEDIATE')}><span>02</span><strong>Pracuję w beauty</strong><small>Chcę działać pewniej i skuteczniej w gabinecie</small><ArrowRight /></button>
        <button onClick={() => chooseLevel('ADVANCED')}><span>03</span><strong>Specjalizuję się</strong><small>Szukam zaawansowanej, specjalistycznej wiedzy</small><ArrowRight /></button>
      </div>
    </section>

    {/* === 7. COURSE CATALOG — main offer === */}
    <section id="kursy" className="academy-catalog-section scroll-mt-24">
      <div className="academy-section-heading">
        <div>
          <p className="academy-kicker text-caramel">Kursy online</p>
          <h2>Wybierz swój następny krok</h2>
        </div>
        <p>Najpierw zobacz program i efekty nauki. Decyzję podejmujesz bez presji.</p>
      </div>
      <div className="academy-discovery-bar">
        <label><Search className="w-4 h-4" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Czego chcesz się nauczyć?" aria-label="Szukaj kursu" /></label>
        <div className="academy-filters">
          {levels.map(([key, label]) => <button key={key} aria-pressed={level === key} onClick={() => setLevel(key)} className={level === key ? 'selected' : ''}>{label}</button>)}
        </div>
      </div>
      <div className="academy-catalog-tools">
        <select value={tag} onChange={event => setTag(event.target.value)} aria-label="Temat kursu"><option value="ALL">Wszystkie tematy</option>{availableTags.map(item => <option key={item} value={item}>{item}</option>)}</select>
        <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sortowanie kursów"><option value="RECOMMENDED">Polecane</option><option value="NEWEST">Nowości</option><option value="PRICE_ASC">Cena: od najniższej</option><option value="DURATION">Najkrótsze</option></select>
        {isAuthenticated && <button aria-pressed={savedOnly} className={savedOnly ? 'selected' : ''} onClick={() => setSavedOnly(value => !value)}><Heart className="w-4 h-4" />Zapisane</button>}
      </div>
      {coursesLoading
        ? <div className="academy-course-grid">{[1,2,3].map(i => <div key={i} className="academy-skeleton" style={{height:380}} />)}</div>
        : coursesError
          ? <div className="academy-empty"><Search /><h3>Nie udało się pobrać katalogu</h3><p>Sprawdź połączenie i spróbuj ponownie.</p><button onClick={() => refetchCourses()}>Spróbuj ponownie</button></div>
          : filteredCourses.length === 0
            ? <div className="academy-empty"><Search /><h3>Nie znaleźliśmy pasującego kursu</h3><p>Zmień kryteria albo pokaż wszystkie kursy.</p><button onClick={() => { setQuery(''); setLevel('ALL'); setTag('ALL'); setSavedOnly(false); }}>Pokaż wszystkie kursy</button></div>
            : <div className="academy-course-grid">{filteredCourses.map((course) => <CourseCard key={course.id} course={course} featured={course.isFeatured} favorite={favoriteIds.has(course.id)} canFavorite={isAuthenticated} onToggleFavorite={() => toggleFavorite(course.id)} />)}</div>}
    </section>

    {/* === 8. BUNDLES — upsell === */}
    {(bundles as any[]).length > 0 && <section className="academy-bundles-section">
      <div className="academy-section-heading">
        <div><p className="academy-kicker text-caramel">Pakiety edukacyjne</p><h2>Pełniejsze ścieżki w lepszej cenie</h2></div>
        <p>Jeden zakup odblokowuje wszystkie kursy wskazane w pakiecie.</p>
      </div>
      <div className="academy-bundle-grid">
        {(bundles as any[]).map(bundle => <Link key={bundle.id} to={`/pakiet/${bundle.slug}`}>
          <span>{bundle.courses.length} kursy</span>
          <h3>{bundle.title}</h3>
          <p>{bundle.description}</p>
          <ul>{bundle.courses.slice(0,4).map((item: any) => <li key={item.courseId}><Check />{item.course.title}</li>)}</ul>
          <strong>{Number(bundle.price).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>
          {Number(bundle.compareAtPrice) > Number(bundle.price) && <>
            <del>{Number(bundle.compareAtPrice).toLocaleString('pl-PL')} zł</del>
            <small className="academy-card-lowest">Najniższa cena z 30 dni: {Number(bundle.lowestPrice30Days).toLocaleString('pl-PL')} zł</small>
          </>}
          <em>Zobacz pakiet <ArrowRight /></em>
        </Link>)}
      </div>
    </section>}

    {/* === 9. HOW IT WORKS === */}
    <section id="jak-to-dziala" className="academy-how-section">
      <div>
        <p className="academy-kicker text-caramel">Prosty proces</p>
        <h2>Od &bdquo;nie jestem pewna&rdquo;<br />do &bdquo;wiem, co robię&rdquo;</h2>
      </div>
      <ol>
        <li><span>1</span><div><strong>Wybierasz konkretny cel</strong><p>Program kursu pokazuje dokładnie, czego i w jakiej kolejności się nauczysz.</p></div></li>
        <li><span>2</span><div><strong>Uczysz się na swoich zasadach</strong><p>Wracasz do lekcji, robisz notatki i utrwalasz materiał quizami.</p></div></li>
        <li><span>3</span><div><strong>Wdrażasz i potwierdzasz wiedzę</strong><p>Stosujesz nowe umiejętności w praktyce i zdobywasz certyfikat.</p></div></li>
      </ol>
    </section>

    {/* === 10. QUIZZES / BENEFITS === */}
    <section className="academy-quiz-section">
      <div>
        <p className="academy-kicker text-caramel">{hasAccess ? 'Sprawdź siebie' : 'Co zyskujesz w Akademii?'}</p>
        <h2>{hasAccess ? 'Krótka sesja wiedzy?' : 'Nie tylko oglądasz. Naprawdę się uczysz.'}</h2>
        <p>{hasAccess ? 'Quizy utrwalają materiał i pokazują, co warto jeszcze powtórzyć.' : 'Lekcje, quizy, materiały, certyfikat i wsparcie — wszystko w jednym miejscu.'}</p>
      </div>
      <div className="academy-quiz-list">
        {hasAccess && quizzesLoading
          ? <div className="academy-skeleton h-28" />
          : hasAccess
            ? (quizzes as any[]).slice(0, 3).map(quiz => <Link key={quiz.id} to={`/quiz/${quiz.id}`}><span><Star className="w-4 h-4" /></span><div><strong>{quiz.title}</strong><small>{quiz._count?.questions ?? 0} pytań · próg {quiz.passingScore}%</small></div><ArrowRight className="w-4 h-4" /></Link>)
            : <>
              <div className="academy-benefit-item"><span><PlayCircle className="w-4 h-4" /></span><div><strong>Lekcje wideo i tekstowe</strong><small>Krótkie, praktyczne jednostki — uczysz się, kiedy chcesz.</small></div></div>
              <div className="academy-benefit-item"><span><Shield className="w-4 h-4" /></span><div><strong>Quizy i ćwiczenia</strong><small>Sprawdzasz wiedzę po każdym module, a nie na końcu.</small></div></div>
              <div className="academy-benefit-item"><span><Award className="w-4 h-4" /></span><div><strong>Certyfikat ukończenia</strong><small>Potwierdzenie kompetencji do portfolio i CV.</small></div></div>
            </>}
      </div>
    </section>

    {/* === 11. INSTRUCTOR === */}
    <InstructorSection preview={preview} />

    {/* === 12. FAQ === */}
    <section className="academy-faq-section">
      <div>
        <p className="academy-kicker text-caramel">Zanim zaczniesz</p>
        <h2>Najczęstsze pytania</h2>
        <p>Konkretne zasady dostępu, nauki i certyfikacji.</p>
      </div>
      <div className="academy-faq-list">
        <details><summary>Jak długo mam dostęp do kursu?</summary><p>Informacja o okresie dostępu jest podawana przy konkretnym kursie. Kursy bez wskazanego terminu pozostają dostępne bez ograniczenia czasowego.</p></details>
        <details><summary>Kiedy otrzymam certyfikat?</summary><p>Certyfikat jest generowany automatycznie po ukończeniu wszystkich wymaganych lekcji lub zdaniu właściwego quizu.</p></details>
        <details><summary>Czy mogę uczyć się na telefonie?</summary><p>Tak. Akademia działa na telefonie, tablecie i komputerze, a postęp zapisuje się na Twoim koncie.</p></details>
        <details><summary>Gdzie mogę zadać pytanie?</summary><p>Każda zalogowana kursantka może skorzystać z prywatnej sekcji &bdquo;Zapytaj kosmetologa&rdquo;, również bezpośrednio z lekcji.</p></details>
        <details><summary>Czy mogę otrzymać fakturę?</summary><p>Tak. Po zakupie faktura jest generowana automatycznie i dostępna w panelu kursantki.</p></details>
      </div>
    </section>

    {/* === 13. NEWSLETTER === */}
    <LeadForm />

    {/* === 14. FINAL CTA (unauthenticated) === */}
    {!isAuthenticated && <section className="academy-final-cta academy-final-cta-rich">
      <div>
        <p className="academy-kicker">Dołącz do Akademii</p>
        <h2>Załóż darmowe konto i zacznij naukę.</h2>
        <p>Nie potrzebujesz karty płatniczej. Rejestracja zajmuje 30 sekund.</p>
        <ul className="academy-final-cta-perks">
          <li><Check />Przeglądaj pełny katalog kursów</li>
          <li><Check />Zapisuj postęp nauki</li>
          <li><Check />Zdobywaj certyfikaty</li>
          <li><Check />Zadawaj pytania prowadzącej</li>
        </ul>
      </div>
      <div className="academy-final-cta-actions">
        <Link to="/rejestracja" className="academy-button academy-button-gold"><UserPlus className="w-4 h-4" />Załóż darmowe konto</Link>
        <Link to="/logowanie" className="academy-final-cta-login">Masz już konto? <strong>Zaloguj się</strong></Link>
      </div>
    </section>}
  </div>;
}

function CourseCard({ course, featured, favorite, canFavorite, onToggleFavorite }: { course: any; featured?: boolean; favorite?: boolean; canFavorite?: boolean; onToggleFavorite: () => void }) {
  const progress = course.progress?.percentComplete;
  const addToCart = useCartStore(state => state.add);
  return <article className={`academy-course-card ${featured ? 'featured' : ''}`}>
    {canFavorite && <button className="academy-favorite-button" aria-label={favorite ? 'Usuń z zapisanych' : 'Zapisz kurs'} aria-pressed={favorite} onClick={onToggleFavorite}><Heart className={favorite ? 'fill-current' : ''} /></button>}
    <Link to={`/kurs/${course.slug}`} className="block">
      <div className="academy-course-cover">
        {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} loading="lazy" width="1280" height="720" /> : <div className="academy-course-placeholder"><GraduationCap /></div>}
        <span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>
        {course.isComingSoon ? <em>W przygotowaniu</em> : course.isBestseller ? <em>Bestseller</em> : featured && <em>Wyróżniony</em>}
        {progress !== undefined && <div className="academy-cover-progress"><div style={{ width: `${progress}%` }} /></div>}
      </div>
      <div className="academy-course-body">
        <div className="academy-course-meta">
          {course.estimatedMinutes > 0 ? <span><Clock3 />{course.estimatedMinutes} min</span> : <span><Clock3 />Program w przygotowaniu</span>}
          {course.lessonCount > 0 && <span><PlayCircle />{course.lessonCount} lekcji</span>}
        </div>
        <h3>{course.title}</h3>
        <p>{course.description || 'Starannie przygotowany kurs dla specjalistek beauty.'}</p>
        {!course.isEnrolled && <>
          <div className="academy-price-line">
            <strong className="academy-course-price">{formatPrice(course.price, course.isFree, course.isComingSoon)}</strong>
            {Number(course.compareAtPrice) > Number(course.price) && <>
              <del>{formatPrice(course.compareAtPrice)}</del>
              <b>-{Math.round((1 - Number(course.price) / Number(course.compareAtPrice)) * 100)}%</b>
            </>}
          </div>
          {Number(course.compareAtPrice) > Number(course.price) && <small className="academy-card-lowest">Najniższa cena z 30 dni: {Number(course.lowestPrice30Days).toLocaleString('pl-PL')} zł</small>}
        </>}
        <div className="academy-card-footer">
          {course.isEnrolled
            ? <span>{progress !== undefined ? `${Math.round(progress)}% ukończono` : 'Przejdź do kursu'}</span>
            : <span>{course.isComingSoon ? 'Zobacz zapowiedź' : 'Zobacz program'}</span>}
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
    {course.isComingSoon && <WaitlistMini courseId={course.id} />}
    {!course.isComingSoon && !course.isFree && !course.isEnrolled && <button className="academy-add-cart" onClick={() => addToCart({ id: course.id, type: 'course', title: course.title, slug: course.slug, price: Number(course.price), thumbnailUrl: course.thumbnailUrl })}>Dodaj do koszyka</button>}
  </article>;
}

export function formatPrice(value: unknown, isFree = false, isComingSoon = false) {
  if (isComingSoon) return 'Wkrótce';
  if (isFree) return 'Bezpłatny';
  const price = Number(value || 0);
  return price > 0 ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(price) : 'Cena wkrótce';
}

function AcademyBannerSlider({ banners }: { banners: any[] }) {
  const [index, setIndex] = useState(0);
  const banner = banners[index % banners.length];
  useEffect(() => {
    if (!banner) return;
    academyApi.recordBannerEvent(banner.id, 'impression').catch(() => undefined);
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % banners.length), 6500);
    return () => window.clearTimeout(timer);
  }, [banner?.id, banners.length]);
  if (!banner) return null;
  return <section className="academy-marketing-slider">
    {banner.imageUrl && <picture>
      <source media="(max-width:760px)" srcSet={banner.mobileImageUrl || banner.imageUrl} />
      <img src={banner.imageUrl} alt={banner.title || 'Baner promocyjny Akademii'} />
    </picture>}
    <div>
      <span>{banner.badge}</span>
      <h2>{banner.title}</h2>
      <p>{banner.subtitle}</p>
      {banner.buttonUrl && <a href={banner.buttonUrl} onClick={() => academyApi.recordBannerEvent(banner.id, 'click').catch(() => undefined)}>{banner.buttonLabel || 'Zobacz więcej'}<ArrowRight /></a>}
    </div>
    {banners.length > 1 && <nav aria-label="Slajdy">{banners.map((item, i) => <button key={item.id} aria-label={`Slajd ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} />)}</nav>}
  </section>;
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, []);
  const seconds = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return <b>{Math.floor(seconds / 86400)}d {String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:{String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</b>;
}

function SocialProof({ data }: { data: any }) {
  if (!data) return null;
  return <section className="academy-social-proof">
    <div className="academy-social-proof-stats">
      <div><UsersRound /><strong>{data.students}+</strong><span>kursantek</span></div>
      <div><Award /><strong>{data.completions}+</strong><span>ukończeń</span></div>
    </div>
    {data.reviews?.length > 0 && <div className="academy-social-proof-reviews">
      {data.reviews.slice(0, 3).map((review: any) => <blockquote key={review.id}>
        <p>{'★'.repeat(review.rating)}</p>
        <q>{review.content}</q>
        <footer>{review.user.name} · {review.course.title}</footer>
      </blockquote>)}
    </div>}
  </section>;
}

function InstructorSection({ preview }: { preview: any }) {
  return <section className="academy-instructor-section">
    <div className="academy-instructor-content">
      <p className="academy-kicker text-caramel">Poznaj prowadzącą</p>
      <h2>Wiedza prosto z praktyki gabinetowej</h2>
      <p>Wiktoria Ćwik — kosmetolog z wieloletnim doświadczeniem. Prowadzi przez procedury, decyzje i realne przypadki krok po kroku. Każdy kurs to wiedza, którą sama stosuje w codziennej pracy.</p>
      {preview && <Link to={`/kurs/${preview.slug}`} className="academy-instructor-cta">
        <PlayCircle className="w-5 h-5" />Zobacz bezpłatny fragment kursu
      </Link>}
    </div>
  </section>;
}

function LeadForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  return <section className="academy-lead-form">
    <div className="academy-lead-form-content">
      <Mail className="w-6 h-6" />
      <div>
        <p className="academy-kicker">Bezpłatna wiedza</p>
        <h2>Nowości i praktyczne materiały na e-mail</h2>
        <p>Otrzymuj informacje o premierach, promocjach i bezpłatne checklisty.</p>
      </div>
    </div>
    {sent
      ? <strong className="academy-lead-success">Dziękujemy za zapis!</strong>
      : <form onSubmit={async e => { e.preventDefault(); await Promise.all([academyApi.subscribeLead({ email, type: 'NEWSLETTER', source: 'homepage', consent }), academyApi.subscribeLead({ email, type: 'LEAD_MAGNET', source: 'homepage', consent })]); setSent(true); }}>
        <div className="academy-lead-inputs">
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Twój adres e-mail" />
          <button type="submit">Zapisuję się</button>
        </div>
        <label><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Zgadzam się na wiadomości marketingowe. Zapis mogę wycofać.</label>
      </form>}
  </section>;
}

function WaitlistMini({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) return <p className="academy-waitlist-success">Powiadomimy Cię o premierze.</p>;
  if (!open) return <button className="academy-waitlist-button" onClick={() => setOpen(true)}>Powiadom mnie o premierze</button>;
  return <form className="academy-waitlist-mini" onSubmit={async e => { e.preventDefault(); await academyApi.subscribeLead({ email, type: 'WAITLIST', courseId, source: 'course-card', consent: true }); setSent(true); }}>
    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Twój e-mail" />
    <button>Zapisz mnie</button>
  </form>;
}

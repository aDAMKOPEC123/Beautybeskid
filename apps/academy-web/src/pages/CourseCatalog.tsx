import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Brain, Check, Heart, Mail, MapPin, Search, Sparkles, Stethoscope, UserPlus } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { useAuth } from '@/hooks/useAuth';
import { trackAcademyEvent } from '@/lib/academyAnalytics';
import { DocumentTitle } from '@/components/DocumentTitle';
import { CourseCard } from '@/components/CourseCard';

/**
 * Pełny katalog. Świadomie oddzielony od strony głównej: hub ma pomóc wybrać
 * ścieżkę, a tu trafia ktoś, kto już wie, czego szuka, i chce filtrować.
 */
const LEVELS = [
  ['ALL', 'Wszystkie'],
  ['BEGINNER', 'Od podstaw'],
  ['INTERMEDIATE', 'Rozwijam praktykę'],
  ['ADVANCED', 'Poziom ekspert'],
];

export function CourseCatalog() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const deferredQuery = useDeferredValue(query);
  const [level, setLevel] = useState(searchParams.get('poziom') ?? 'ALL');
  const [tag, setTag] = useState(searchParams.get('temat') ?? 'ALL');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'RECOMMENDED');
  const [savedOnly, setSavedOnly] = useState(searchParams.get('zapisane') === '1');

  const { data: publicCourses = [], isLoading, isError, refetch } = useQuery({ queryKey: ['academy', 'public-courses'], queryFn: academyApi.getPublicCourses });
  const { data: enrolledCourses = [] } = useQuery({ queryKey: ['academy', 'enrolled-courses'], queryFn: academyApi.getCourses, enabled: isAuthenticated });
  const { data: favorites = [] } = useQuery({ queryKey: ['academy', 'favorites'], queryFn: academyApi.getFavorites, enabled: isAuthenticated });
  const { data: bundles = [] } = useQuery({ queryKey: ['academy', 'public-bundles'], queryFn: academyApi.getPublicBundles });
  const { data: storefront } = useQuery({ queryKey: ['academy', 'storefront'], queryFn: academyApi.getStorefront });

  const favoriteIds = useMemo(() => new Set((favorites as any[]).map((item) => item.courseId)), [favorites]);
  const enrolledMap = useMemo(() => new Map((enrolledCourses as any[]).map((course) => [course.id, course])), [enrolledCourses]);
  const courses = useMemo(
    () => (publicCourses as any[]).map((course) => ({ ...course, ...(enrolledMap.get(course.id) || {}), isEnrolled: enrolledMap.has(course.id) })),
    [publicCourses, enrolledMap],
  );
  const availableTags = useMemo(() => Array.from(new Set(courses.flatMap((course) => course.tags || []))).sort(), [courses]);

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const phrase = `${course.title} ${course.description || ''} ${(course.tags || []).join(' ')}`.toLowerCase();
    return phrase.includes(deferredQuery.trim().toLowerCase())
      && (level === 'ALL' || course.difficulty === level)
      && (tag === 'ALL' || course.tags?.includes(tag))
      && (!savedOnly || favoriteIds.has(course.id));
  }).sort((a, b) => sort === 'PRICE_ASC'
    ? Number(a.price) - Number(b.price)
    : sort === 'DURATION'
      ? a.estimatedMinutes - b.estimatedMinutes
      : sort === 'NEWEST'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : Number(a.displayOrder || 0) - Number(b.displayOrder || 0)), [courses, deferredQuery, level, tag, savedOnly, favoriteIds, sort]);

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

  const toggleFavorite = async (courseId: string) => {
    if (!isAuthenticated) return;
    if (favoriteIds.has(courseId)) await academyApi.removeFavorite(courseId);
    else await academyApi.addFavorite(courseId);
    await queryClient.invalidateQueries({ queryKey: ['academy', 'favorites'] });
  };

  return (
    <div className="academy-page academy-homepage">
      <DocumentTitle title="Wszystkie kursy kosmetologii online | Akademia BeskidStudio" />
      <Helmet>
        <meta name="description" content="Pełny katalog kursów kosmetologicznych online — filtruj po poziomie, temacie i czasie trwania. Program każdego kursu widoczny przed zakupem." />
        <link rel="canonical" href="https://akademia.kosmetologwiktoriacwik.pl/kursy" />
      </Helmet>

      {storefront?.activePromotion && (
        <div className="academy-promotion-bar">
          <Sparkles /><strong>{storefront.activePromotion.publicLabel || storefront.activePromotion.name}</strong>
          <span>Oferta ograniczona czasowo</span>
          <Countdown until={storefront.activePromotion.endsAt} />
          <a href="#kursy">Zobacz kursy</a>
        </div>
      )}

      {storefront?.banners?.length > 0 && <AcademyBannerSlider banners={storefront.banners} />}

      <section id="kursy" className="academy-catalog-section scroll-mt-24">
        <div className="academy-section-heading">
          <div>
            <p className="academy-kicker text-caramel">Pełny katalog</p>
            <h2>Wszystkie kursy</h2>
          </div>
          <p>Program i efekty nauki widzisz przed zakupem. Nic nie odkrywa się dopiero po płatności.</p>
        </div>
        <div className="academy-discovery-bar">
          <label>
            <Search className="w-4 h-4" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Czego chcesz się nauczyć?" aria-label="Szukaj kursu" />
          </label>
          <div className="academy-filters">
            {LEVELS.map(([key, label]) => (
              <button key={key} aria-pressed={level === key} onClick={() => setLevel(key)} className={level === key ? 'selected' : ''}>{label}</button>
            ))}
          </div>
        </div>
        <div className="academy-catalog-tools">
          <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Temat kursu">
            <option value="ALL">Wszystkie tematy</option>
            {availableTags.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sortowanie kursów">
            <option value="RECOMMENDED">Polecane</option>
            <option value="NEWEST">Nowości</option>
            <option value="PRICE_ASC">Cena: od najniższej</option>
            <option value="DURATION">Najkrótsze</option>
          </select>
          {isAuthenticated && (
            <button aria-pressed={savedOnly} className={savedOnly ? 'selected' : ''} onClick={() => setSavedOnly((value) => !value)}>
              <Heart className="w-4 h-4" />Zapisane
            </button>
          )}
        </div>
        {isLoading
          ? <div className="academy-course-grid">{[1, 2, 3].map((i) => <div key={i} className="academy-skeleton" style={{ height: 380 }} />)}</div>
          : isError
            ? <div className="academy-empty"><Search /><h3>Nie udało się pobrać katalogu</h3><p>Sprawdź połączenie i spróbuj ponownie.</p><button onClick={() => refetch()}>Spróbuj ponownie</button></div>
            : filteredCourses.length === 0
              ? <div className="academy-empty"><Search /><h3>Nie znaleźliśmy pasującego kursu</h3><p>Zmień kryteria albo pokaż wszystkie kursy.</p><button onClick={() => { setQuery(''); setLevel('ALL'); setTag('ALL'); setSavedOnly(false); }}>Pokaż wszystkie kursy</button></div>
              : <div className="academy-course-grid">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} featured={course.isFeatured} favorite={favoriteIds.has(course.id)}
                    canFavorite={isAuthenticated} onToggleFavorite={() => toggleFavorite(course.id)} />
                ))}
              </div>}
      </section>

      {(bundles as any[]).length > 0 && (
        <section className="academy-bundles-section">
          <div className="academy-section-heading">
            <div><p className="academy-kicker text-caramel">Pakiety edukacyjne</p><h2>Pełniejsze ścieżki w lepszej cenie</h2></div>
            <p>Jeden zakup odblokowuje wszystkie kursy wskazane w pakiecie.</p>
          </div>
          <div className="academy-bundle-grid">
            {(bundles as any[]).map((bundle) => (
              <Link key={bundle.id} to={`/pakiet/${bundle.slug}`}>
                <span>{bundle.courses.length} kursy</span>
                <h3>{bundle.title}</h3>
                <p>{bundle.description}</p>
                <ul>{bundle.courses.slice(0, 4).map((item: any) => <li key={item.courseId}><Check />{item.course.title}</li>)}</ul>
                <strong>{Number(bundle.price).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>
                {Number(bundle.compareAtPrice) > Number(bundle.price) && <>
                  <del>{Number(bundle.compareAtPrice).toLocaleString('pl-PL')} zł</del>
                  <small className="academy-card-lowest">Najniższa cena z 30 dni: {Number(bundle.lowestPrice30Days).toLocaleString('pl-PL')} zł</small>
                </>}
                <em>Zobacz pakiet <ArrowRight /></em>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="academy-page-section">
        <h2 className="academy-section-title">Ucz się inaczej</h2>
        <p className="academy-section-subtitle">Narzędzia, które dostajesz razem z dowolnym kursem</p>
        <div className="academy-features">
          <div className="academy-feature-card">
            <MapPin className="w-10 h-10" />
            <h3>Atlas skóry</h3>
            <p>Interaktywna encyklopedia problemów skórnych z galerią zdjęć i opisami klinicznymi</p>
          </div>
          <div className="academy-feature-card">
            <Stethoscope className="w-10 h-10" />
            <h3>Case studies</h3>
            <p>Symulacje diagnostyczne krok po kroku — postaw diagnozę i zaplanuj zabieg</p>
          </div>
          <div className="academy-feature-card">
            <Brain className="w-10 h-10" />
            <h3>Quizy diagnostyczne</h3>
            <p>Sprawdź swoją wiedzę rozpoznając problemy skórne na zdjęciach</p>
          </div>
        </div>
      </section>

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
          <details><summary>Czym jest Atlas Skóry?</summary><p>Atlas Skóry to interaktywna encyklopedia problemów skórnych dostępna dla kursantek. Zawiera opisy kliniczne, zdjęcia różnych stopni nasilenia i quizy diagnostyczne. Dostęp do Atlasu otrzymujesz wraz z zakupem dowolnego kursu.</p></details>
        </div>
      </section>

      <LeadForm />

      {!isAuthenticated && (
        <section className="academy-final-cta academy-final-cta-rich">
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
        </section>
      )}
    </div>
  );
}

function AcademyBannerSlider({ banners }: { banners: any[] }) {
  const [index, setIndex] = useState(0);
  const banner = banners[index % banners.length];
  useEffect(() => {
    if (!banner) return;
    academyApi.recordBannerEvent(banner.id, 'impression').catch(() => undefined);
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % banners.length), 6500);
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
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const seconds = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return <b>{Math.floor(seconds / 86400)}d {String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:{String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</b>;
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
      : <form onSubmit={async (e) => { e.preventDefault(); await academyApi.subscribeLead({ email, type: 'NEWSLETTER', source: 'catalog', consent }); setSent(true); }}>
        <div className="academy-lead-inputs">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Twój adres e-mail" />
          <button type="submit">Zapisuję się</button>
        </div>
        <label><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Zgadzam się na wiadomości marketingowe. Zapis mogę wycofać.</label>
      </form>}
  </section>;
}

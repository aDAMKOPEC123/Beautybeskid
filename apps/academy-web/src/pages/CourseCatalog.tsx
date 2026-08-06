import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, ArrowUpRight, Brain, Check, Heart, Mail, MapPin, Search, Sparkles,
  Stethoscope, UserPlus,
} from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { useAuth } from '@/hooks/useAuth';
import { trackAcademyEvent } from '@/lib/academyAnalytics';
import { DocumentTitle } from '@/components/DocumentTitle';
import { CourseCard, difficultyLabel, formatPrice } from '@/components/CourseCard';
import { useCartStore } from '@/store/cart.store';

/**
 * Pełny katalog. Świadomie oddzielony od strony głównej: hub ma pomóc wybrać
 * ścieżkę, a tu trafia ktoś, kto już wie, czego szuka.
 *
 * Katalog jest dziś przedpremierowy (pojedyncze kursy, część „wkrótce”), więc
 * strona prowadzi jedną ścieżką — karta wiodącego kursu z pełnym programem,
 * a dopiero potem siatka. Narzędzia wyszukiwania pojawiają się wtedy, kiedy
 * jest co filtrować; przy trzech kursach pasek filtrów to sam szum.
 */

const LEVELS = [
  ['ALL', 'Wszystkie'],
  ['BEGINNER', 'Od podstaw'],
  ['INTERMEDIATE', 'Rozwijam praktykę'],
  ['ADVANCED', 'Poziom ekspert'],
];

/** Powyżej tylu kursów siatka + filtry są szybsze niż czytanie kart po kolei. */
const TOOLS_THRESHOLD = 4;

function formatDuration(minutes: number) {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

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

  const filtersActive = deferredQuery.trim() !== '' || level !== 'ALL' || tag !== 'ALL' || savedOnly;
  const showTools = courses.length >= TOOLS_THRESHOLD || filtersActive;

  /**
   * Kurs wiodący: ręcznie wyróżniony, potem bestseller, a w ostateczności
   * pierwszy z kolejności ustawionej w panelu. Nie promujemy losowego kursu.
   */
  const flagship = useMemo(() => {
    if (!courses.length) return null;
    const ordered = [...courses].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
    return ordered.find((c) => c.isFeatured) || ordered.find((c) => c.isBestseller) || ordered[0];
  }, [courses]);

  /** Karta wiodąca ustępuje miejsca wynikom, gdy ktoś zaczyna filtrować. */
  const showFlagship = Boolean(flagship) && !filtersActive;

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

  const gridCourses = useMemo(
    () => (showFlagship ? filteredCourses.filter((course) => course.id !== flagship?.id) : filteredCourses),
    [filteredCourses, showFlagship, flagship],
  );

  const comingSoonCount = courses.filter((course) => course.isComingSoon).length;
  const availableCount = courses.length - comingSoonCount;

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

  const resetFilters = () => { setQuery(''); setLevel('ALL'); setTag('ALL'); setSavedOnly(false); };

  const toggleFavorite = async (courseId: string) => {
    if (!isAuthenticated) return;
    if (favoriteIds.has(courseId)) await academyApi.removeFavorite(courseId);
    else await academyApi.addFavorite(courseId);
    await queryClient.invalidateQueries({ queryKey: ['academy', 'favorites'] });
  };

  return (
    <div className="academy-page academy-catalog-page">
      <DocumentTitle title="Wszystkie kursy kosmetologii online | Akademia BeskidStudio" />
      <Helmet>
        <meta name="description" content="Pełny katalog kursów kosmetologicznych online — program lekcja po lekcji, czas trwania i cena widoczne przed zakupem." />
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

      <header className="catalog-masthead">
        <p className="catalog-eyebrow">Katalog Akademii</p>
        <h1>Kursy kosmetologii online</h1>
        <p className="catalog-lede">
          Program lekcja po lekcji, czas trwania i cena — wszystko widzisz przed zakupem.
          Nic nie odkrywa się dopiero po płatności.
        </p>
        {!isLoading && !isError && courses.length > 0 && (
          <dl className="catalog-state">
            <div><dt>W katalogu</dt><dd>{courses.length}</dd></div>
            {availableCount > 0 && <div><dt>Dostępne teraz</dt><dd>{availableCount}</dd></div>}
            {comingSoonCount > 0 && <div className="is-upcoming"><dt>W przygotowaniu</dt><dd>{comingSoonCount}</dd></div>}
          </dl>
        )}
      </header>

      {showFlagship && flagship && (
        <FlagshipCourse
          course={flagship}
          favorite={favoriteIds.has(flagship.id)}
          canFavorite={isAuthenticated}
          onToggleFavorite={() => toggleFavorite(flagship.id)}
        />
      )}

      {/* Sekcja listy znika w całości, gdy nie ma czego pokazać — inaczej
          zostawia pustą przerwę między kartą wiodącą a resztą strony. */}
      {(showTools || isLoading || isError || filteredCourses.length === 0 || gridCourses.length > 0) && (
      <section id="kursy" className="catalog-listing scroll-mt-24">
        {showTools && (
          <>
            <div className="catalog-tools-head">
              <h2>{filtersActive ? 'Wyniki' : 'Wszystkie kursy'}</h2>
              <p>{filteredCourses.length === 1 ? '1 kurs' : `${filteredCourses.length} kursów`}</p>
            </div>
            <div className="catalog-tools">
              <label className="catalog-search">
                <Search aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Czego chcesz się nauczyć?" aria-label="Szukaj kursu" />
              </label>
              <div className="catalog-levels" role="group" aria-label="Poziom kursu">
                {LEVELS.map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={level === key} onClick={() => setLevel(key)} className={level === key ? 'selected' : ''}>{label}</button>
                ))}
              </div>
              <div className="catalog-refine">
                {availableTags.length > 0 && (
                  <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Temat kursu">
                    <option value="ALL">Wszystkie tematy</option>
                    {availableTags.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                )}
                <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sortowanie kursów">
                  <option value="RECOMMENDED">Polecane</option>
                  <option value="NEWEST">Nowości</option>
                  <option value="PRICE_ASC">Cena: od najniższej</option>
                  <option value="DURATION">Najkrótsze</option>
                </select>
                {isAuthenticated && (
                  <button type="button" aria-pressed={savedOnly} className={savedOnly ? 'selected' : ''} onClick={() => setSavedOnly((value) => !value)}>
                    <Heart aria-hidden />Zapisane
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {isLoading
          ? <div className="catalog-grid">{[1, 2, 3].map((i) => <div key={i} className="academy-skeleton" style={{ height: 380 }} />)}</div>
          : isError
            ? <div className="catalog-notice">
              <h3>Nie udało się pobrać katalogu</h3>
              <p>Sprawdź połączenie i spróbuj ponownie.</p>
              <button type="button" onClick={() => refetch()}>Spróbuj ponownie</button>
            </div>
            : filteredCourses.length === 0
              ? <div className="catalog-notice">
                <h3>{courses.length === 0 ? 'Katalog jest w przygotowaniu' : 'Żaden kurs nie pasuje do tych kryteriów'}</h3>
                <p>{courses.length === 0
                  ? 'Pierwsze kursy pojawią się wkrótce. Zostaw e-mail niżej, a napiszemy w dniu premiery.'
                  : 'Zmień poziom lub temat albo wróć do pełnej listy.'}</p>
                {courses.length > 0 && <button type="button" onClick={resetFilters}>Pokaż wszystkie kursy</button>}
              </div>
              : gridCourses.length > 0
                ? <div className="catalog-grid">
                  {gridCourses.map((course) => (
                    <CourseCard key={course.id} course={course} featured={course.isFeatured} favorite={favoriteIds.has(course.id)}
                      canFavorite={isAuthenticated} onToggleFavorite={() => toggleFavorite(course.id)} />
                  ))}
                </div>
                : null}
      </section>
      )}

      {(bundles as any[]).length > 0 && (
        <section className="catalog-bundles">
          <div className="catalog-section-head">
            <h2>Pakiety</h2>
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

      <section className="catalog-included">
        <div className="catalog-section-head">
          <h2>W każdym kursie</h2>
          <p>Narzędzia, których nie znajdziesz w kursie nagranym na telefon. Odblokowują się z zakupem dowolnego kursu.</p>
        </div>
        <ul className="catalog-included-list">
          <li>
            <MapPin aria-hidden />
            <h3>Atlas skóry</h3>
            <p>Interaktywna encyklopedia problemów skórnych — opisy kliniczne i zdjęcia różnych stopni nasilenia.</p>
          </li>
          <li>
            <Stethoscope aria-hidden />
            <h3>Case studies</h3>
            <p>Symulacje diagnostyczne krok po kroku. Stawiasz diagnozę i planujesz zabieg, zanim staniesz przy fotelu.</p>
          </li>
          <li>
            <Brain aria-hidden />
            <h3>Quizy diagnostyczne</h3>
            <p>Rozpoznajesz problemy skórne na zdjęciach i od razu widzisz, gdzie masz lukę w wiedzy.</p>
          </li>
        </ul>
      </section>

      <section className="catalog-faq">
        <div className="catalog-section-head">
          <h2>Pytania przed zakupem</h2>
          <p>Zasady dostępu, nauki i certyfikacji — bez gwiazdek.</p>
        </div>
        <div className="catalog-faq-list">
          <details><summary>Jak długo mam dostęp do kursu?</summary><p>Okres dostępu jest podany przy konkretnym kursie. Kursy bez wskazanego terminu pozostają dostępne bez ograniczenia czasowego.</p></details>
          <details><summary>Kiedy otrzymam certyfikat?</summary><p>Certyfikat generuje się automatycznie po ukończeniu wszystkich wymaganych lekcji lub zdaniu właściwego quizu.</p></details>
          <details><summary>Czy mogę uczyć się na telefonie?</summary><p>Tak. Akademia działa na telefonie, tablecie i komputerze, a postęp zapisuje się na Twoim koncie.</p></details>
          <details><summary>Gdzie zadam pytanie do materiału?</summary><p>Każda zalogowana kursantka pisze w prywatnej sekcji „Zapytaj kosmetologa” — również bezpośrednio z poziomu lekcji.</p></details>
          <details><summary>Czy dostanę fakturę?</summary><p>Tak. Po zakupie faktura generuje się automatycznie i czeka w panelu kursantki.</p></details>
          <details><summary>Czym jest Atlas skóry?</summary><p>Interaktywna encyklopedia problemów skórnych z opisami klinicznymi, zdjęciami i quizami diagnostycznymi. Dostęp otrzymujesz razem z dowolnym kursem.</p></details>
        </div>
      </section>

      <LeadForm />

      {!isAuthenticated && (
        <section className="catalog-signup">
          <div>
            <p className="catalog-eyebrow">Dołącz do Akademii</p>
            <h2>Załóż darmowe konto i zacznij naukę</h2>
            <p className="catalog-signup-lede">Bez karty płatniczej. Rejestracja zajmuje 30 sekund.</p>
            <ul>
              <li><Check aria-hidden />Przeglądasz pełny katalog i programy kursów</li>
              <li><Check aria-hidden />Zapisujesz postęp nauki</li>
              <li><Check aria-hidden />Zdobywasz certyfikaty</li>
              <li><Check aria-hidden />Pytasz prowadzącą o materiał</li>
            </ul>
          </div>
          <div className="catalog-signup-actions">
            <Link to="/rejestracja" className="catalog-cta"><UserPlus aria-hidden />Załóż darmowe konto</Link>
            <Link to="/logowanie" className="catalog-signup-login">Masz już konto? <strong>Zaloguj się</strong></Link>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Karta wiodącego kursu w formie karty zabiegowej: rząd danych i program
 * moduł po module, jeszcze przed kliknięciem. To jedyne miejsce na stronie,
 * które ma prawo krzyczeć — reszta katalogu zostaje cicha.
 */
function FlagshipCourse({ course, favorite, canFavorite, onToggleFavorite }: {
  course: any; favorite?: boolean; canFavorite?: boolean; onToggleFavorite?: () => void;
}) {
  const addToCart = useCartStore((state) => state.add);
  const { data: detail } = useQuery({
    queryKey: ['academy', 'public-course', course.slug],
    queryFn: () => academyApi.getPublicCourseBySlug(course.slug),
  });
  const modules: any[] = detail?.modules ?? [];
  const duration = formatDuration(course.estimatedMinutes);
  const lessons = detail?.modules?.reduce((sum: number, m: any) => sum + (m.lessonCount || 0), 0) ?? course.lessonCount ?? 0;
  const discount = Number(course.compareAtPrice) > Number(course.price)
    ? Math.round((1 - Number(course.price) / Number(course.compareAtPrice)) * 100)
    : 0;
  const instructor = detail?.instructorName || course.instructorName;

  return (
    <section className={`catalog-flagship${course.isComingSoon ? ' is-upcoming' : ''}`} aria-labelledby="flagship-title">
      <div className="catalog-flagship-visual">
        {course.thumbnailUrl
          ? <img src={course.thumbnailUrl} alt="" width="1280" height="720" />
          : <div className="catalog-flagship-placeholder" aria-hidden />}
        <span className="catalog-status">{course.isComingSoon ? 'W przygotowaniu' : course.isBestseller ? 'Bestseller' : 'Dostępny teraz'}</span>
        {canFavorite && onToggleFavorite && (
          <button type="button" className="catalog-flagship-save" aria-label={favorite ? 'Usuń z zapisanych' : 'Zapisz kurs'} aria-pressed={favorite} onClick={onToggleFavorite}>
            <Heart className={favorite ? 'fill-current' : ''} aria-hidden />
          </button>
        )}
      </div>

      <div className="catalog-flagship-body">
        <p className="catalog-eyebrow">{course.isComingSoon ? 'Najbliższa premiera' : 'Kurs wiodący'}</p>
        <h2 id="flagship-title">{course.title}</h2>
        {instructor && <p className="catalog-flagship-byline">Prowadzi {instructor}</p>}
        <p className="catalog-flagship-lede">{course.description}</p>

        {/* Cztery pola, zawsze cztery — rząd ma się czytać jak etykieta, więc
            nie może się rozjeżdżać w zależności od tego, co uzupełniono. */}
        <dl className="catalog-specs">
          <div><dt>Poziom</dt><dd>{difficultyLabel[course.difficulty] ?? course.difficulty}</dd></div>
          <div><dt>Czas</dt><dd>{duration ?? 'w opracowaniu'}</dd></div>
          <div><dt>Lekcje</dt><dd>{lessons > 0 ? lessons : 'w opracowaniu'}</dd></div>
          <div><dt>Cena</dt><dd>{formatPrice(course.price, course.isFree)}{discount > 0 && <em>−{discount}%</em>}</dd></div>
        </dl>

        {modules.length > 0 && (
          <div className="catalog-program">
            <h3>Program</h3>
            <ol>
              {modules.map((module, index) => (
                <li key={module.id}>
                  <span className="catalog-program-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="catalog-program-title">{module.title}</span>
                  <span className="catalog-program-meta">
                    {module.lessonCount > 0 ? `${module.lessonCount} ${module.lessonCount === 1 ? 'lekcja' : 'lekcje'}` : 'wkrótce'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="catalog-flagship-actions">
          {course.isEnrolled
            ? <Link to={`/kurs/${course.slug}`} className="catalog-cta">Kontynuuj kurs<ArrowRight aria-hidden /></Link>
            : course.isComingSoon
              ? <FlagshipWaitlist courseId={course.id} />
              : <>
                <Link to={`/kurs/${course.slug}`} className="catalog-cta">Zobacz program<ArrowRight aria-hidden /></Link>
                {!course.isFree && (
                  <button type="button" className="catalog-cta-ghost" onClick={() => addToCart({
                    id: course.id, type: 'course', title: course.title, slug: course.slug,
                    price: Number(course.price), thumbnailUrl: course.thumbnailUrl,
                  })}>Dodaj do koszyka</button>
                )}
              </>}
          <Link to={`/kurs/${course.slug}`} className="catalog-flagship-more">
            Pełny opis kursu<ArrowUpRight aria-hidden />
          </Link>
        </div>

        {discount > 0 && (
          <p className="catalog-lowest">Najniższa cena z 30 dni: {Number(course.lowestPrice30Days).toLocaleString('pl-PL')} zł</p>
        )}
      </div>
    </section>
  );
}

function FlagshipWaitlist({ courseId }: { courseId: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (sent) return <p className="catalog-waitlist-done"><Check aria-hidden />Zapisane. Napiszemy w dniu premiery.</p>;

  return (
    <form
      className="catalog-waitlist"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true); setError('');
        try {
          await academyApi.subscribeLead({ email, type: 'WAITLIST', courseId, source: 'catalog-flagship', consent: true });
          setSent(true);
        } catch {
          setError('Nie udało się zapisać adresu. Spróbuj ponownie za chwilę.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="flagship-waitlist-email">Powiadom mnie o premierze</label>
      <div>
        <input
          id="flagship-waitlist-email" required type="email" value={email} autoComplete="email"
          onChange={(event) => setEmail(event.target.value)} placeholder="Twój adres e-mail"
        />
        <button type="submit" className="catalog-cta" disabled={busy}>{busy ? 'Zapisuję…' : 'Zapisz mnie'}</button>
      </div>
      {error ? <p className="catalog-waitlist-error" role="alert">{error}</p> : <p>Jeden e-mail w dniu premiery. Wypisujesz się jednym kliknięciem.</p>}
    </form>
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

/**
 * Newsletter jest tu drugim, słabszym zapytaniem — zapis na premierę przy
 * karcie kursu jest tym mocniejszym. Dlatego to cichy pasek na papierze,
 * a nie kolejny wypełniony panel konkurujący z zamknięciem lejka.
 */
function LeadForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  return <section className="catalog-newsletter">
    <div className="catalog-newsletter-copy">
      <Mail aria-hidden />
      <div>
        <h2>Nowości i materiały na e-mail</h2>
        <p>Premiery, promocje i bezpłatne checklisty. Bez spamu.</p>
      </div>
    </div>
    {sent
      ? <p className="catalog-waitlist-done"><Check aria-hidden />Zapisane. Odezwiemy się przy najbliższej premierze.</p>
      : <form onSubmit={async (e) => { e.preventDefault(); await academyApi.subscribeLead({ email, type: 'NEWSLETTER', source: 'catalog', consent }); setSent(true); }}>
        <div>
          <input required type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="Twój adres e-mail" aria-label="Adres e-mail do newslettera" />
          <button type="submit" className="catalog-cta-ghost">Zapisuję się</button>
        </div>
        <label><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Zgadzam się na wiadomości marketingowe. Zapis mogę wycofać w każdej chwili.</label>
      </form>}
  </section>;
}

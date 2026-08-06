import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PERSONA_LIST } from '@/lib/personas';
import { useReveal } from '@/hooks/useReveal';

/**
 * Hub lejka. Ta strona niczego nie sprzedaje — ma jedno zadanie: pozwolić
 * użytkowniczce rozpoznać siebie i przejść na właściwy landing. Katalog z filtrami
 * przeniesiony na `/kursy`, żeby nie rozpraszać decyzji o tym, kim się jest.
 */
const PILLARS = [
  {
    title: 'Od decyzji, nie od produktu',
    body: 'Zanim pokażemy, jak wykonać zabieg, tłumaczymy, kiedy go nie wykonywać. Technikę dobudujesz — decyzji nie nadrobisz po fakcie.',
  },
  {
    title: 'Przypadki, nie slajdy',
    body: 'Materiał powstaje na bazie tego, co realnie wchodzi do gabinetu: skóra reaktywna, powikłania, sytuacje bez podręcznikowej odpowiedzi.',
  },
  {
    title: 'Wiedza, nie sprzęt',
    body: 'Uczymy obszarów, które większość gabinetów omija, bo wymagają rozumienia, a nie kolejnego urządzenia. Tam jest przewaga.',
  },
];

export function Discover() {
  const reveal = useReveal<HTMLDivElement>();

  const { data: storefront } = useQuery({ queryKey: ['academy', 'storefront'], queryFn: academyApi.getStorefront });
  const { data: courses = [] } = useQuery({ queryKey: ['academy', 'public-courses'], queryFn: academyApi.getPublicCourses });

  const proof = storefront?.socialProof;
  const reviews: any[] = proof?.reviews ?? [];
  // Progi wiarygodności — poniżej nich liczby szkodzą bardziej, niż pomagają.
  const showRating = (proof?.reviewCount ?? 0) >= 3 && proof?.avgRating != null;
  const showStudents = (proof?.students ?? 0) >= 25;
  const catalog = proof?.catalog;

  const instructor = (courses as any[]).find((course) => course.instructor)?.instructor ?? null;

  return (
    <div className="funnel-page" ref={reveal}>
      <DocumentTitle title="Akademia BeskidStudio — kosmetologia od decyzji, nie od produktu" />
      <Helmet>
        <meta name="description" content="Kursy kosmetologii online prowadzone przez magistra kosmetologii. Uczymy rozpoznawać, kiedy zabiegu nie wykonywać — i dopiero potem, jak go wykonać." />
        <link rel="canonical" href="https://akademia.kosmetologwiktoriacwik.pl/" />
        <meta property="og:title" content="Akademia BeskidStudio" />
        <meta property="og:description" content="Kosmetologia od decyzji, nie od produktu." />
      </Helmet>

      {/* 1. HERO */}
      <header className="hub-hero">
        <div className="hub-hero-inner">
          <p className="funnel-eyebrow" data-reveal>Akademia BeskidStudio</p>
          <h1 data-reveal style={{ transitionDelay: '80ms' }}>{'Przestań zgadywać.\n'}<em>Zacznij wiedzieć.</em></h1>
          <p className="hub-hero-lead" data-reveal style={{ transitionDelay: '160ms' }}>
            Najdroższy błąd w gabinecie to nie nieporadny ruch dłoni. To dobrze wykonany zabieg
            na niewłaściwej skórze. Uczymy w kolejności, która przed tym chroni.
          </p>
          <div className="hub-hero-facts" data-reveal style={{ transitionDelay: '240ms' }}>
            {showStudents
              ? <div><strong>{proof!.students}+</strong><span>kursantek</span></div>
              : <div><strong>mgr</strong><span>kosmetologii prowadzi</span></div>}
            <div><strong>{catalog?.courses ?? 0}</strong><span>kursów</span></div>
            <div><strong>{catalog?.lessons ?? 0}</strong><span>lekcji</span></div>
            {showRating
              ? <div><strong>{proof!.avgRating}</strong><span>średnia ocena</span></div>
              : <div><strong>{catalog?.hours ?? 0} h</strong><span>materiału</span></div>}
          </div>
        </div>
      </header>

      {/* 2. TRZY BRAMY — jedyna decyzja na tej stronie */}
      <section className="funnel-section" aria-labelledby="bramy">
        <div>
          <p className="funnel-eyebrow" data-reveal>Wybierz punkt startu</p>
          <h2 className="funnel-h2" id="bramy" data-reveal style={{ transitionDelay: '60ms' }}>Gdzie dziś jesteś?</h2>
          <p className="funnel-lead" data-reveal style={{ transitionDelay: '120ms' }}>
            Nie pytamy o poziom kursu, tylko o Twoją sytuację. Od niej zależy, co ma sens teraz,
            a co byłoby stratą czasu i pieniędzy.
          </p>
          <nav className="hub-gates" aria-label="Ścieżki nauki">
            {PERSONA_LIST.map((persona, index) => (
              <Link key={persona.key} to={persona.path} className="hub-gate" data-reveal
                style={{ transitionDelay: `${index * 90}ms` }}>
                <span className="hub-gate-index">{String(index + 1).padStart(2, '0')}</span>
                <strong>{persona.gate.label}</strong>
                <p>{persona.gate.sub}</p>
                <span className="hub-gate-cta">{persona.gate.cta}<ArrowRight className="w-4 h-4" /></span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* 3. DOWÓD — opinie, jeśli są; inaczej konkret zamiast pustych liczb */}
      <section className="funnel-section funnel-dark" aria-labelledby="dowod">
        <div>
          <p className="funnel-eyebrow" data-reveal>{reviews.length ? 'Co mówią kursantki' : 'Na czym to stoi'}</p>
          <h2 className="funnel-h2" id="dowod" data-reveal style={{ transitionDelay: '60ms' }}>
            {reviews.length ? 'Opinie po ukończeniu kursu' : 'Konkret zamiast obietnic'}
          </h2>

          {reviews.length > 0 ? (
            <div className="hub-pillars">
              {reviews.slice(0, 3).map((review, index) => (
                <blockquote key={review.id} className="hub-pillar" data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                  <span aria-label={`Ocena ${review.rating} na 5`} style={{ color: 'var(--ac-gold)', letterSpacing: '.2em' }}>
                    {'★'.repeat(review.rating)}
                  </span>
                  <p>{review.content}</p>
                  <footer style={{ fontSize: 12, opacity: .55 }}>{review.user?.name} · {review.course?.title}</footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <>
              <p className="funnel-lead" data-reveal style={{ transitionDelay: '120ms' }}>
                Akademia jest młoda i nie mamy jeszcze opinii, którymi moglibyśmy się tu zasłonić.
                Zamiast tego pokazujemy dokładnie to, co dostajesz.
              </p>
              <div className="hub-pillars">
                <div className="hub-pillar" data-reveal>
                  <strong>{catalog?.courses ?? 0} kursów, {catalog?.lessons ?? 0} lekcji</strong>
                  <p>Pełny program każdego kursu jest widoczny przed zakupem. Nic nie odkrywa się dopiero po płatności.</p>
                </div>
                <div className="hub-pillar" data-reveal style={{ transitionDelay: '90ms' }}>
                  <strong>Bezpłatny fragment</strong>
                  <p>Zanim zapłacisz, oglądasz prawdziwą lekcję z kursu i oceniasz poziom sama.</p>
                </div>
                <div className="hub-pillar" data-reveal style={{ transitionDelay: '180ms' }}>
                  <strong>Autor z gabinetu</strong>
                  <p>Materiał pisze osoba, która te zabiegi wykonuje codziennie — nie dział marketingu.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. DLACZEGO TO DZIAŁA */}
      <section className="funnel-section" aria-labelledby="filary">
        <div>
          <p className="funnel-eyebrow" data-reveal>Podejście</p>
          <h2 className="funnel-h2" id="filary" data-reveal style={{ transitionDelay: '60ms' }}>Dlaczego uczymy odwrotnie</h2>
          <div className="hub-pillars">
            {PILLARS.map((pillar, index) => (
              <div key={pillar.title} className="hub-pillar" data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <strong>{pillar.title}</strong>
                <p>{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PROWADZĄCA — sekcja znika, gdy nikt nie jest przypisany */}
      {instructor && (
        <section className="funnel-section" style={{ background: '#fff' }} aria-labelledby="prowadzaca">
          <div>
            <p className="funnel-eyebrow" data-reveal>Kto uczy</p>
            <div className="hub-instructor">
              <div data-reveal>
                {instructor.photoUrl
                  ? <div className="hub-instructor-media"><img src={instructor.photoUrl} alt={instructor.name} loading="lazy" /></div>
                  : <div className="hub-instructor-media is-empty">brak zdjęcia</div>}
              </div>
              <div data-reveal style={{ transitionDelay: '90ms' }}>
                <h2 className="funnel-h2" id="prowadzaca" style={{ marginTop: 0 }}>{instructor.name}</h2>
                <p className="funnel-lead" style={{ marginTop: 12 }}>{instructor.shortBio}</p>
                {instructor.credentials?.length > 0 && (
                  <ul className="hub-credentials">
                    {instructor.credentials.map((item: string) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                <blockquote className="hub-instructor-quote">
                  „Zanim pokażę, jak wykonać zabieg, tłumaczę, kiedy go nie wykonywać."
                </blockquote>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. DOMKNIĘCIE */}
      <section className="funnel-section funnel-dark">
        <div className="pl-close">
          <div data-reveal>
            <h2 className="funnel-h2" style={{ marginTop: 0 }}>Wybierz swoją ścieżkę</h2>
            <p className="funnel-lead">Trzy minuty na decyzję, kim jesteś. Resztę mamy ułożone.</p>
          </div>
          <div data-reveal style={{ transitionDelay: '90ms', display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <Link to={PERSONA_LIST[0].path} className="funnel-cta">Zacznij od podstaw<ArrowRight className="w-4 h-4" /></Link>
            <Link to="/kursy" className="funnel-ghost">Wolę przejrzeć wszystkie kursy<ArrowUpRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

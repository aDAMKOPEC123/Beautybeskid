import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, Download } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { DocumentTitle } from '@/components/DocumentTitle';
import { CourseCard } from '@/components/CourseCard';
import { useReveal } from '@/hooks/useReveal';
import { coursesForAudience, personaByPath, type Persona } from '@/lib/personas';

/**
 * Jeden szkielet dla wszystkich trzech person — struktura PAS (problem → agitacja
 * → rozwiązanie), treść wyłącznie z `lib/personas.ts`.
 *
 * Degradacja warunkowa: jeśli do persony nie przypisano żadnego kursu, strona
 * przechodzi w tryb walidacji popytu (zapis na listę) zamiast pokazywać pustkę.
 */
export function PersonaLanding() {
  const location = useLocation();
  const persona = personaByPath(location.pathname);
  const reveal = useReveal<HTMLDivElement>();

  const { data: courses = [] } = useQuery({ queryKey: ['academy', 'public-courses'], queryFn: academyApi.getPublicCourses });
  const matching = useMemo(
    () => (persona ? coursesForAudience(courses as any[], persona.audience) : []),
    [courses, persona],
  );

  useEffect(() => {
    if (!persona || !import.meta.env.DEV) return;
    if (!persona.leadMagnet.fileUrl) {
      console.warn(`[akademia] Brak pliku lead magnetu dla ${persona.path} — sekcja „${persona.leadMagnet.title}" jest ukryta. Uzupełnij fileUrl w src/lib/personas.ts.`);
    }
    if (!matching.length) {
      console.warn(`[akademia] Żaden kurs nie ma persony ${persona.audience} — ${persona.path} działa w trybie listy oczekujących.`);
    }
  }, [persona, matching.length]);

  if (!persona) return <Navigate to="/" replace />;

  const hasCourses = matching.length > 0;

  return (
    <div className="funnel-page" ref={reveal}>
      <DocumentTitle title={`${persona.hero.kicker} — Akademia BeskidStudio`} />
      <Helmet>
        <meta name="description" content={persona.hero.lead} />
        <link rel="canonical" href={`https://akademia.kosmetologwiktoriacwik.pl${persona.path}`} />
        <meta property="og:title" content={persona.hero.h1.replace('\n', ' ')} />
        <meta property="og:description" content={persona.hero.lead} />
      </Helmet>

      {/* 1. HERO */}
      <header className="pl-hero">
        <div className="pl-hero-inner">
          <Link to="/" className="pl-back" data-reveal><ArrowLeft className="w-4 h-4" />Wróć do wyboru ścieżki</Link>
          <p className="funnel-eyebrow" data-reveal style={{ transitionDelay: '60ms' }}>{persona.hero.kicker}</p>
          <h1 data-reveal style={{ transitionDelay: '120ms' }}>{persona.hero.h1}</h1>
          <p className="funnel-lead" data-reveal style={{ transitionDelay: '200ms' }}>{persona.hero.lead}</p>
          <a href={hasCourses ? '#oferta' : '#lista'} className="funnel-cta" data-reveal style={{ transitionDelay: '280ms' }}>
            {persona.hero.cta}<ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* 2. PROBLEM */}
      <section className="funnel-section" aria-labelledby="problem">
        <div>
          <p className="funnel-eyebrow" data-reveal>Punkt wyjścia</p>
          <h2 className="funnel-h2" id="problem" data-reveal style={{ transitionDelay: '60ms' }}>{persona.problem.title}</h2>
          <ul className="pl-problem-list">
            {persona.problem.bullets.map((bullet, index) => (
              <li key={bullet} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>{bullet}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. AGITACJA */}
      <section className="funnel-section funnel-dark" aria-labelledby="agitacja">
        <div className="pl-agitation">
          <h2 className="funnel-h2" id="agitacja" data-reveal style={{ marginTop: 0 }}>{persona.agitation.title}</h2>
          <p className="pl-agitation-body" data-reveal style={{ transitionDelay: '90ms' }}>{persona.agitation.body}</p>
        </div>
      </section>

      {/* 4. ROZWIĄZANIE */}
      <section className="funnel-section" aria-labelledby="rozwiazanie">
        <div>
          <p className="funnel-eyebrow" data-reveal>Co z tym robimy</p>
          <h2 className="funnel-h2" id="rozwiazanie" data-reveal style={{ transitionDelay: '60ms' }}>{persona.solution.title}</h2>
          <p className="funnel-lead" data-reveal style={{ transitionDelay: '120ms' }}>{persona.solution.body}</p>
          <div className="pl-outcomes">
            {persona.solution.outcomes.map((outcome, index) => (
              <div key={outcome} className="pl-outcome" data-reveal style={{ transitionDelay: `${index * 70}ms` }}>
                <Check className="w-4 h-4" /><span>{outcome}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. OFERTA albo WALIDACJA POPYTU */}
      {hasCourses ? (
        <section className="funnel-section funnel-paper" id="oferta" aria-labelledby="oferta-title">
          <div>
            <p className="funnel-eyebrow" data-reveal>Kursy na tej ścieżce</p>
            <h2 className="funnel-h2" id="oferta-title" data-reveal style={{ transitionDelay: '60ms' }}>Od czego zacząć</h2>
            <div className="pl-courses" data-reveal style={{ transitionDelay: '120ms' }}>
              {matching.map((course: any) => <CourseCard key={course.id} course={course} featured={course.isFeatured} />)}
            </div>
            <Link to="/kursy" className="funnel-ghost" data-reveal style={{ marginTop: 32, display: 'inline-flex' }}>
              Zobacz pełny katalog<ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="funnel-section funnel-paper" id="lista" aria-labelledby="lista-title">
          <div>
            <p className="funnel-eyebrow" data-reveal>Program w przygotowaniu</p>
            <h2 className="funnel-h2" id="lista-title" data-reveal style={{ transitionDelay: '60ms' }}>Nie sprzedajemy tego, czego jeszcze nie ma</h2>
            <p className="funnel-lead" data-reveal style={{ transitionDelay: '120ms' }}>
              Materiał na tej ścieżce dopiero powstaje. Zapisz się, a odezwiemy się z pytaniem,
              od którego tematu zacząć — i wejdziesz przed premierą, w cenie przedpremierowej.
            </p>
            <PersonaWaitlist persona={persona} />
          </div>
        </section>
      )}

      {/* 6. LEAD MAGNET — renderuje się dopiero, gdy plik faktycznie istnieje */}
      {persona.leadMagnet.fileUrl && (
        <section className="funnel-section funnel-dark" aria-labelledby="materialy">
          <div className="pl-magnet">
            <div data-reveal>
              <p className="funnel-eyebrow">Bezpłatny materiał</p>
              <h2 className="funnel-h2" id="materialy" style={{ marginTop: 12 }}>{persona.leadMagnet.title}</h2>
              <p className="funnel-lead">{persona.leadMagnet.promise}</p>
              <ul className="pl-problem-list">
                {persona.leadMagnet.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </div>
            <div data-reveal style={{ transitionDelay: '90ms' }}>
              <LeadMagnetForm persona={persona} />
            </div>
          </div>
        </section>
      )}

      {/* 7. OBIEKCJE */}
      <section className="funnel-section" aria-labelledby="obiekcje">
        <div>
          <p className="funnel-eyebrow" data-reveal>Zanim zdecydujesz</p>
          <h2 className="funnel-h2" id="obiekcje" data-reveal style={{ transitionDelay: '60ms' }}>To, o co pytasz najczęściej</h2>
          <div className="pl-objections">
            {persona.objections.map((objection, index) => (
              <div key={objection.q} className="pl-objection" data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <strong>{objection.q}</strong>
                <p>{objection.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. DOMKNIĘCIE */}
      <section className="funnel-section funnel-dark">
        <div className="pl-close">
          <div data-reveal>
            <h2 className="funnel-h2" style={{ marginTop: 0 }}>{persona.close.title}</h2>
            <p className="funnel-lead">{persona.close.body}</p>
          </div>
          <div data-reveal style={{ transitionDelay: '90ms' }}>
            <a href={hasCourses ? '#oferta' : '#lista'} className="funnel-cta">{persona.close.cta}<ArrowRight className="w-4 h-4" /></a>
          </div>
        </div>
      </section>
    </div>
  );
}

function PersonaWaitlist({ persona }: { persona: Persona }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) return <p className="academy-lead-success" data-reveal>Jesteś na liście. Odezwiemy się, zanim ruszy sprzedaż.</p>;
  return (
    <form className="pl-waitlist" data-reveal style={{ transitionDelay: '180ms' }}
      onSubmit={async (event) => {
        event.preventDefault();
        await academyApi.subscribeLead({ email, type: 'WAITLIST', source: `landing-${persona.key}`, consent });
        setSent(true);
      }}>
      <div className="academy-lead-inputs">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Twój adres e-mail" />
        <button type="submit">Zapisz mnie na listę</button>
      </div>
      <label><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Zgadzam się na wiadomości o premierze programu. Zapis mogę wycofać.</label>
    </form>
  );
}

function LeadMagnetForm({ persona }: { persona: Persona }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) return (
    <div className="pl-magnet-done">
      <p>Materiał czeka — wysłaliśmy go też na Twój e-mail.</p>
      <a className="funnel-cta" href={persona.leadMagnet.fileUrl!} target="_blank" rel="noopener noreferrer">
        <Download className="w-4 h-4" />Pobierz teraz
      </a>
    </div>
  );
  return (
    <form className="pl-waitlist"
      onSubmit={async (event) => {
        event.preventDefault();
        await academyApi.subscribeLead({ email, type: 'LEAD_MAGNET', source: `magnet-${persona.key}`, consent });
        setSent(true);
      }}>
      <div className="academy-lead-inputs">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Twój adres e-mail" />
        <button type="submit">Wyślij mi materiał</button>
      </div>
      <label><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Zgadzam się na wiadomości marketingowe. Zapis mogę wycofać.</label>
    </form>
  );
}

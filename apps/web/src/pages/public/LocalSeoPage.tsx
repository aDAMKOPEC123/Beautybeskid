import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/shared/SEO';
import {
  buildLocalSeoSchema,
  localAreas,
  localSeoPages,
  type LocalSeoPageKey,
} from '@/lib/local-seo';
import { SEO } from '@/lib/seo-config';

type LocalSeoPageProps = {
  pageKey: LocalSeoPageKey;
};

const heroImage = '/images/beautybeskid-hero-premium.webp';

const sectionLabelClass = 'mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak';

export const LocalSeoPage = ({ pageKey }: LocalSeoPageProps) => {
  const page = localSeoPages[pageKey];
  const schema = buildLocalSeoSchema(page);
  const relatedPages = page.related.map((key) => localSeoPages[key]);

  return (
    <div className="bg-ivory text-espresso">
      <PageSEO
        title={page.title}
        description={page.description}
        canonical={`/${page.slug}`}
        ogImage={heroImage}
        schema={schema}
      />

      <section className="relative overflow-hidden bg-cream">
        <div className="container grid min-h-[calc(100svh-72px)] max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_0.82fr] lg:py-20">
          <div>
            <p className={sectionLabelClass}>{page.eyebrow}</p>
            <h1 className="max-w-4xl font-heading text-4xl font-bold leading-tight text-espresso sm:text-5xl lg:text-6xl">
              {page.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-espresso/68">
              {page.lead}
            </p>

            {page.statusNote ? (
              <div className="mt-6 rounded-lg border border-oak/30 bg-white/80 p-4 text-sm leading-relaxed text-espresso/70">
                <strong className="text-espresso">Aktualna dostępność:</strong> {page.statusNote}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="premium-shine gap-2 bg-oak text-espresso shadow-[0_18px_45px_rgba(196,150,90,0.3)] hover:bg-oak/90"
                asChild
              >
                <Link to="/rezerwacja">
                  Sprawdź terminy
                  <CalendarCheck className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 bg-white" asChild>
                <Link to="/kontakt">
                  Kontakt z salonem
                  <Phone className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {page.heroPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-lg border border-espresso/10 bg-white/75 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-oak" />
                  <p className="text-sm leading-relaxed text-espresso/68">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="relative">
            <div className="overflow-hidden rounded-lg border border-oak/25 bg-white shadow-[0_24px_80px_rgba(26,56,40,0.16)]">
              <picture>
                <source media="(max-width: 768px)" srcSet="/images/beautybeskid-hero-mobile.webp" type="image/webp" />
                <img
                  src={heroImage}
                  alt="BeskidStudio By Wiktoria Ćwik Limanowa — gabinet kosmetologiczny"
                  className="aspect-[4/5] w-full object-cover"
                  loading="eager"
                />
              </picture>
              <div className="grid gap-4 p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-oak" />
                  <div>
                    <p className="text-sm font-semibold text-espresso">{page.location} i okolice</p>
                    <p className="mt-1 text-sm leading-relaxed text-espresso/60">{page.nearbyContext}</p>
                    <a
                      href={SEO.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex text-sm font-semibold text-oak transition hover:text-espresso"
                    >
                      {SEO.address.street}, {SEO.address.postalCode} {SEO.address.city}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-cream p-4">
                  <Clock className="h-5 w-5 text-oak" />
                  <p className="text-sm text-espresso/70">
                    Rezerwacja online, telefon i czat salonu w jednym miejscu.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-20">
        <div className="container max-w-7xl px-5">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className={sectionLabelClass}>Dlaczego BeskidStudio By Wiktoria Ćwik</p>
            <h2 className="font-heading text-3xl font-bold leading-tight text-espresso md:text-4xl">
              Lokalna usługa, jasny plan i spokojna decyzja
            </h2>
            <p className="mt-4 text-base leading-relaxed text-espresso/62">
              {page.localCopy}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {page.benefits.map((benefit, index) => {
              const icons = [Sparkles, ShieldCheck, MessageCircle];
              const Icon = icons[index] ?? CheckCircle2;
              return (
                <article key={benefit} className="rounded-lg border border-espresso/10 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso text-ivory">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-relaxed text-espresso/68">{benefit}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F8F5EF] py-16 md:py-20">
        <div className="container grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <p className={sectionLabelClass}>Jak wygląda wizyta</p>
            <h2 className="font-heading text-3xl font-bold leading-tight text-espresso md:text-4xl">
              Od pierwszego kontaktu do konkretnego terminu
            </h2>
            <p className="mt-4 text-base leading-relaxed text-espresso/62">
              Od razu wiesz, czy usługa pasuje do Twoich potrzeb, jak wygląda kontakt z salonem i gdzie sprawdzić najbliższe wolne godziny.
            </p>
          </div>

          <div className="grid gap-4">
            {page.visitSteps.map((step, index) => (
              <article key={step} className="grid gap-4 rounded-lg border border-espresso/10 bg-white p-5 shadow-sm sm:grid-cols-[auto_1fr]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-oak/15 font-heading text-xl font-bold text-oak">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-bold text-espresso">
                    {index === 0 ? 'Konsultacja' : index === 1 ? 'Dobór usługi' : 'Opieka po wizycie'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-espresso/65">{step}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-espresso py-16 text-ivory md:py-20">
        <div className="container grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak">Lokalny zasięg</p>
            <h2 className="font-heading text-3xl font-bold leading-tight md:text-4xl">
              BeskidStudio By Wiktoria Ćwik dla Limanowej, Mordarki i okolic
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ivory/70">
              {page.nearbyContext}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {localAreas.slice(0, 10).map((area) => (
                <span key={area} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-ivory/75">
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/12 bg-white/8 p-6">
            <div className="flex items-start gap-3">
              <SearchCheck className="mt-1 h-6 w-6 shrink-0 text-oak" />
              <div>
                <h3 className="font-heading text-2xl font-bold">Najczęściej szukane w okolicy</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/68">
                  Klientki trafiają tu, gdy szukają: {page.shortLabel}, {page.serviceType.toLowerCase()} {page.location}, BeskidStudio By Wiktoria Ćwik {page.location}, salon beauty {page.location} oraz usług w okolicach Limanowej.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {relatedPages.map((related) => (
                <Link
                  key={related.slug}
                  to={`/${related.slug}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-ivory transition hover:bg-white/12"
                >
                  {related.shortLabel}
                  <ArrowRight className="h-4 w-4 text-oak" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-20" aria-labelledby="local-faq-heading">
        <div className="container max-w-3xl px-5">
          <div className="mb-10 text-center">
            <p className={sectionLabelClass}>FAQ</p>
            <h2 id="local-faq-heading" className="font-heading text-3xl font-bold text-espresso md:text-4xl">
              Najczęstsze pytania przed wizytą
            </h2>
          </div>
          <div className="space-y-3">
            {page.faq.map((item) => (
              <details key={item.question} className="group overflow-hidden rounded-lg border border-espresso/10 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-espresso transition-colors hover:bg-cream/60">
                  {item.question}
                  <ArrowRight className="h-4 w-4 shrink-0 text-oak transition-transform group-open:rotate-90" />
                </summary>
                <dd className="border-t border-espresso/10 px-5 pb-5 pt-4 text-sm leading-relaxed text-espresso/65">
                  {item.answer}
                </dd>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-14">
        <div className="container flex max-w-5xl flex-col items-center justify-between gap-5 px-5 text-center md:flex-row md:text-left">
          <div>
            <p className={sectionLabelClass}>Rezerwacja</p>
            <h2 className="font-heading text-3xl font-bold text-espresso">
              Sprawdź aktualne terminy w BeskidStudio By Wiktoria Ćwik
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-espresso/62">
              Telefon: <a href={`tel:${SEO.phone}`} className="font-semibold text-espresso">{SEO.phone}</a> · Limanowa i okolice
            </p>
          </div>
          <Button size="lg" className="gap-2 bg-espresso text-ivory hover:bg-espresso/90" asChild>
            <Link to="/rezerwacja">
              Przejdź do rezerwacji
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

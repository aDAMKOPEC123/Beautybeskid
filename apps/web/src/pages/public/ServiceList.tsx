import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { servicesApi } from '@/api/services.api';
import { PageSEO } from '@/components/shared/SEO';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ServiceListSkeleton } from '@/components/skeletons';
import { localSeoLinks } from '@/lib/local-seo';

const serviceCountLabel = (count: number, accusative = false) => {
  if (count === 1) return accusative ? 'usługę' : 'usługa';

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if ((lastTwoDigits < 12 || lastTwoDigits > 14) && lastDigit >= 2 && lastDigit <= 4) {
    return 'usługi';
  }

  return 'usług';
};

export const ServiceList = () => {
  const { data: services, isLoading } = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!services) return [];
    return Array.from(new Set(services.map((service) => service.category))).sort();
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    if (!activeCategory) return services;
    return services.filter((service) => service.category === activeCategory);
  }, [services, activeCategory]);

  if (isLoading) {
    return (
      <section className="bg-ivory py-16">
        <div className="container"><ServiceListSkeleton count={6} /></div>
      </section>
    );
  }

  return (
    <>
      <PageSEO
        title="Usługi kosmetyczne Limanowa — cennik zabiegów | BeskidStudio"
        description="Cennik BeskidStudio koło Limanowej: laminacja brwi i rzęs, henna, depilacja i oprawa oka. Podologia w odrębnej lokalizacji: tel. 532 128 227."
        canonical="/uslugi"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Strona główna', item: 'https://kosmetologwiktoriacwik.pl' },
            { '@type': 'ListItem', position: 2, name: 'Usługi', item: 'https://kosmetologwiktoriacwik.pl/uslugi' },
          ],
        }}
      />

      <header className="border-b border-espresso/10 bg-[#F8F7F2]">
        <div className="container max-w-7xl px-5 py-14 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oak">Oferta BeskidStudio</p>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <h1 className="font-heading text-4xl font-semibold leading-tight text-espresso md:text-5xl">
                Usługi i ceny
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-espresso/68 md:text-lg">
                Wybierz zabieg dopasowany do Twoich potrzeb. Przy każdej usłudze znajdziesz aktualną cenę, czas trwania i szczegóły wizyty.
              </p>
            </div>
            <p className="text-sm font-semibold text-mink">
              {services?.length ?? 0} {serviceCountLabel(services?.length ?? 0)} w ofercie
            </p>
          </div>
        </div>
      </header>

      <main data-tour="services-list" className="bg-ivory">
        <div className="container max-w-7xl px-5 py-12 md:py-16">
          <div className="flex flex-col gap-5 border-b border-espresso/10 pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-oak">Katalog zabiegów</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold text-espresso">Znajdź właściwy zabieg</h2>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Filtruj usługi według kategorii">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  aria-pressed={!activeCategory}
                  className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
                    !activeCategory
                      ? 'border-espresso bg-espresso text-ivory'
                      : 'border-espresso/15 bg-white text-espresso hover:border-oak'
                  }`}
                >
                  Wszystkie
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    aria-pressed={activeCategory === category}
                    className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
                      activeCategory === category
                        ? 'border-espresso bg-espresso text-ivory'
                        : 'border-espresso/15 bg-white text-espresso hover:border-oak'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mb-5 mt-7 text-sm text-mink" aria-live="polite">
            Pokazujemy {filtered.length} {serviceCountLabel(filtered.length, true)}
            {activeCategory ? ` w kategorii „${activeCategory}”` : ''}.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </main>

      <section className="border-t border-espresso/10 bg-[#F8F7F2] py-14 md:py-16" aria-labelledby="popular-local-services">
        <div className="container max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-oak">Usługi w okolicy</p>
            <h2 id="popular-local-services" className="mt-3 font-heading text-3xl font-semibold leading-tight text-espresso md:text-4xl">
              Najczęściej wybierane zabiegi w Limanowej i Mordarce
            </h2>
            <p className="mt-4 text-base leading-relaxed text-espresso/65">
              Zabiegi beauty zarezerwujesz online. Wizyty podologiczne odbywają się w odrębnej lokalizacji i są umawiane telefonicznie pod numerem 532 128 227.
            </p>
          </div>

          <nav className="mt-9 grid border-t border-espresso/12 sm:grid-cols-2 lg:grid-cols-3" aria-label="Popularne usługi lokalne">
            {localSeoLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex min-h-16 items-center justify-between gap-4 border-b border-espresso/12 px-1 py-4 pr-5 text-sm font-semibold text-espresso transition-colors hover:text-oak sm:[&:nth-child(odd)]:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 shrink-0 text-oak transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
};

// filepath: apps/web/src/pages/public/ServiceList.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { PageSEO } from '@/components/shared/SEO';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ServiceListSkeleton } from '@/components/skeletons';
import { useClipReveal } from '@/hooks/useClipReveal';
import { GeoArc } from '@/components/shared/DecoElements';
import { localSeoLinks } from '@/lib/local-seo';

export const ServiceList = () => {
  const { data: services, isLoading } = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { ref: headerRef, revealed: headerRevealed } = useClipReveal<HTMLDivElement>({ threshold: 0.1 });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!services) return [];
    return Array.from(new Set(services.map((s) => s.category))).sort();
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    if (!activeCategory) return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  if (isLoading) return (
    <section className="py-16" style={{ background: '#F4F9F5' }}>
      <div className="container"><ServiceListSkeleton count={6} /></div>
    </section>
  );

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

      {/* Hero */}
      <section className="py-24 text-center relative" style={{ background: '#E8F3EA' }}>
        <GeoArc size={120} opacity={0.2} className="top-4 right-4" />
        <div className="container">
          <p className="eyebrow mb-5">Nasza Oferta</p>
          <h1
            className="font-display text-5xl md:text-7xl text-espresso mb-6"
            style={{ fontStyle: 'italic', fontWeight: 300 }}
          >
            Nasze Usługi
          </h1>
          <p className="text-mink text-lg max-w-lg mx-auto font-light">
            Profesjonalne zabiegi kosmetyczne wykonywane z pasją, wiedzą i precyzją.
          </p>
        </div>
      </section>

      {/* Sticky layout: header left, cards right */}
      <section data-tour="services-list" style={{ background: '#F4F9F5' }}>
        <div className="container py-16">
          <div className="flex gap-16 items-start overflow-x-hidden">
            {/* Sticky sidebar header + filters */}
            <div
              ref={headerRef}
              className="hidden lg:block w-56 shrink-0"
              style={{
                position: 'sticky',
                top: '72px',
                opacity: headerRevealed ? 1 : 0,
                transform: headerRevealed ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              <p className="eyebrow mb-4">Zabiegi</p>
              <h2
                className="font-display text-4xl text-espresso leading-tight"
                style={{ fontStyle: 'italic', fontWeight: 300 }}
              >
                Co możemy dla Ciebie zrobić
              </h2>
              <div className="w-8 h-px bg-caramel mt-6 mb-4" />
              <p className="text-mink text-sm leading-relaxed mb-6">
                Każdy zabieg wykonujemy z pełnym zaangażowaniem i dbałością o detal.
              </p>
              {categories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="text-left text-sm px-3 py-2 rounded-lg transition-colors"
                    style={{
                      background: !activeCategory ? '#3D7A54' : 'transparent',
                      color: !activeCategory ? '#F4F9F5' : '#5A7A62',
                      fontWeight: !activeCategory ? 600 : 400,
                    }}
                  >
                    Wszystkie
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="text-left text-sm px-3 py-2 rounded-lg transition-colors"
                      style={{
                        background: activeCategory === cat ? '#3D7A54' : 'transparent',
                        color: activeCategory === cat ? '#F4F9F5' : '#5A7A62',
                        fontWeight: activeCategory === cat ? 600 : 400,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cards grid */}
            <div className="flex-1 min-w-0">
              {/* Mobile category pills */}
              {categories.length > 0 && (
                <div className="flex lg:hidden gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="shrink-0 text-sm px-4 py-2 rounded-full border transition-colors"
                    style={{
                      background: !activeCategory ? '#3D7A54' : 'transparent',
                      borderColor: !activeCategory ? '#3D7A54' : '#C4965A',
                      color: !activeCategory ? '#F4F9F5' : '#5A7A62',
                    }}
                  >
                    Wszystkie
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="shrink-0 text-sm px-4 py-2 rounded-full border transition-colors"
                      style={{
                        background: activeCategory === cat ? '#3D7A54' : 'transparent',
                        borderColor: activeCategory === cat ? '#3D7A54' : '#C4965A',
                        color: activeCategory === cat ? '#F4F9F5' : '#5A7A62',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map((service, i) => (
                  <ServiceCard key={service.id} service={service} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14" style={{ background: '#E8F3EA' }} aria-labelledby="popular-local-services">
        <div className="container">
          <div className="mb-7 max-w-2xl">
            <p className="eyebrow mb-3">Najczęściej szukane</p>
            <h2
              id="popular-local-services"
              className="font-display text-4xl text-espresso leading-tight"
              style={{ fontStyle: 'italic', fontWeight: 300 }}
            >
              Usługi BeskidStudio By Wiktoria Ćwik w Limanowej, Mordarce i okolicach
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-mink">
              Jeśli szukasz konkretnej usługi lokalnie, wybierz jej opis poniżej. Zabiegi beauty zarezerwujesz online, natomiast aktywne wizyty podologiczne odbywają się w odrębnej lokalizacji i są umawiane telefonicznie pod numerem 532 128 227.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localSeoLinks.map((link) => (
              <a
                key={link.to}
                href={link.to}
                className="flex items-center justify-between gap-4 rounded-lg border border-espresso/10 bg-white px-5 py-4 text-sm font-semibold text-espresso shadow-sm transition hover:-translate-y-0.5 hover:border-caramel"
              >
                {link.label}
                <span aria-hidden="true" className="text-caramel">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

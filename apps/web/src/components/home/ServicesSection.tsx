import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, LayoutDashboard, Timer } from 'lucide-react';
import type { Service } from '@cosmo/shared';
import { SEO } from '@/lib/seo-config';
import { FadeUp, SectionIntro } from './shared';
import {
  buildReservationTarget,
  formatAdminServicePrice,
  getActiveAdminServices,
  getServiceIcon,
} from './home-data';

/**
 * Karta zabiegu prowadzi prosto do kreatora z wybraną usługą — wcześniej
 * przewijała do kalendarza na tej samej stronie.
 */
export const ServicesSection = ({
  availableServices,
  servicesLoading,
}: {
  availableServices: Service[];
  servicesLoading: boolean;
}) => {
  const activeAdminServices = getActiveAdminServices(availableServices);
  const visibleServices = activeAdminServices.slice(0, 3);
  const hiddenServicesCount = Math.max(activeAdminServices.length - visibleServices.length, 0);

  return (
    <section id="zabiegi" className="home-deferred-section bg-ivory py-10 sm:py-16 md:py-24">
      <div className="container max-w-7xl px-5">
        <FadeUp>
          <SectionIntro
            eyebrow="Aktualne usługi"
            title="Zabiegi dostępne do rezerwacji"
            description="Wybierz zabieg, a od razu zobaczysz jego wolne godziny."
          />
        </FadeUp>

        {servicesLoading ? (
          <div className="rounded-lg border border-espresso/10 bg-white p-6 text-center text-sm text-espresso/72 shadow-sm">
            Ładuję aktualną ofertę...
          </div>
        ) : activeAdminServices.length === 0 ? (
          <FadeUp>
            <article className="rounded-lg border border-dashed border-espresso/15 bg-white p-6 text-center shadow-sm">
              <h3 className="font-heading text-2xl font-bold text-espresso">Zapytaj o aktualną ofertę i termin</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-espresso/72">
                Zadzwoń pod numer{' '}
                <a href={`tel:${SEO.phone}`} className="font-semibold text-espresso">532 128 227</a>. Pomożemy dobrać
                usługę i sprawdzimy najbliższy wolny termin.
              </p>
            </article>
          </FadeUp>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleServices.map((service, index) => {
              const Icon = getServiceIcon(service);
              return (
                <FadeUp key={service.id}>
                  <article className="group flex h-full flex-col rounded-lg border border-espresso/10 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(26,56,40,0.14)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cream text-caramel transition-colors group-hover:bg-espresso group-hover:text-ivory">
                        <Icon className="h-5 w-5" />
                      </div>
                      {index === 0 ? (
                        <span className="rounded-full bg-oak/14 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-oak">
                          Dostępne teraz
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5">
                      <h3 className="font-heading text-2xl font-bold text-espresso">{service.name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-mink">
                        {service.category || 'Usługa z panelu'}
                      </p>
                      <p className="mt-4 text-sm leading-relaxed text-espresso/72">{service.description}</p>
                    </div>

                    <div className="mt-5 grid gap-2 text-sm text-espresso/75 sm:grid-cols-2">
                      <span className="flex items-center gap-2 rounded-lg bg-cream/70 px-3 py-2">
                        <BadgeCheck className="h-4 w-4 text-oak" />
                        {formatAdminServicePrice(service)}
                      </span>
                      <span className="flex items-center gap-2 rounded-lg bg-cream/70 px-3 py-2">
                        <Timer className="h-4 w-4 text-oak" />
                        {service.durationMinutes} min
                      </span>
                    </div>

                    <div className="mt-auto pt-5">
                      <Link
                        to={buildReservationTarget(service.id)}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-espresso px-4 text-sm font-semibold text-ivory transition hover:bg-espresso/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak"
                      >
                        Umów ten zabieg
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                </FadeUp>
              );
            })}

            {hiddenServicesCount > 0 && (
              <FadeUp>
                <Link
                  to="/uslugi"
                  className="group flex h-full min-h-[260px] flex-col justify-between rounded-lg border border-oak/30 bg-espresso p-5 text-ivory shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-espresso/95 hover:shadow-[0_22px_55px_rgba(26,56,40,0.18)]"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-oak/18 text-[#DDB87F] transition-colors group-hover:bg-oak group-hover:text-espresso">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#DDB87F]">
                      +{hiddenServicesCount} w ofercie
                    </p>
                    <h3 className="mt-3 font-heading text-2xl font-bold">Zobacz wszystkie usługi</h3>
                    <p className="mt-4 text-sm leading-relaxed text-ivory/68">
                      Pełna lista zabiegów jest w zakładce usług, z filtrowaniem po kategoriach.
                    </p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#DDB87F]">
                    Przejdź do usług
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </FadeUp>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

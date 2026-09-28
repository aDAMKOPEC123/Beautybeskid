import { Link } from 'react-router-dom';
import { ArrowRight, Footprints, Phone } from 'lucide-react';
import { SEO } from '@/lib/seo-config';
import { FadeUp } from './shared';

/**
 * Podologia zostaje osobno, bo nie da się jej zarezerwować online — inna
 * lokalizacja i zapisy wyłącznie telefoniczne. Kafel w „Zabiegach" prowadziłby
 * do kreatora, w którym tych usług nie ma.
 */
export const PodologySection = () => (
  <section className="home-deferred-section bg-[#F8F5EF] py-8 sm:py-10" aria-labelledby="podology-home-heading">
    <div className="container max-w-4xl px-5">
      <FadeUp>
        <div className="flex flex-col gap-4 rounded-lg border border-oak/25 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-espresso text-[#DDB87F]">
            <Footprints className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="podology-home-heading" className="font-heading text-xl font-bold text-espresso">
              Podologia — tylko telefonicznie
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-espresso/72">
              Pedicure podologiczny i konsultacje stóp odbywają się w odrębnej lokalizacji. Adres podajemy przy
              ustalaniu terminu.
            </p>
            <Link
              to="/podolog-limanowa"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-oak transition hover:text-espresso"
            >
              Zobacz zakres podologii
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <a
            href={`tel:${SEO.phone}`}
            className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-md bg-espresso px-5 text-sm font-semibold text-ivory transition hover:bg-espresso/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak"
          >
            <Phone className="h-4 w-4" />
            532 128 227
          </a>
        </div>
      </FadeUp>
    </div>
  </section>
);

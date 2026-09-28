import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { HeroSlider } from '@/components/public/HeroSlider';

const heroImage = '/images/beautybeskid-hero-premium.webp';

/**
 * Jedno zadanie: doprowadzić do /rezerwacja.
 * Wszystko, co konkurowało z tym przyciskiem (odznaka nazwy, karta najbliższego
 * terminu, siatka czterech statystyk) zostało przeniesione niżej albo usunięte.
 */
export const HeroSection = ({ onConsultationClick }: { onConsultationClick: () => void }) => (
  <section className="premium-home-bg relative overflow-hidden">
    <div className="container relative z-10 max-w-7xl px-5 pb-8 pt-4 md:py-16">
      <div className="grid items-center gap-7 lg:grid-cols-[1fr_1fr] lg:gap-12">
        <div className="order-2 min-w-0 lg:order-1">
          <h1 className="font-heading text-[30px] font-bold leading-[1.1] text-espresso sm:text-5xl lg:text-[56px]">
            Zadbaj o siebie. Termin wybierzesz w minutę.
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-espresso/75 sm:mt-5 md:text-lg">
            Kosmetologia w Mordarce pod Limanową. Rezerwacja online, bez dzwonienia i czekania na odpowiedź.
          </p>

          <div className="mt-6 sm:mt-8">
            <Link
              to="/rezerwacja"
              className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-lg bg-espresso px-6 text-base font-bold text-ivory shadow-[0_14px_32px_rgba(26,56,40,0.24)] transition hover:-translate-y-0.5 hover:bg-espresso/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak sm:w-auto sm:min-w-[280px]"
            >
              Umów wizytę
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-2.5 text-center text-xs text-espresso/60 sm:text-left">
              Wolne godziny zobaczysz bez logowania. Konto zakładasz dopiero przy potwierdzeniu.
            </p>
          </div>

          <button
            type="button"
            onClick={onConsultationClick}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-espresso/20 px-5 text-sm font-semibold text-espresso transition hover:border-oak hover:text-oak focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak sm:w-auto sm:min-w-[280px]"
          >
            Nie wiem, co wybrać — poproszę o konsultację
          </button>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_24px_90px_rgba(26,56,40,0.18)]">
            <HeroSlider
              variant="hero-card"
              fallback={
                <>
                  <picture>
                    <source media="(max-width: 768px)" srcSet="/images/beautybeskid-hero-mobile.webp" type="image/webp" />
                    <img
                      src={heroImage}
                      alt="Elegancki gabinet BeskidStudio By Wiktoria Ćwik w Limanowej"
                      className="h-[220px] w-full object-cover sm:h-[360px] lg:h-[500px]"
                      loading="eager"
                      decoding="sync"
                      fetchPriority="high"
                      width={1400}
                      height={747}
                    />
                  </picture>
                  <div className="absolute inset-x-0 bottom-0 bg-espresso/90 px-5 py-4 text-ivory">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DDB87F]">Indywidualna opieka</p>
                        <p className="mt-1 font-heading text-xl font-semibold">Prowadzimy Cię krok po kroku</p>
                      </div>
                      <ShieldCheck className="h-7 w-7 shrink-0 text-[#DDB87F]" />
                    </div>
                  </div>
                </>
              }
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);

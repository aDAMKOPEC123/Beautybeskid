import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/lib/seo-config';
import type { GoogleReviewsData } from '@/api/google-reviews.api';
import { FadeUp, SectionIntro, StarRow } from './shared';

const reviewCountLabel = (count: number) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const noun = count === 1
    ? 'opinię'
    : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
      ? 'opinie'
      : 'opinii';

  return `${count} ${noun}`;
};

export const TestimonialsSection = ({ googleData }: { googleData?: GoogleReviewsData }) => {
  const [showAll, setShowAll] = useState(false);
  const rating = googleData?.rating?.toFixed(1);
  const allReviews = googleData?.reviews?.filter((review) => review.text?.trim()) ?? [];
  const displayReviews = showAll ? allReviews : allReviews.slice(0, 3);
  const hasMore = allReviews.length > 3;
  const hiddenReviewsCount = Math.max(allReviews.length - 3, 0);

  return (
    <section className="home-deferred-section bg-ivory py-10 sm:py-16 md:py-24">
      <div className="container max-w-7xl px-5">
        <FadeUp>
          <div className="mb-7 grid items-end gap-4 sm:mb-10 sm:gap-6 lg:grid-cols-[1fr_auto]">
            <SectionIntro
              eyebrow="Opinie klientek"
              title="Zaufanie buduje się spokojem, dokładnością i kontaktem po wizycie"
              description="Naturalne opinie klientek podkreślają to, co dla nas ważne: jasny plan, delikatność i profesjonalną opiekę."
              align="left"
            />
            <div className="rounded-lg border border-oak/25 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <p className="font-heading text-4xl font-bold text-espresso">{rating ?? 'Google'}</p>
                <div>
                  <StarRow />
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-mink">
                    {googleData ? `ocena Google (${googleData.user_ratings_total} opinii)` : 'sprawdź aktualne opinie'}
                  </p>
                </div>
              </div>
              <a
                href={googleData?.place_url ?? SEO.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-oak transition-colors hover:text-walnut"
              >
                <Star className="h-3.5 w-3.5" />
                Wystaw opinię w Google
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </FadeUp>

        {displayReviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {displayReviews.map((review, index) => (
              <FadeUp key={review.author_name + index}>
                <article className="flex h-full flex-col rounded-lg border border-espresso/10 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(26,56,40,0.12)]">
                  <StarRow compact />
                  <p className="mt-5 flex-1 font-display text-[22px] italic leading-relaxed text-espresso">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="mt-6 border-t border-espresso/10 pt-4">
                    <div className="flex items-center gap-3">
                      {review.profile_photo_url && (
                        <img
                          src={review.profile_photo_url}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        {review.author_uri ? (
                          <a
                            href={review.author_uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-espresso underline decoration-oak/40 underline-offset-4"
                          >
                            {review.author_name}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-espresso">{review.author_name}</p>
                        )}
                        <p className="text-xs uppercase tracking-[0.16em] text-mink">{review.relative_time_description}</p>
                      </div>
                    </div>
                    <a
                      href={review.google_maps_uri || googleData?.place_url || SEO.googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-oak underline underline-offset-4"
                    >
                      Zobacz źródłową opinię w Google Maps
                    </a>
                  </div>
                </article>
              </FadeUp>
            ))}
          </div>
        ) : (
          <FadeUp>
            <div className="rounded-lg border border-oak/20 bg-white p-6 text-center shadow-sm">
              <p className="font-display text-[22px] italic leading-relaxed text-espresso">
                Aktualne opinie klientek są dostępne bezpośrednio w profilu Google.
              </p>
              <a
                href={googleData?.place_url ?? SEO.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-oak transition-colors hover:text-walnut"
              >
                Zobacz opinie w Google
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </FadeUp>
        )}

        {googleData && allReviews.length > 0 && (
          <FadeUp>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
              {hasMore && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="gap-2 border-oak/30 text-espresso hover:bg-cream"
                >
                  {showAll ? 'Pokaż mniej opinii' : `Pokaż jeszcze ${reviewCountLabel(hiddenReviewsCount)}`}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </Button>
              )}
              <a
                href={googleData.place_url || SEO.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-oak underline decoration-oak/40 underline-offset-4 transition-colors hover:text-walnut"
              >
                Zobacz wszystkie {reviewCountLabel(googleData.user_ratings_total)} w Google Maps
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </FadeUp>
        )}

        {googleData && (
          <FadeUp>
            <div className="mt-5 rounded-lg border border-espresso/10 bg-white px-4 py-3 text-xs leading-relaxed text-mink">
              <p>
                Pokazujemy opinie z oceną 4–5 gwiazdek. Kolejność odpowiada trafności ustalonej przez Google Maps.
              </p>
              <p className="mt-2">
                Źródło: <span translate="no" className="font-sans text-sm font-normal tracking-normal text-[#5E5E5E]">Google Maps</span>
              </p>
            </div>
          </FadeUp>
        )}

        <FadeUp>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-lg border border-oak/20 bg-cream p-5 text-center md:flex-row md:text-left">
            <div>
              <p className="font-heading text-2xl font-bold text-espresso">Chcesz sprawdzić najbliższy termin?</p>
              <p className="mt-1 text-sm text-espresso/75">
                Wolne godziny zobaczysz bez logowania — konto zakładasz dopiero przy potwierdzeniu.
              </p>
            </div>
            <Link
              to="/rezerwacja"
              className="flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-md bg-espresso px-6 text-sm font-semibold text-ivory shadow-[0_14px_32px_rgba(26,56,40,0.18)] transition hover:bg-espresso/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak md:w-auto"
            >
              Umów wizytę
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

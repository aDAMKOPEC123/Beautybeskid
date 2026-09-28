import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { aboutApi } from '@/api/about.api';
import { FadeUp } from './shared';

/** Skrót — pełna biografia i odznaki żyją na /o-nas. */
export const AboutOwnerSection = () => {
  const { data: about } = useQuery({
    queryKey: ['about'],
    queryFn: aboutApi.get,
    staleTime: 300_000,
  });
  const [ownerImgError, setOwnerImgError] = useState(false);
  const ownerPhoto = about?.ownerPhoto;

  return (
    <section className="home-deferred-section bg-cream py-10 sm:py-14" aria-labelledby="about-heading">
      <div className="container max-w-3xl px-5">
        <FadeUp>
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-oak/25 bg-white shadow-lg">
              {ownerPhoto && !ownerImgError ? (
                <img
                  src={ownerPhoto}
                  alt={`${about?.ownerName ?? 'Wiktoria Ćwik'} — dyplomowany kosmetolog, BeskidStudio Limanowa`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={112}
                  height={112}
                  onError={() => setOwnerImgError(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center bg-ivory text-oak"
                  role="img"
                  aria-label="Zdjęcie Wiktorii Ćwik"
                >
                  <BadgeCheck className="h-10 w-10" strokeWidth={1.4} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak">O mnie</p>
              <h2 id="about-heading" className="font-heading text-2xl font-bold text-espresso">
                Wiktoria Ćwik — dyplomowany kosmetolog
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-espresso/72">
                Ponad 5 lat doświadczenia, gabinet w Mordarce pięć minut od Limanowej. Każdą klientkę zaczynam od
                spokojnej rozmowy o potrzebach, a dopiero potem dobieramy plan zabiegowy.
              </p>
              <Link
                to="/o-nas"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-oak transition-colors hover:text-walnut"
              >
                Poznaj mnie bliżej
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

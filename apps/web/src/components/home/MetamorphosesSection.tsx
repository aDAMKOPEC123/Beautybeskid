import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FadeUp, SectionIntro } from './shared';

export const MetamorphosesSection = ({ metamorphoses }: { metamorphoses: any[] }) => {
  if (metamorphoses.length === 0) return null;
  const visible = metamorphoses.slice(0, 4);

  return (
    <section className="home-deferred-section bg-[#F8F5EF] py-10 sm:py-16 md:py-24" aria-labelledby="metamorphoses-heading">
      <div className="container max-w-7xl px-5">
        <FadeUp>
          <SectionIntro
            eyebrow="Efekty zabiegów"
            title="Metamorfozy — przed i po zabiegu"
            description="Zobacz rzeczywiste efekty zabiegów wykonanych w BeskidStudio. Każde zdjęcie to realna klientka i realny rezultat."
          />
        </FadeUp>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((meta: any) => (
            <FadeUp key={meta.id}>
              <div className="group overflow-hidden rounded-lg border border-espresso/10 bg-white shadow-sm">
                <div className="grid grid-cols-2">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={meta.beforeImage}
                      alt={`Przed zabiegiem${meta.title ? ': ' + meta.title : ''}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={200}
                      height={267}
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-espresso/70 px-1.5 py-0.5 text-[10px] font-semibold text-ivory">
                      Przed
                    </span>
                  </div>
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={meta.afterImage}
                      alt={`Po zabiegu${meta.title ? ': ' + meta.title : ''}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={200}
                      height={267}
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-espresso/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Po
                    </span>
                  </div>
                </div>
                {meta.title && (
                  <div className="p-3">
                    <p className="text-sm font-semibold text-espresso">{meta.title}</p>
                    {meta.description && (
                      <p className="mt-1 text-xs text-espresso/72 line-clamp-2">{meta.description}</p>
                    )}
                  </div>
                )}
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp>
          <div className="mt-8 text-center">
            <Link
              to="/metamorfozy"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-oak/35 px-5 text-sm font-semibold text-espresso transition-colors hover:border-oak hover:bg-cream"
            >
              Zobacz wszystkie metamorfozy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

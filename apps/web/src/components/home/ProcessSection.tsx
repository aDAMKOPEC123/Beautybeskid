import { FadeUp, SectionIntro } from './shared';
import { processSteps } from './home-data';

export const ProcessSection = () => (
  <section className="home-deferred-section bg-cream py-10 sm:py-16 md:py-24">
    <div className="container max-w-7xl px-5">
      <FadeUp>
        <SectionIntro
          eyebrow="Twoja wizyta krok po kroku"
          title="Nie musisz wiedzieć wszystkiego przed wejściem do gabinetu"
          description="Od pierwszej rozmowy prowadzimy Cię przez decyzję, zabieg i pielęgnację po wizycie."
        />
      </FadeUp>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {processSteps.map(({ num, title, desc, Icon }) => (
          <FadeUp key={title}>
            <article className="relative h-full overflow-hidden rounded-lg border border-espresso/10 bg-white p-5 shadow-sm">
              <p className="absolute right-4 top-3 font-heading text-5xl font-bold text-cream">{num}</p>
              <div className="relative z-10">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso text-ivory">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-espresso">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-espresso/72">{desc}</p>
              </div>
            </article>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

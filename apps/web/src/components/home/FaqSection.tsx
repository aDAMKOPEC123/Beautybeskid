import { ChevronDown } from 'lucide-react';
import { FadeUp } from './shared';
import { faqItems } from './home-data';

export const FaqSection = () => (
  <section className="home-deferred-section bg-ivory py-10 sm:py-16 md:py-24" aria-labelledby="faq-heading">
    <div className="container max-w-3xl px-5">
      <FadeUp>
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak">FAQ</p>
          <h2 id="faq-heading" className="font-heading text-2xl font-bold text-espresso sm:text-3xl md:text-4xl">
            Najczęściej zadawane pytania
          </h2>
        </div>
      </FadeUp>
      <div className="space-y-3">
        {faqItems.map((item) => (
          <FadeUp key={item.name}>
            <details className="group overflow-hidden rounded-lg border border-espresso/10 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-espresso transition-colors hover:bg-cream/60">
                {item.name}
                <ChevronDown className="h-5 w-5 shrink-0 text-oak transition-transform group-open:rotate-180" />
              </summary>
              <dd className="border-t border-espresso/10 px-5 pb-5 pt-4 text-sm leading-relaxed text-espresso/75">
                {item.acceptedAnswer.text}
              </dd>
            </details>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

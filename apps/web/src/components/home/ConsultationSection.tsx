import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeUp } from './shared';
import { consultationArguments } from './home-data';

export const ConsultationSection = ({ onConsultationClick }: { onConsultationClick: () => void }) => (
  <section className="home-deferred-section bg-[#F8F5EF] py-10 sm:py-16 md:py-20">
    <div className="container max-w-6xl px-5">
      <FadeUp>
        <div className="grid items-center gap-6 rounded-lg border border-oak/25 bg-espresso p-5 text-ivory shadow-[0_24px_80px_rgba(26,56,40,0.22)] sm:gap-8 sm:p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#DDB87F]">Bezpłatna konsultacja</p>
            <h2 className="font-heading text-3xl font-bold leading-tight md:text-4xl">
              Nie wiesz, jaki zabieg wybrać?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ivory/72">
              Przyjdź na spokojną konsultację. Dobierzemy aktywną usługę do Twoich potrzeb, wyjaśnimy możliwe efekty
              i zaproponujemy plan bez presji.
            </p>
            <div className="mt-6">
              <Button
                type="button"
                size="lg"
                onClick={onConsultationClick}
                className="w-full gap-2 bg-oak text-espresso hover:bg-oak/90 sm:w-auto"
              >
                Umów bezpłatną konsultację
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {consultationArguments.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/8 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#DDB87F]" />
                <p className="text-sm leading-relaxed text-ivory/78">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeUp>
    </div>
  </section>
);

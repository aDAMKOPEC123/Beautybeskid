// filepath: apps/web/src/pages/public/LoyaltyInfo.tsx
import { Link } from 'react-router-dom';
import { Crown, Gift, Sparkles } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';

const tiers = [
  {
    icon: Crown,
    iconColor: '#92400E',
    label: 'Poziom Brązowy',
    description: 'Podstawowy poziom dla nowych klientów. Dostęp do standardowych nagród z katalogu od pierwszej wizyty.',
    featured: false,
  },
  {
    icon: Crown,
    iconColor: '#C4965A',
    label: 'Poziom Srebrny',
    description: 'Odblokuj po 30 wizytach. Lepsze nagrody i 5% stałej zniżki na kosmetyki domowe.',
    featured: true,
    badge: 'Najczęściej wybierany',
  },
  {
    icon: Sparkles,
    iconColor: '#C4965A',
    label: 'Poziom Złoty',
    description: 'Ekskluzywny dostęp po 100 wizytach. Pierwszeństwo w zapisach i 10% stałej zniżki na wszystkie wybrane zabiegi VIP.',
    featured: false,
  },
];

export const LoyaltyInfo = () => {
  return (
    <>
      <PageSEO
        title="Program Lojalnościowy — BeskidStudio By Wiktoria Ćwik Limanowa"
        description="Zbieraj punkty za każdą wizytę w naszym salonie i wymieniaj je na nagrody. Program lojalnościowy BeskidStudio By Wiktoria Ćwik w Limanowej."
        canonical="/program-lojalnosciowy"
      />

      {/* Hero */}
      <section className="py-20 text-center" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container max-w-3xl mx-auto">
          <div
            className="inline-flex h-20 w-20 items-center justify-center rounded-full mb-8"
            style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
          >
            <Gift size={36} />
          </div>
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
          >
            Dla stałych klientów
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold tracking-tight mb-6" style={{ color: '#1A3828' }}>
            Program Lojalnościowy
          </h1>
          <p className="text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(20,40,28,0.55)' }}>
            Doceniamy naszych stałych klientów. Im więcej wizyt, tym wyższy poziom i lepsze przywileje — plus punkty do wymiany na darmowe zabiegi i zniżki.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map(({ icon: Icon, iconColor, label, description, featured, badge }) => (
              <div
                key={label}
                className={`relative p-10 text-center transition-all duration-300 hover:-translate-y-1${featured ? ' md:-mt-3' : ''}`}
                style={{
                  borderRadius: '24px',
                  backgroundColor: '#fff',
                  border: featured ? '1.5px solid #C4965A' : '1px solid rgba(0,0,0,0.07)',
                  boxShadow: featured ? '0 8px 32px rgba(196,150,90,0.15)' : '0 2px 12px rgba(0,0,0,0.04)',
                  
                }}
              >
                {badge && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 text-xs font-bold rounded-full uppercase tracking-widest whitespace-nowrap"
                    style={{ backgroundColor: '#C4965A', color: '#fff' }}
                  >
                    {badge}
                  </div>
                )}
                <Icon className="mx-auto mb-6" size={featured ? 52 : 44} style={{ color: iconColor }} />
                <h3
                  className="font-bold font-heading mb-3"
                  style={{ fontSize: featured ? '1.75rem' : '1.5rem', color: featured ? '#C4965A' : '#1A3828' }}
                >
                  {label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.55)' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container">
          <div
            className="relative overflow-hidden text-center p-14 max-w-3xl mx-auto"
            style={{
              borderRadius: '32px',
              backgroundColor: '#1A3828',
            }}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Sparkles size={200} style={{ color: '#fff' }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4" style={{ color: '#F4F9F5' }}>
                Dołącz i odblokowuj kolejne poziomy!
              </h2>
              <p className="text-xl mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Załóż konto i umów swoją pierwszą wizytę, aby otrzymać darmowy bonus powitalny doliczany na Twój portfel.
              </p>
              <Link
                to="/auth/register"
                className="inline-block text-base font-semibold px-12 py-4 rounded-full transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#C4965A', color: '#fff' }}
              >
                Dołącz teraz
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

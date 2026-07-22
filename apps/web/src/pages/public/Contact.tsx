import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MessageCircle, MapPin, Clock, Star, ArrowRight, Car, HelpCircle } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { SEO } from '@/lib/seo-config';
import { trackEvent } from '@/lib/analytics';
import { localAreas } from '@/lib/local-seo';
import { useAuth } from '@/hooks/useAuth';

const TikTokIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-6 w-6"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
);

const localBusinessSchema = {
  '@type': 'BeautySalon',
  '@id': `${SEO.domain}/#beautysalon`,
  name: SEO.siteName,
  telephone: SEO.phone,
  email: SEO.email,
  address: {
    '@type': 'PostalAddress',
    ...(SEO.address.street ? { streetAddress: SEO.address.street } : {}),
    addressLocality: SEO.address.city,
    postalCode: SEO.address.postalCode,
    addressRegion: SEO.address.region,
    addressCountry: 'PL',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: SEO.lat,
    longitude: SEO.lon,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday'],
      opens: '09:00',
      closes: '14:00',
    },
  ],
  areaServed: localAreas.map((name) => ({ '@type': 'City', name })),
  knowsAbout: [
    'kosmetologia',
    'laminacja brwi',
    'laminacja rzęs',
    'pielęgnacja skóry',
    'stylizacja oprawy oka',
    'podologia',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Usługi BeskidStudio By Wiktoria Ćwik Limanowa',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Konsultacja kosmetologiczna Limanowa' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Kosmetyczka Limanowa' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Laminacja brwi Limanowa' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Laminacja rzęs Limanowa' } },
    ],
  },
  image: `${SEO.domain}/images/beautybeskid-hero-premium.webp`,
  priceRange: '30–180 PLN',
  paymentAccepted: 'Cash, Credit Card, BLIK',
  currenciesAccepted: 'PLN',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5.0',
    reviewCount: '18',
    bestRating: '5',
  },
  potentialAction: {
    '@type': 'ReserveAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SEO.domain}/rezerwacja`,
      actionPlatform: [
        'https://schema.org/DesktopWebPlatform',
        'https://schema.org/MobileWebPlatform',
      ],
    },
    result: {
      '@type': 'Reservation',
      name: 'Rezerwacja wizyty',
    },
  },
  sameAs: [SEO.fbProfile, SEO.igProfile, SEO.ttProfile],
  url: SEO.domain,
};

const cardStyle = {
  borderRadius: '20px',
  border: '1px solid rgba(0,0,0,0.07)',
  backgroundColor: '#fff',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(SEO.mapQuery)}&z=16&output=embed`;

export const Contact = () => {
  const { isAuthenticated } = useAuth();

  const phoneDisplay = '532 128 227';

  return (
    <>
      <PageSEO
        title="Kontakt – BeskidStudio Mordarka 505 | tel. 532 128 227"
        description="📍 Mordarka 505 koło Limanowej ☎ 532 128 227. Salon kosmetologiczny Wiktoria Ćwik. Pon–Pt 9:00–18:00, Sob 9:00–14:00. Dojazd 5 min z centrum Limanowej. Umów wizytę online."
        canonical="/kontakt"
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            localBusinessSchema,
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Strona główna', item: 'https://kosmetologwiktoriacwik.pl' },
                { '@type': 'ListItem', position: 2, name: 'Kontakt', item: 'https://kosmetologwiktoriacwik.pl/kontakt' },
              ],
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
          >
            Jesteśmy tu dla Ciebie
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A3828' }}>
            Kontakt
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(20,40,28,0.55)' }}>
            Salon kosmetologiczny w Mordarce 505 koło Limanowej — obsługujemy klientki z Limanowej,
            Laskowej, Dobrej, Tymbarku i całej okolicy.
          </p>
        </div>
      </section>

      {/* Main grid */}
      <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left column */}
            <div className="flex flex-col gap-6">
              {/* Phone card */}
              <div className="p-7" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5" style={{ color: '#C4965A' }} />
                  <h2 className="font-semibold text-base" style={{ color: '#1A3828' }}>Telefon i e-mail</h2>
                </div>
                <p className="text-3xl font-bold tracking-wide mb-5" style={{ color: '#1A3828' }}>{phoneDisplay}</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`tel:${SEO.phone}`}
                    className="text-sm font-semibold px-6 py-2.5 rounded-full text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#1A3828' }}
                    onClick={() => trackEvent('phone_click', { location: 'contact_page' })}
                  >
                    Zadzwoń
                  </a>
                  <a
                    href={`sms:${SEO.phone}`}
                    className="text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
                    style={{ border: '1px solid rgba(0,0,0,0.15)', color: '#1A3828' }}
                  >
                    Wyślij SMS
                  </a>
                  <a
                    href={`mailto:${SEO.email}`}
                    className="inline-flex min-h-11 items-center gap-2 break-all rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
                    style={{ border: '1px solid rgba(0,0,0,0.15)', color: '#1A3828' }}
                  >
                    <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {SEO.email}
                  </a>
                </div>
              </div>

              {/* Chat card */}
              <div className="p-7" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5" style={{ color: '#C4965A' }} />
                  <h2 className="font-semibold text-base" style={{ color: '#1A3828' }}>Czat z salonem</h2>
                </div>
                <p className="text-sm mb-5" style={{ color: 'rgba(20,40,28,0.55)' }}>
                  Napisz do nas bezpośrednio przez wbudowany czat — odpowiadamy najszybciej jak możemy.
                </p>
                <Link
                  to={isAuthenticated ? '/user/chat' : '/auth/login'}
                  className="inline-block text-sm font-semibold px-6 py-2.5 rounded-full text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1A3828' }}
                >
                  Przejdź do czatu
                </Link>
              </div>

              {/* Social media */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { href: SEO.fbProfile, label: 'Facebook', Icon: Facebook, color: '#1877F2' },
                  { href: SEO.igProfile, label: 'Instagram', Icon: Instagram, color: '#E1306C' },
                  { href: SEO.ttProfile, label: 'TikTok', Icon: null, color: '#1A3828' },
                ].map(({ href, label, Icon, color }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center gap-3 p-5 transition-all"
                    style={cardStyle}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#C4965A')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)')}
                  >
                    <span style={{ color }} className="transition-transform group-hover:scale-110 block">
                      {Icon ? <Icon className="h-7 w-7" /> : <TikTokIcon />}
                    </span>
                    <span className="text-sm font-medium" style={{ color: '#1A3828' }}>{label}</span>
                  </a>
                ))}
              </div>

              {/* Review CTA */}
              <div className="p-7" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5" style={{ color: '#C4965A' }} />
                  <h2 className="font-semibold text-base" style={{ color: '#1A3828' }}>Byłaś u nas? Podziel się opinią</h2>
                </div>
                <p className="text-sm mb-5" style={{ color: 'rgba(20,40,28,0.55)' }}>
                  Twoja opinia w Google pomaga innym klientkom podjąć decyzję i motywuje nas do dalszej pracy.
                  Każda recenzja jest dla nas ważna.
                </p>
                <a
                  href={SEO.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#C4965A' }}
                >
                  Wystaw opinię w Google
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Address & hours */}
              <div className="p-7" style={cardStyle}>
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="h-5 w-5" style={{ color: '#C4965A' }} />
                  <h2 className="font-semibold text-base" style={{ color: '#1A3828' }}>Adres i godziny</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <a
                      href={SEO.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:opacity-80"
                    >
                      {SEO.address.street ? (
                        <p className="text-sm font-medium mb-1" style={{ color: '#1A3828' }}>{SEO.address.street}</p>
                      ) : null}
                      <p className="text-sm" style={{ color: 'rgba(20,40,28,0.55)' }}>
                        {SEO.address.postalCode} {SEO.address.city}
                      </p>
                    </a>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4" style={{ color: '#C4965A' }} />
                      <span className="text-sm font-medium" style={{ color: '#1A3828' }}>Godziny pracy</span>
                    </div>
                    <dl className="space-y-1.5">
                      {SEO.openingHours.map(({ days, hours }) => (
                        <div key={days} className="flex justify-between gap-2 text-sm">
                          <dt style={{ color: 'rgba(20,40,28,0.55)' }}>{days}</dt>
                          <dd
                            style={{
                              fontWeight: 500,
                              color: hours === 'Nieczynne' ? 'rgb(239,68,68)' : '#1A3828',
                            }}
                          >
                            {hours}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — map */}
            <div className="flex flex-col gap-6">
              {/* Google Maps */}
              <div className="overflow-hidden" style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <iframe
                  title="Lokalizacja salonu BeskidStudio By Wiktoria Ćwik — Mordarka 505"
                  src={googleMapsEmbedUrl}
                  width="100%"
                  height="400"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Dojazd */}
              <div className="p-7" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Car className="h-5 w-5" style={{ color: '#C4965A' }} />
                  <h2 className="font-semibold text-base" style={{ color: '#1A3828' }}>Dojazd</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.6)' }}>
                    <strong style={{ color: '#1A3828' }}>Z centrum Limanowej:</strong> kierunek Mszana Dolna,
                    po ok. 3 km skręt w prawo do Mordarki. Dojazd zajmuje około 5 minut samochodem.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.6)' }}>
                    <strong style={{ color: '#1A3828' }}>Parking:</strong> bezpłatny parking przy gabinecie.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.6)' }}>
                    <strong style={{ color: '#1A3828' }}>Dojazd własny</strong> — salon znajduje się w Mordarce 505,
                    w spokojnej okolicy koło Limanowej.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <div className="text-center mb-8">
              <div
                className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
              >
                FAQ
              </div>
              <h2 className="text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
                Najczęściej zadawane pytania
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[
                {
                  q: 'Czy muszę rezerwować wizytę z wyprzedzeniem?',
                  a: 'Tak, zalecamy rezerwację online lub telefoniczną. Dzięki temu mamy pewność, że poświęcimy Ci odpowiednią ilość czasu na zabieg i konsultację.',
                },
                {
                  q: 'Czy jest parking przy salonie?',
                  a: 'Tak, przy gabinecie znajduje się bezpłatny parking. Nie musisz się martwić o miejsce do zaparkowania.',
                },
                {
                  q: 'Jak dojechać z Limanowej?',
                  a: 'Z centrum Limanowej kierunek Mszana Dolna, po ok. 3 km skręt w prawo do Mordarki. Dojazd zajmuje około 5 minut samochodem.',
                },
                {
                  q: 'Czy mogę zmienić termin wizyty?',
                  a: 'Tak, termin można zmienić lub odwołać przez system rezerwacji online lub telefonicznie, najlepiej z min. 24-godzinnym wyprzedzeniem.',
                },
                {
                  q: 'Jakie formy płatności akceptujecie?',
                  a: 'Akceptujemy gotówkę, karty płatnicze oraz BLIK.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-6" style={cardStyle}>
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#C4965A' }} />
                    <div>
                      <h3 className="font-semibold text-sm mb-2" style={{ color: '#1A3828' }}>{q}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.6)' }}>{a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Local SEO text */}
          <p className="mt-10 text-center text-sm" style={{ color: 'rgba(20,40,28,0.45)' }}>
            Obsługujemy klientów z <strong style={{ color: '#1A3828' }}>Limanowej</strong>,{' '}
            <strong style={{ color: '#1A3828' }}>Laskowej</strong>,{' '}
            <strong style={{ color: '#1A3828' }}>Mordarki</strong>,{' '}
            <strong style={{ color: '#1A3828' }}>Dobrej</strong>,{' '}
            <strong style={{ color: '#1A3828' }}>Tymbarku</strong> i okolic.
          </p>
        </div>
      </section>
    </>
  );
};

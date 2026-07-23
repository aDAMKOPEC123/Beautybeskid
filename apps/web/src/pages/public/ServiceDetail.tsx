import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { servicesApi } from '@/api/services.api';
import { reviewsApi } from '@/api/reviews.api';
import { formatPrice } from '@/lib/utils';
import { Clock, ArrowLeft } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { RichTextViewer } from '@/components/shared/RichTextViewer';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { ClipRevealImage } from '@/components/ui/ClipRevealImage';

type ServiceSeoContent = {
  title: string;
  heading: string;
  description: string;
  sectionTitle: string;
  paragraphs: string[];
  highlights: string[];
  faq: Array<{ question: string; answer: string }>;
  related: Array<{ to: string; label: string }>;
};

const SERVICE_SEO_CONTENT: Record<string, ServiceSeoContent> = {
  'henna-brwi-lifting-rzes-set': {
    title: 'Henna brwi i lifting rzęs SET Limanowa | BeskidStudio',
    heading: 'Henna brwi & Lifting rzęs SET',
    description: 'Henna brwi oraz lifting z koloryzacją rzęs podczas jednej wizyty w BeskidStudio koło Limanowej. Poznaj zakres zabiegu, cenę i wolne terminy.',
    sectionTitle: 'Henna brwi i lifting rzęs — dwa efekty podczas jednej wizyty',
    paragraphs: [
      'Ten zestaw łączy dopasowanie kształtu i koloru brwi z uniesieniem naturalnych rzęs. Henna podkreśla brwi kolorem, ale nie zmienia kierunku włosków tak jak laminacja. Dzięki temu jest dobrym wyborem dla osób, które chcą zachować naturalne ułożenie brwi.',
      'Lifting rzęs wykonywany w tym samym terminie unosi rzęsy od nasady i obejmuje ich koloryzację. Jest to inny zakres niż LamiSet, w którym zamiast samej henny brwi wykonywana jest pełna laminacja brwi.',
    ],
    highlights: [
      'dopasowanie kształtu i koloru brwi',
      'lifting oraz koloryzacja naturalnych rzęs',
      'jedna 60-minutowa wizyta zamiast dwóch osobnych terminów',
    ],
    faq: [
      { question: 'Czy ten zestaw obejmuje laminację brwi?', answer: 'Nie. Brwi są podkreślane henną, natomiast laminacja dotyczy innej usługi. Jeżeli zależy Ci również na zmianie kierunku włosków brwi, wybierz LamiSet.' },
      { question: 'Czy lifting rzęs obejmuje koloryzację?', answer: 'Tak. Rzęsy są unoszone i koloryzowane, aby wyraźniej podkreślić ich długość oraz naturalny skręt.' },
      { question: 'Ile trwa Henna brwi & Lifting rzęs SET?', answer: 'Na usługę zarezerwowane jest 60 minut. Dokładny przebieg dobieramy do brwi, długości rzęs i oczekiwanego efektu.' },
    ],
    related: [
      { to: '/uslugi/henna-pudrowa', label: 'Sama henna pudrowa brwi' },
      { to: '/uslugi/lifting-rzes-z-koloryzacja', label: 'Sam lifting rzęs z koloryzacją' },
      { to: '/uslugi/lamiset-laminacja-brwi-lifting-rzes', label: 'LamiSet z laminacją brwi' },
    ],
  },
  'lamiset-laminacja-brwi-lifting-rzes': {
    title: 'LamiSet – laminacja brwi i lifting rzęs | BeskidStudio',
    heading: 'LamiSet Laminacja Brwi & Lifting Rzęs',
    description: 'LamiSet w BeskidStudio koło Limanowej: laminacja i koloryzacja brwi oraz lifting i koloryzacja rzęs podczas jednej kompleksowej wizyty.',
    sectionTitle: 'Czym LamiSet różni się od pojedynczej laminacji brwi?',
    paragraphs: [
      'LamiSet jest kompletnym pakietem oprawy oka, a nie drugim adresem dla zwykłej laminacji brwi. Podczas jednej wizyty wykonujemy dwie odrębne stylizacje: laminację brwi z koloryzacją oraz lifting naturalnych rzęs z koloryzacją.',
      'Pakiet jest przeznaczony dla osób, które chcą jednocześnie uporządkować kierunek włosków brwi i unieść rzęsy od nasady. Jeśli potrzebujesz tylko jednego z tych efektów, możesz wybrać osobną laminację brwi albo osobny lifting rzęs.',
    ],
    highlights: [
      'laminacja, ułożenie i koloryzacja brwi',
      'lifting, podkręcenie i koloryzacja rzęs',
      '90 minut przeznaczone na kompletną stylizację oprawy oka',
    ],
    faq: [
      { question: 'Czy LamiSet to to samo co laminacja brwi?', answer: 'Nie. Laminacja brwi obejmuje wyłącznie stylizację brwi. LamiSet łączy pełną laminację brwi z liftingiem i koloryzacją naturalnych rzęs.' },
      { question: 'Czy w LamiSet wykonywana jest koloryzacja?', answer: 'Tak. Pakiet obejmuje koloryzację brwi oraz rzęs, a odcienie są dobierane do urody i oczekiwanego efektu.' },
      { question: 'Ile trwa zabieg LamiSet?', answer: 'Na kompleksową stylizację brwi i rzęs zarezerwowane jest 90 minut.' },
    ],
    related: [
      { to: '/uslugi/laminacja-brwi-z-koloryzacja', label: 'Sama laminacja brwi z koloryzacją' },
      { to: '/uslugi/lifting-rzes-z-koloryzacja', label: 'Sam lifting rzęs z koloryzacją' },
      { to: '/uslugi/henna-brwi-lifting-rzes-set', label: 'Henna brwi i lifting rzęs SET' },
    ],
  },
};

const SERVICE_META_OVERRIDES: Record<string, { title: string; description: string }> = {
  'depilacja-twarzy-woskiem': {
    title: 'Depilacja twarzy woskiem Limanowa | BeskidStudio',
    description: 'Depilacja twarzy woskiem w BeskidStudio koło Limanowej. Gładka skóra twarzy, możliwość depilacji nosa i uszu, cena oraz terminy online.',
  },
  'depilacja-wasika': {
    title: 'Depilacja wąsika Limanowa | BeskidStudio',
    description: 'Precyzyjna depilacja wąsika woskiem w BeskidStudio koło Limanowej. Sprawdź cenę, czas zabiegu i zarezerwuj dogodny termin online.',
  },
  'laminacja-brwi': {
    title: 'Laminacja brwi – cena i terminy | BeskidStudio',
    description: 'Laminacja brwi w BeskidStudio koło Limanowej: ułożenie i optyczne zagęszczenie włosków bez koloryzacji. Sprawdź cenę i wolne terminy.',
  },
  'laminacja-brwi-z-koloryzacja': {
    title: 'Laminacja brwi z koloryzacją | BeskidStudio',
    description: 'Laminacja brwi z koloryzacją w BeskidStudio koło Limanowej. Ułożenie włosków, dopasowanie koloru, cena i rezerwacja terminu online.',
  },
  'lifting-rzes-z-koloryzacja': {
    title: 'Lifting rzęs z koloryzacją | BeskidStudio',
    description: 'Lifting i koloryzacja naturalnych rzęs w BeskidStudio koło Limanowej. Poznaj efekt, czas zabiegu, cenę i dostępne terminy.',
  },
  'regulacja-brwi-wosk-peseta': {
    title: 'Regulacja brwi woskiem lub pęsetą | BeskidStudio',
    description: 'Profesjonalna regulacja brwi woskiem lub pęsetą w BeskidStudio koło Limanowej. Sprawdź cenę, czas zabiegu i zarezerwuj termin.',
  },
};

export const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const loadingSeoContent = slug ? SERVICE_SEO_CONTENT[slug] : undefined;
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
    retry: (failureCount, error: any) => error?.response?.status !== 404 && failureCount < 2,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews-aggregate', service?.id],
    queryFn: () => reviewsApi.getServiceReviews(service!.id, 1, 1),
    enabled: !!service?.id,
  });

  useEffect(() => {
    if (!service) return;
    trackEvent('service_viewed', {
      service_name: service.name,
      service_category: service.category?.name,
    });
  }, [service?.id]);

  if (isLoading) return loadingSeoContent ? (
    <main className="border-y border-espresso/10 bg-[#F8F7F2] py-14 md:py-20" aria-busy="true">
      <div className="container mx-auto max-w-3xl px-5">
        <p className="mb-4 text-xs font-semibold uppercase text-espresso/55">Oprawa oka · Limanowa</p>
        <h1 className="font-heading text-4xl font-semibold text-espresso md:text-5xl">
          {loadingSeoContent.heading}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-espresso/70">
          {loadingSeoContent.description}
        </p>
        <h2 className="mt-10 font-heading text-2xl font-semibold text-espresso">
          {loadingSeoContent.sectionTitle}
        </h2>
        <p className="mt-4 leading-relaxed text-espresso/70">
          {loadingSeoContent.paragraphs[0]}
        </p>
        <nav className="mt-8 flex flex-wrap gap-3" aria-label="Powiązane usługi">
          {loadingSeoContent.related.map(({ to, label }) => (
            <Link key={to} to={to} className="rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(20,40,28,0.22)', color: '#1A3828' }}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  ) : (
    <div className="container py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!service) return (
    <>
      <PageSEO
        title="Nie znaleziono usługi | BeskidStudio"
        description="Ta usługa nie istnieje albo nie jest już dostępna."
        canonical="/404"
        noIndex
      />
      <main className="container flex min-h-[50svh] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
        <h1 className="font-heading text-3xl font-bold text-espresso">Usługa nie została znaleziona</h1>
        <p className="mt-4 text-espresso/65">Sprawdź aktualną ofertę zabiegów albo wróć na stronę główną.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/uslugi" className="rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-ivory">Zobacz aktualne usługi</Link>
          <Link to="/" className="rounded-full border border-espresso/20 px-6 py-3 text-sm font-semibold text-espresso">Strona główna</Link>
        </div>
      </main>
    </>
  );

  const seoContent = SERVICE_SEO_CONTENT[service.slug];
  const metaOverride = SERVICE_META_OVERRIDES[service.slug];
  const pageUrl = `https://kosmetologwiktoriacwik.pl/uslugi/${service.slug}`;
  const seoTitle = seoContent?.title ?? metaOverride?.title ?? (service.slug === 'laminacja-brwi'
    ? 'Laminacja brwi – cena i terminy | BeskidStudio'
    : `${service.name} — BeskidStudio By Wiktoria Ćwik Limanowa`);
  const seoDescription = seoContent?.description ?? metaOverride?.description ?? (service.description
    ? `${service.description} Zabieg dostępny w salonie BeskidStudio By Wiktoria Ćwik w Limanowej (Mordarka 505).`
    : `${service.name} — zabieg w salonie BeskidStudio By Wiktoria Ćwik w Limanowej (Mordarka 505). Sprawdź szczegóły i zarezerwuj termin online.`);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: seoTitle,
        description: seoDescription,
        isPartOf: { '@id': 'https://kosmetologwiktoriacwik.pl/#website' },
        mainEntity: { '@id': `${pageUrl}#service` },
      },
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: service.name,
        description: seoDescription,
        url: pageUrl,
        mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
        serviceType: service.category,
        provider: {
          '@type': 'BeautySalon',
          '@id': 'https://kosmetologwiktoriacwik.pl/#beautysalon',
          name: 'BeskidStudio By Wiktoria Ćwik',
          url: 'https://kosmetologwiktoriacwik.pl',
          telephone: '+48532128227',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Mordarka 505',
            addressLocality: 'Limanowa',
            postalCode: '34-600',
            addressRegion: 'Małopolskie',
            addressCountry: 'PL',
          },
        },
        areaServed: 'Limanowa i okolice powiatu limanowskiego',
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: 'https://kosmetologwiktoriacwik.pl/rezerwacja',
          servicePhone: '+48532128227',
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PLN',
          price: String(service.promoPrice ?? service.price),
          availability: 'https://schema.org/InStock',
        },
        ...(reviewsData && reviewsData.aggregate.count > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviewsData.aggregate.avgRating.toFixed(1),
            reviewCount: reviewsData.aggregate.count,
            bestRating: '5',
            worstRating: '1',
          },
        } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Strona główna', item: 'https://kosmetologwiktoriacwik.pl' },
          { '@type': 'ListItem', position: 2, name: 'Usługi', item: 'https://kosmetologwiktoriacwik.pl/uslugi' },
          { '@type': 'ListItem', position: 3, name: service.name, item: `https://kosmetologwiktoriacwik.pl/uslugi/${service.slug}` },
        ],
      },
      ...(seoContent ? [{
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: seoContent.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }] : []),
    ],
  };

  return (
    <>
      <PageSEO
        title={seoTitle}
        description={seoDescription}
        canonical={`/uslugi/${service.slug}`}
        ogImage={service.imagePath}
        schema={schema}
        noIndex={service.slug === 'inne'}
      />

      <div className="container max-w-7xl px-5 py-6">
        <Link
          to="/uslugi"
          className="inline-flex items-center gap-2 text-sm font-medium text-espresso/60 transition-colors hover:text-espresso"
        >
          <ArrowLeft size={15} /> Wróć do usług
        </Link>
      </div>

      <section className="border-y border-espresso/10 bg-[#F8F7F2] py-10 md:py-14">
        <div
          className={`container max-w-7xl px-5 ${
            service.imagePath
              ? 'grid items-center gap-9 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-14'
              : 'max-w-3xl'
          }`}
        >
          {service.imagePath && (
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-espresso/10 bg-white shadow-[0_12px_32px_rgba(26,56,40,0.08)]">
              <ClipRevealImage
                src={service.imagePath}
                alt={service.name}
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase text-espresso/55">
              {service.category} · Limanowa
            </p>
            <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight text-espresso md:text-5xl">
              {service.name}
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-espresso/10 py-5">
              {service.promoPrice != null ? (
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-base text-espresso/45 line-through">
                    {formatPrice(service.price)}
                  </span>
                  <span className="text-3xl font-bold text-[#A97436]">
                    {formatPrice(service.promoPrice)}
                  </span>
                  <span className="rounded-full bg-[#9C2F2F] px-2.5 py-1 text-xs font-bold text-white">
                    {service.promoDiscountType === 'PERCENTAGE'
                      ? `-${Number(service.promoDiscountValue)}%`
                      : `-${Number(service.promoDiscountValue)} zł`}
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-[#A97436]">
                  {formatPrice(service.price)}
                </span>
              )}
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-espresso/65">
                <Clock size={16} aria-hidden="true" /> {service.durationMinutes} min
              </span>
            </div>

            {service.promoPrice != null && (service.promoUsesRemaining != null || service.promoEndDate) && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {service.promoUsesRemaining != null && (
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold text-white ${
                    service.promoUsesRemaining <= 3 ? 'bg-[#9C2F2F]' : 'bg-espresso'
                  }`}>
                    Tylko dla {service.promoUsesRemaining} osób
                  </span>
                )}
                {service.promoEndDate && (
                  <span className="text-sm text-espresso/65">
                    Promocja do {new Date(service.promoEndDate).toLocaleDateString('pl-PL')}
                  </span>
                )}
              </div>
            )}

            <button
              className="mt-7 w-full rounded-full bg-espresso px-8 py-3.5 text-base font-semibold text-white shadow-[0_6px_16px_rgba(26,56,40,0.16)] transition-colors hover:bg-espresso/90 sm:w-auto"
              onClick={() => navigate(`/rezerwacja?serviceId=${service.id}`)}
            >
              Umów wizytę
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-16">
        <div className="container mx-auto max-w-3xl px-5">
          <p className="mb-10 text-lg leading-relaxed text-espresso/70">
            {service.description}
          </p>
          {service.detailedContent && (
            <div className="prose prose-lg max-w-none">
              <RichTextViewer content={service.detailedContent} />
            </div>
          )}
        </div>
      </section>

      {seoContent && (
        <section className="border-y border-espresso/10 bg-[#F8F7F2] py-16">
          <div className="container mx-auto max-w-3xl px-5">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6" style={{ color: '#1A3828' }}>
              {seoContent.sectionTitle}
            </h2>
            <div className="space-y-4 text-base leading-relaxed" style={{ color: 'rgba(20,40,28,0.72)' }}>
              {seoContent.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <ul className="mt-8 grid gap-3" aria-label="Zakres usługi">
              {seoContent.highlights.map((highlight) => (
                <li key={highlight} className="rounded-lg border border-espresso/10 bg-white px-5 py-4 font-medium text-espresso">
                  {highlight}
                </li>
              ))}
            </ul>

            <h2 className="text-2xl font-heading font-bold mt-12 mb-5" style={{ color: '#1A3828' }}>
              Najczęstsze pytania o {service.name}
            </h2>
            <div className="space-y-6">
              {seoContent.faq.map(({ question, answer }) => (
                <div key={question}>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1A3828' }}>{question}</h3>
                  <p className="leading-relaxed" style={{ color: 'rgba(20,40,28,0.72)' }}>{answer}</p>
                </div>
              ))}
            </div>

            <nav className="mt-10 flex flex-wrap gap-3" aria-label="Porównaj powiązane usługi">
              {seoContent.related.map(({ to, label }) => (
                <Link key={to} to={to} className="rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(20,40,28,0.22)', color: '#1A3828' }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      )}

      <section className="bg-white py-14">
        <div className="container mx-auto max-w-3xl px-5">
          <h2 className="mb-6 text-left font-heading text-2xl font-bold text-espresso">
            Opinie klientek
          </h2>
          <ReviewsList serviceId={service.id} />
        </div>
      </section>
    </>
  );
};

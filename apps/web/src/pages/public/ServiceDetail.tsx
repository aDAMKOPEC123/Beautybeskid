import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { servicesApi } from '@/api/services.api';
import { reviewsApi } from '@/api/reviews.api';
import { formatPrice } from '@/lib/utils';
import { Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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

export const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const loadingSeoContent = slug ? SERVICE_SEO_CONTENT[slug] : undefined;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
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
    <main className="py-16" style={{ backgroundColor: '#F0F7F1' }} aria-busy="true">
      <div className="container max-w-3xl mx-auto">
        <p className="eyebrow mb-4">Oprawa oka · Limanowa</p>
        <h1 className="font-display text-4xl md:text-6xl text-espresso" style={{ fontStyle: 'italic', fontWeight: 300 }}>
          {loadingSeoContent.heading}
        </h1>
        <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(20,40,28,0.72)' }}>
          {loadingSeoContent.description}
        </p>
        <h2 className="mt-10 text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
          {loadingSeoContent.sectionTitle}
        </h2>
        <p className="mt-4 leading-relaxed" style={{ color: 'rgba(20,40,28,0.72)' }}>
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
  if (!service) return <div className="p-8 text-center">Usługa nie została znaleziona.</div>;

  const seoContent = SERVICE_SEO_CONTENT[service.slug];
  const pageUrl = `https://kosmetologwiktoriacwik.pl/uslugi/${service.slug}`;
  const seoTitle = seoContent?.title ?? (service.slug === 'laminacja-brwi'
    ? 'Laminacja brwi — cena, czas i rezerwacja | BeskidStudio'
    : `${service.name} — BeskidStudio By Wiktoria Ćwik Limanowa`);
  const seoDescription = seoContent?.description ?? (service.description
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
            addressLocality: 'Mordarka',
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
          price: String(service.price),
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

      {/* Back link */}
      <div className="container pt-8">
        <Link
          to="/uslugi"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'rgba(20,40,28,0.5)' }}
        >
          <ArrowLeft size={15} /> Wróć do usług
        </Link>
      </div>

      {/* Hero */}
      <section className="py-14" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container text-center max-w-3xl mx-auto">
          {service.imagePath && (
            <div
              className="overflow-hidden mb-10 shadow-xl"
            >
              <ClipRevealImage
                src={service.imagePath}
                alt={service.name}
                wrapperClassName="w-full h-[50vh]"
                className="w-full h-full"
              />
            </div>
          )}
          <p className="eyebrow mb-4">{service.category} · {service.durationMinutes} min · Limanowa</p>
          <h1
            className="font-display text-4xl md:text-6xl text-espresso"
            style={{ fontStyle: 'italic', fontWeight: 300 }}
          >
            {service.name}
          </h1>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-3xl font-bold" style={{ color: '#C4965A' }}>
              {formatPrice(service.price)}
            </span>
            <span
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full"
              style={{ backgroundColor: 'rgba(20,40,28,0.07)', color: '#1A3828' }}
            >
              <Clock size={15} /> {service.durationMinutes} min
            </span>
          </div>
          <button
            className="text-base font-semibold px-10 py-3.5 rounded-full text-white shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1A3828' }}
            onClick={() =>
              navigate(
                isAuthenticated ? `/rezerwacja?serviceId=${service.id}` : '/auth/login',
                isAuthenticated ? undefined : { state: { from: `/rezerwacja?serviceId=${service.id}` } }
              )
            }
          >
            Umów wizytę
          </button>
        </div>
      </section>

      {/* Content */}
      <section className="py-14" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-3xl mx-auto">
          <p className="text-lg leading-relaxed mb-10 text-center" style={{ color: 'rgba(20,40,28,0.6)' }}>
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
        <section className="py-16" style={{ backgroundColor: '#F0F7F1' }}>
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6" style={{ color: '#1A3828' }}>
              {seoContent.sectionTitle}
            </h2>
            <div className="space-y-4 text-base leading-relaxed" style={{ color: 'rgba(20,40,28,0.72)' }}>
              {seoContent.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <ul className="mt-8 grid gap-3" aria-label="Zakres usługi">
              {seoContent.highlights.map((highlight) => (
                <li key={highlight} className="rounded-2xl bg-white px-5 py-4 font-medium" style={{ color: '#1A3828' }}>
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

      {/* Reviews */}
      <section className="py-14" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-2xl font-heading font-bold mb-6 text-center" style={{ color: '#1A3828' }}>
            Opinie klientek
          </h2>
          <ReviewsList serviceId={service.id} />
        </div>
      </section>
    </>
  );
};

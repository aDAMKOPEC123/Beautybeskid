import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { servicesApi } from '@/api/services.api';
import { formatPrice } from '@/lib/utils';
import { Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageSEO } from '@/components/shared/SEO';
import { RichTextViewer } from '@/components/shared/RichTextViewer';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { ClipRevealImage } from '@/components/ui/ClipRevealImage';

export const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div className="container py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!service) return <div className="p-8 text-center">Usługa nie została znaleziona.</div>;


  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `https://kosmetologwiktoriacwik.pl/uslugi/${service.slug}#service`,
        name: service.name,
        ...(service.description ? { description: service.description } : {}),
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
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Strona główna', item: 'https://kosmetologwiktoriacwik.pl' },
          { '@type': 'ListItem', position: 2, name: 'Usługi', item: 'https://kosmetologwiktoriacwik.pl/uslugi' },
          { '@type': 'ListItem', position: 3, name: service.name, item: `https://kosmetologwiktoriacwik.pl/uslugi/${service.slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <PageSEO
        title={`${service.name} — BeskidStudio By Wiktoria Ćwik Limanowa`}
        description={service.description ? `${service.description} Zabieg dostępny w salonie BeskidStudio By Wiktoria Ćwik w Limanowej (Mordarka 505).` : `${service.name} — zabieg w salonie BeskidStudio By Wiktoria Ćwik w Limanowej (Mordarka 505). Sprawdź szczegóły i zarezerwuj termin online.`}
        canonical={`/uslugi/${service.slug}`}
        ogImage={service.imagePath}
        schema={schema}
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
          <p className="eyebrow mb-4">{service.category} · {service.durationMinutes} min</p>
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

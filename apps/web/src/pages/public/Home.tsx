import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageSEO } from '@/components/shared/SEO';
import { googleReviewsApi, type GoogleReviewsData } from '@/api/google-reviews.api';
import { servicesApi } from '@/api/services.api';
import { metamorphosesApi } from '@/api/metamorphoses.api';
import type { Service } from '@cosmo/shared';
import { buildFaqSchema } from '@/components/home/home-data';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustStrip } from '@/components/home/TrustStrip';
import { ServicesSection } from '@/components/home/ServicesSection';
import { PodologySection } from '@/components/home/PodologySection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { ProcessSection } from '@/components/home/ProcessSection';
import { MetamorphosesSection } from '@/components/home/MetamorphosesSection';
import { ConsultationSection } from '@/components/home/ConsultationSection';
import { AboutOwnerSection } from '@/components/home/AboutOwnerSection';
import { FaqSection } from '@/components/home/FaqSection';
import { AreaLinks } from '@/components/home/AreaLinks';

const heroImage = '/images/beautybeskid-hero-premium.webp';

const ConsultationModal = lazy(() =>
  import('@/components/public/ConsultationModal').then((module) => ({ default: module.ConsultationModal })),
);

export const Home = () => {
  const [consultationOpen, setConsultationOpen] = useState(false);

  const { data: allServices = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
    staleTime: 10 * 60_000,
  });

  const { data: googleReviews } = useQuery<GoogleReviewsData>({
    queryKey: ['google-reviews'],
    queryFn: googleReviewsApi.get,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { data: metamorphoses = [] } = useQuery<any[]>({
    queryKey: ['metamorphoses-home'],
    queryFn: metamorphosesApi.getAll,
    staleTime: 15 * 60_000,
    retry: false,
  });

  const openConsultation = () => setConsultationOpen(true);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <PageSEO
        title="Kosmetolog Limanowa | Wiktoria Ćwik – BeskidStudio"
        description="BeskidStudio By Wiktoria Ćwik — kosmetolog koło Limanowej. Zabiegi beauty i terminy online. Podologia w odrębnej lokalizacji: tel. 532 128 227."
        canonical="/"
        ogImage={heroImage}
        schema={buildFaqSchema()}
      />

      <main className="flex-1">
        <HeroSection onConsultationClick={openConsultation} />
        <TrustStrip googleRating={googleReviews?.rating} />
        <ServicesSection availableServices={allServices} servicesLoading={servicesLoading} />
        <PodologySection />
        <TestimonialsSection googleData={googleReviews} />
        <ProcessSection />
        <MetamorphosesSection metamorphoses={metamorphoses} />
        <ConsultationSection onConsultationClick={openConsultation} />
        <AboutOwnerSection />
        <FaqSection />
        <AreaLinks />
      </main>

      {consultationOpen ? (
        <Suspense fallback={null}>
          <ConsultationModal open onClose={() => setConsultationOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
};

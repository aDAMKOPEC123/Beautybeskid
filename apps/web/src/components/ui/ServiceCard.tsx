import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { ServiceRating } from '@/components/reviews/ServiceRating';

interface ServiceCardProps {
  service: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    promoPrice?: number | null;
    promoDiscountType?: string | null;
    promoDiscountValue?: number | null;
    promoUsesRemaining?: number | null;
    imagePath?: string | null;
    category?: string;
    avgRating?: number;
    reviewCount?: number;
  };
}

export const ServiceCard = ({ service }: ServiceCardProps) => (
  <Link
    to={`/uslugi/${service.slug}`}
    className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso focus-visible:ring-offset-4"
  >
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-espresso/10 bg-white shadow-[0_8px_24px_rgba(26,56,40,0.07)] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-oak/50 group-hover:shadow-[0_14px_32px_rgba(26,56,40,0.11)]">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-espresso/8 bg-cream">
        {service.imagePath ? (
          <img
            src={service.imagePath}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#EEF4EF] text-espresso/60">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-oak/25 bg-white text-oak">
              <Sparkles className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">
              {service.category || 'BeskidStudio'}
            </span>
          </div>
        )}

        {service.promoPrice != null && service.promoDiscountType && (
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#A44437] px-3 py-1.5 text-xs font-bold text-white shadow-sm">
              {service.promoDiscountType === 'PERCENTAGE'
                ? `-${Number(service.promoDiscountValue)}%`
                : `-${Number(service.promoDiscountValue)} zł`}
            </span>
            {service.promoUsesRemaining != null && (
              <span className="rounded-full border border-white/70 bg-white/92 px-3 py-1.5 text-xs font-semibold text-espresso shadow-sm backdrop-blur-sm">
                Zostało {service.promoUsesRemaining}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-mink">
          <span>{service.category || 'Zabieg beauty'}</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-oak" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-oak" />
            {service.durationMinutes} min
          </span>
        </p>

        <h2 className="mt-3 font-heading text-2xl font-semibold leading-tight text-espresso">
          {service.name}
        </h2>

        {service.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-espresso/62">
            {service.description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-espresso/8 pt-5">
          <div className="min-w-0">
            {service.promoPrice != null ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm text-espresso/45 line-through">{formatPrice(service.price)}</span>
                <span className="text-xl font-bold text-[#A44437]">{formatPrice(service.promoPrice)}</span>
              </div>
            ) : (
              <span className="text-xl font-bold text-espresso">{formatPrice(service.price)}</span>
            )}
            {service.avgRating !== undefined && service.reviewCount !== undefined && (
              <div className="mt-1">
                <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount ?? 0} />
              </div>
            )}
          </div>

          <span className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-espresso px-4 text-sm font-semibold text-ivory transition-colors group-hover:bg-walnut">
            Szczegóły
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  </Link>
);

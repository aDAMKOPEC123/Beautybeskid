import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/utils';
import { ServiceRating } from '@/components/reviews/ServiceRating';
import { ArrowRight } from 'lucide-react';

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
  index?: number; // for stagger delay
}

export const ServiceCard = ({ service, index = 0 }: ServiceCardProps) => {
  const delay = Math.min(index * 80, 400); // ms stagger, capped at 400ms

  return (
    <Link
      to={`/uslugi/${service.slug}`}
      className="block group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] shadow-[0_8px_32px_rgba(26,56,40,0.12)] hover:shadow-[0_16px_48px_rgba(26,56,40,0.18)]"
        style={{
          borderRadius: '4px',
        }}
      >
        {/* Image with glassmorphism overlay */}
        <div className="relative overflow-hidden" style={{ height: '200px' }}>
          {service.imagePath ? (
            <img
              src={service.imagePath}
              alt={service.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cream to-caramel/40" />
          )}
          {/* Promo badge */}
          {service.promoPrice != null && service.promoDiscountType && (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
              <div className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-sm shadow-md" style={{ letterSpacing: '0.03em' }}>
                {service.promoDiscountType === 'PERCENTAGE'
                  ? `-${Number(service.promoDiscountValue)}%`
                  : `-${Number(service.promoDiscountValue)} zł`}
              </div>
              {service.promoUsesRemaining != null && (
                <div className="bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-sm shadow-md text-center backdrop-blur-sm">
                  Pozostało {service.promoUsesRemaining}
                </div>
              )}
            </div>
          )}
          {/* Dark gradient + glassmorphism label */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(26,56,40,0.72) 100%)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 p-4 glass"
            style={{
              background: 'rgba(250,247,242,0.1)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {service.category && (
              <p className="eyebrow mb-1" style={{ color: '#3D7A54' }}>
                {service.category} · {service.durationMinutes} min
              </p>
            )}
            <h2
              className="font-display text-[18px] text-ivory leading-tight"
              style={{ fontStyle: 'italic', fontWeight: 300 }}
            >
              {service.name}
            </h2>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between px-4 py-4 bg-ivory gap-2"
          style={{ borderTop: '1px solid rgba(26,56,40,0.06)' }}
        >
          <div className="min-w-0">
            {service.promoPrice != null ? (
              <span className="flex items-center gap-2">
                <span className="font-display text-[14px] text-espresso/50 line-through" style={{ fontWeight: 300 }}>
                  {formatPrice(service.price)}
                </span>
                <span className="font-display text-[20px] text-red-600" style={{ fontWeight: 500 }}>
                  {formatPrice(service.promoPrice)}
                </span>
              </span>
            ) : (
              <span className="font-display text-[20px] text-espresso" style={{ fontWeight: 300 }}>
                {formatPrice(service.price)}
              </span>
            )}
            {(service.avgRating !== undefined && service.reviewCount !== undefined) && (
              <div className="mt-0.5">
                <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount ?? 0} />
              </div>
            )}
          </div>
          <div aria-hidden="true" className="shrink-0 flex items-center gap-1 px-3 py-2.5 bg-espresso text-ivory text-[9px] tracking-[0.15em] uppercase font-medium hover:bg-espresso/90 transition-colors">
            Umów <ArrowRight size={10} />
          </div>
        </div>
      </div>
    </Link>
  );
};

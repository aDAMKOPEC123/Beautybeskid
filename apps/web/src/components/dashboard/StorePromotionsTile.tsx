import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Image, ShoppingBag, Sparkles, Store } from 'lucide-react';
import { storePromotionsApi } from '@/api/store-promotions.api';

const getCountLabel = (count: number) => {
  if (count === 1) return '1 aktywna';
  return `${count} ${count >= 2 && count <= 4 ? 'aktywne' : 'aktywnych'}`;
};

const getDaysLeftLabel = (date: string) => {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Kończy się dziś';
  if (days === 1) return 'Kończy się jutro';
  if (days <= 3) return `Kończy się za ${days} dni`;
  return null;
};

export const StorePromotionsTile = () => {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['store-promotions', 'active'],
    queryFn: storePromotionsApi.getActive,
    staleTime: 60_000,
  });

  const featured = promotions.find((promotion) => promotion.isFeatured) ?? promotions[0];
  const countLabel = getCountLabel(promotions.length);
  const endingLabel = featured ? getDaysLeftLabel(featured.endDate) : null;

  if (isLoading) {
    return (
      <div className="h-full animate-pulse p-4">
        <div className="h-28 rounded-2xl bg-cream" />
        <div className="mt-4 h-4 w-2/3 rounded bg-cream" />
        <div className="mt-2 h-3 w-full rounded bg-cream/70" />
      </div>
    );
  }

  if (!featured) {
    return (
      <Link to="/user/promocje-sklepowe" className="group block h-full p-4 transition-colors hover:bg-oak/5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-oak/10 text-oak"><ShoppingBag size={19} /></span>
          <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-primary">0 aktywnych</span>
        </div>
        <h3 className="mt-4 font-heading text-lg font-bold text-espresso">Promocje sklepowe</h3>
        <p className="mt-1 text-xs leading-5 text-mink">Nowe okazje kosmetyczne pojawią się tutaj, gdy tylko będą dostępne.</p>
        <span className="mt-3 flex items-center gap-1 text-xs font-bold text-primary">Sprawdź później <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
      </Link>
    );
  }

  return (
    <Link to="/user/promocje-sklepowe" className="group block h-full overflow-hidden transition-colors hover:bg-oak/5">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-cream via-white to-primary/10">
        {featured.imageUrl ? (
          <img
            src={featured.imageUrl}
            alt={`Wyróżniona promocja ${featured.storeName}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Image size={34} className="text-primary/25" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-espresso/70 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-oak px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          <Sparkles size={12} /> Wyróżniona
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-white shadow">
          {featured.discountValue}
        </span>
        <p className="absolute bottom-3 left-4 right-4 truncate text-xs font-bold uppercase tracking-[0.16em] text-white drop-shadow">
          {featured.storeName}
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-oak">
              <ShoppingBag size={12} /> Promocje sklepowe
            </p>
            <h3 className="mt-1 line-clamp-2 font-heading text-lg font-bold leading-tight text-espresso">
              {featured.title}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-primary">
            {countLabel}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-5 text-mink">
          {featured.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1 text-[11px] font-bold ${endingLabel ? 'text-rose-600' : 'text-mink'}`}>
            <Store size={13} /> {endingLabel ?? (featured.category || featured.brand || 'Wybrana okazja')}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            Zobacz <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
};

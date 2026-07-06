import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { storePromotionsApi } from '@/api/store-promotions.api';

export const StorePromotionsTile = () => {
  const { data: count, isLoading } = useQuery({
    queryKey: ['store-promotions', 'active-count'],
    queryFn: storePromotionsApi.getActiveCount,
    staleTime: 60_000,
  });

  const countLabel = count === 1
    ? '1 aktywna'
    : `${count ?? 0} ${count != null && count >= 2 && count <= 4 ? 'aktywne' : 'aktywnych'}`;

  return (
    <Link to="/user/promocje-sklepowe" className="group block h-full p-4 transition-colors hover:bg-oak/5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-oak/10 text-oak"><ShoppingBag size={19} /></span>
        <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-primary">{isLoading ? '…' : countLabel}</span>
      </div>
      <h3 className="mt-4 font-heading text-lg font-bold text-espresso">Promocje sklepowe</h3>
      <p className="mt-1 text-xs leading-5 text-mink">Sprawdź aktualne okazje kosmetyczne w sklepach i markach.</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-bold text-primary">Zobacz promocje <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
    </Link>
  );
};

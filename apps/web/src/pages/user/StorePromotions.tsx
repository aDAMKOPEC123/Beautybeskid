import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, Copy, ExternalLink, ShoppingBag, Sparkles, Store } from 'lucide-react';
import { toast } from 'sonner';
import type { StorePromotion } from '@cosmo/shared';
import { storePromotionsApi } from '@/api/store-promotions.api';
import { Button } from '@/components/ui/button';

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(date));

const PromotionCard = ({ promotion }: { promotion: StorePromotion }) => {
  const copyCode = async () => {
    if (!promotion.promoCode) return;
    await navigator.clipboard.writeText(promotion.promoCode);
    toast.success('Kod rabatowy skopiowany');
  };

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${promotion.isFeatured ? 'border-oak/60 shadow-[0_16px_50px_rgba(196,150,90,0.14)]' : 'border-primary/10 shadow-sm'}`}>
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-cream via-white to-primary/10">
        {promotion.imageUrl ? (
          <img src={promotion.imageUrl} alt={`Promocja ${promotion.storeName}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center"><Store size={52} className="text-primary/20" /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
        <p className="absolute bottom-4 left-5 text-sm font-bold uppercase tracking-[0.18em] text-white drop-shadow">{promotion.storeName}</p>
        {promotion.isFeatured && <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-oak px-3 py-1.5 text-xs font-bold text-white shadow"><Sparkles size={13} /> Wyróżniona</span>}
        <span className="absolute right-4 top-4 rounded-full bg-primary px-4 py-2 text-lg font-bold text-white shadow-lg">{promotion.discountValue}</span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="font-heading text-xl font-bold leading-tight text-espresso">{promotion.title}</h2>
        <p className="mt-3 text-sm leading-6 text-mink">{promotion.description}</p>
        {promotion.conditions && (
          <div className="mt-4 rounded-xl bg-cream/70 p-3.5">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Check size={14} /> Warunki</p>
            <p className="whitespace-pre-line text-xs leading-5 text-espresso/70">{promotion.conditions}</p>
          </div>
        )}
        <div className="mt-auto pt-5">
          <p className="flex items-center gap-2 text-xs font-medium text-mink"><CalendarDays size={15} className="text-oak" /> Ważna do {formatDate(promotion.endDate)}</p>
          {promotion.promoCode && (
            <button onClick={copyCode} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-dashed border-oak/60 bg-oak/5 px-4 text-left transition-colors hover:bg-oak/10" aria-label={`Kopiuj kod ${promotion.promoCode}`}>
              <span><small className="block text-[10px] font-bold uppercase tracking-widest text-mink">Kod rabatowy</small><strong className="font-mono text-base tracking-wider text-espresso">{promotion.promoCode}</strong></span>
              <Copy size={18} className="text-oak" />
            </button>
          )}
          {promotion.link && <Button asChild className="mt-4 min-h-12 w-full rounded-full"><a href={promotion.link} target="_blank" rel="noopener noreferrer">Sprawdź promocję <ExternalLink size={16} className="ml-2" /></a></Button>}
        </div>
      </div>
    </article>
  );
};

export const UserStorePromotions = () => {
  const { data: promotions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['store-promotions', 'active'],
    queryFn: storePromotionsApi.getActive,
  });

  return (
    <div className="space-y-7 animate-enter">
      <section className="relative overflow-hidden rounded-[2rem] bg-espresso px-6 py-9 text-white shadow-xl sm:px-10 sm:py-12">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-oak/25" />
        <div className="absolute -bottom-28 right-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-oak"><ShoppingBag size={16} /> Wybrane dla Ciebie</p>
          <h1 className="mt-3 font-display text-3xl font-light italic sm:text-5xl">Promocje sklepowe</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Aktualne okazje kosmetyczne i beauty w ulubionych sklepach — zebrane w jednym miejscu.</p>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[32rem] animate-pulse rounded-[1.5rem] bg-white shadow-sm" />)}</div>
      ) : isError ? (
        <div className="rounded-[1.5rem] border border-destructive/20 bg-white p-10 text-center shadow-sm">
          <p className="font-heading text-xl font-bold text-espresso">Nie udało się pobrać promocji</p>
          <p className="mt-2 text-sm text-mink">Sprawdź połączenie i spróbuj jeszcze raz.</p>
          <Button variant="outline" className="mt-5 rounded-full" onClick={() => refetch()}>Spróbuj ponownie</Button>
        </div>
      ) : promotions.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-white p-10 text-center shadow-sm sm:p-14">
          <Store size={46} className="mx-auto text-primary/25" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-espresso">Wkrótce pojawią się nowe okazje</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mink">Obecnie nie mamy aktywnych promocji. Zajrzyj tu ponownie za jakiś czas.</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Aktualne oferty</p><h2 className="mt-1 font-heading text-2xl font-bold text-espresso">Znajdź coś dla siebie</h2></div>
            <span className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-primary">{promotions.length} {promotions.length === 1 ? 'promocja' : promotions.length < 5 ? 'promocje' : 'promocji'}</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{promotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}</div>
        </div>
      )}
    </div>
  );
};

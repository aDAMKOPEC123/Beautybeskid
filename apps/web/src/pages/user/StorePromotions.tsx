import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StorePromotion } from '@cosmo/shared';
import { storePromotionsApi } from '@/api/store-promotions.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SortMode = 'recommended' | 'ending' | 'popular' | 'newest';

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(date));

const getDaysLeft = (date: string) => {
  const now = new Date();
  const end = new Date(date);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / 86_400_000);
};

const getEndingLabel = (date: string) => {
  const days = getDaysLeft(date);
  if (days <= 0) return 'Kończy się dziś';
  if (days === 1) return 'Kończy się jutro';
  if (days <= 3) return `Kończy się za ${days} dni`;
  return `Ważna do ${formatDate(date)}`;
};

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'recommended', label: 'Polecane' },
  { value: 'ending', label: 'Kończące się' },
  { value: 'popular', label: 'Popularne' },
  { value: 'newest', label: 'Najnowsze' },
];

const PromotionCard = ({
  promotion,
  onCopyCode,
  onLinkClick,
  onToggleSave,
  onToggleReminder,
  isSaving,
  isReminderSaving,
}: {
  promotion: StorePromotion;
  onCopyCode: (promotion: StorePromotion) => void;
  onLinkClick: (promotion: StorePromotion) => void;
  onToggleSave: (promotion: StorePromotion) => void;
  onToggleReminder: (promotion: StorePromotion) => void;
  isSaving: boolean;
  isReminderSaving: boolean;
}) => {
  const urgent = getDaysLeft(promotion.endDate) <= 3;

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
        <div className="flex items-start justify-between gap-3">
          <div>
            {promotion.category && <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-oak"><Tag size={13} /> {promotion.category}</p>}
            <h2 className="font-heading text-xl font-bold leading-tight text-espresso">{promotion.title}</h2>
            {promotion.brand && <p className="mt-1 text-xs font-semibold text-primary/70">{promotion.brand}</p>}
          </div>
          <button
            onClick={() => onToggleSave(promotion)}
            disabled={isSaving}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${promotion.isSaved ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-primary/10 text-mink hover:bg-cream'}`}
            aria-label={promotion.isSaved ? 'Usuń z zapisanych' : 'Zapisz promocję'}
          >
            <Heart size={18} fill={promotion.isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-mink">{promotion.description}</p>

        {promotion.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {promotion.tags.map((tag) => <span key={tag} className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-primary">#{tag}</span>)}
          </div>
        )}

        {promotion.conditions && (
          <div className="mt-4 rounded-xl bg-cream/70 p-3.5">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Check size={14} /> Warunki</p>
            <p className="whitespace-pre-line text-xs leading-5 text-espresso/70">{promotion.conditions}</p>
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`flex items-center gap-2 text-xs font-medium ${urgent ? 'text-rose-600' : 'text-mink'}`}>
              <CalendarDays size={15} className={urgent ? 'text-rose-500' : 'text-oak'} /> {getEndingLabel(promotion.endDate)}
            </p>
            <button
              onClick={() => onToggleReminder(promotion)}
              disabled={isReminderSaving}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${promotion.hasReminder ? 'bg-primary text-white' : 'bg-cream text-primary hover:bg-oak/15'}`}
            >
              {promotion.hasReminder ? <BellOff size={13} /> : <Bell size={13} />}
              {promotion.hasReminder ? 'Przypomnienie włączone' : 'Przypomnij mi'}
            </button>
          </div>

          {promotion.promoCode && (
            <button onClick={() => onCopyCode(promotion)} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-dashed border-oak/60 bg-oak/5 px-4 text-left transition-colors hover:bg-oak/10" aria-label={`Kopiuj kod ${promotion.promoCode}`}>
              <span><small className="block text-[10px] font-bold uppercase tracking-widest text-mink">Kod rabatowy</small><strong className="font-mono text-base tracking-wider text-espresso">{promotion.promoCode}</strong></span>
              <Copy size={18} className="text-oak" />
            </button>
          )}

          {promotion.link && (
            <Button asChild className="mt-4 min-h-12 w-full rounded-full">
              <a href={promotion.link} target="_blank" rel="noopener noreferrer" onClick={() => onLinkClick(promotion)}>Sprawdź promocję <ExternalLink size={16} className="ml-2" /></a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export const UserStorePromotions = () => {
  const queryClient = useQueryClient();
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('recommended');

  const { data: promotions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['store-promotions', 'active'],
    queryFn: storePromotionsApi.getActive,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['store-promotions'] });
  };

  const saveMutation = useMutation({
    mutationFn: (promotion: StorePromotion) => promotion.isSaved ? storePromotionsApi.unsave(promotion.id) : storePromotionsApi.save(promotion.id),
    onSuccess: invalidate,
    onError: () => toast.error('Nie udało się zapisać promocji'),
  });

  const reminderMutation = useMutation({
    mutationFn: (promotion: StorePromotion) => promotion.hasReminder ? storePromotionsApi.removeReminder(promotion.id) : storePromotionsApi.setReminder(promotion.id),
    onSuccess: (_data, promotion) => {
      invalidate();
      toast.success(promotion.hasReminder ? 'Przypomnienie wyłączone' : 'Przypomnienie ustawione');
    },
    onError: () => toast.error('Nie udało się zmienić przypomnienia'),
  });

  useEffect(() => {
    promotions.forEach((promotion) => {
      if (viewedIdsRef.current.has(promotion.id)) return;
      viewedIdsRef.current.add(promotion.id);
      storePromotionsApi.trackEvent(promotion.id, 'VIEW').catch(() => undefined);
    });
  }, [promotions]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(promotions.map((promotion) => promotion.category).filter(Boolean) as string[]));
    return values.sort((a, b) => a.localeCompare(b, 'pl'));
  }, [promotions]);

  const filtered = useMemo(() => {
    const phrase = search.trim().toLocaleLowerCase('pl');
    const result = promotions.filter((promotion) => {
      if (savedOnly && !promotion.isSaved) return false;
      if (category !== 'all' && promotion.category !== category) return false;
      if (!phrase) return true;
      return [
        promotion.storeName,
        promotion.brand,
        promotion.category,
        promotion.title,
        promotion.description,
        promotion.discountValue,
        promotion.tags.join(' '),
      ].filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(phrase);
    });

    return [...result].sort((a, b) => {
      if (sort === 'ending') return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      if (sort === 'popular') {
        const aScore = a.clickCount + a.copyCount + a.saveCount;
        const bScore = b.clickCount + b.copyCount + b.saveCount;
        return bScore - aScore;
      }
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return Number(b.isFeatured) - Number(a.isFeatured) || new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });
  }, [category, promotions, savedOnly, search, sort]);

  const savedCount = promotions.filter((promotion) => promotion.isSaved).length;

  const copyCode = async (promotion: StorePromotion) => {
    if (!promotion.promoCode) return;
    await navigator.clipboard.writeText(promotion.promoCode);
    storePromotionsApi.trackEvent(promotion.id, 'COPY_CODE').catch(() => undefined);
    toast.success('Kod rabatowy skopiowany');
  };

  const trackLink = (promotion: StorePromotion) => {
    storePromotionsApi.trackEvent(promotion.id, 'CLICK').catch(() => undefined);
  };

  return (
    <div className="space-y-7 animate-enter">
      <section className="relative overflow-hidden rounded-[2rem] bg-espresso px-6 py-9 text-white shadow-xl sm:px-10 sm:py-12">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-oak/25" />
        <div className="absolute -bottom-28 right-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-oak"><ShoppingBag size={16} /> Wybrane dla Ciebie</p>
          <h1 className="mt-3 font-display text-3xl font-light italic sm:text-5xl">Promocje sklepowe</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Aktualne okazje beauty dopasowane do Twojego profilu, poziomu lojalności i zainteresowań pielęgnacyjnych.</p>
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
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mink">Obecnie nie mamy aktywnych promocji pasujących do Twojego profilu. Zajrzyj tu ponownie za jakiś czas.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-primary/10 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative block w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mink" size={17} />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj sklepu, marki, tagu…" className="rounded-full pl-10" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-mink"><SlidersHorizontal size={14} /> Sortuj</span>
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSort(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${sort === option.value ? 'bg-primary text-white' : 'bg-cream text-primary hover:bg-oak/15'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setCategory('all')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === 'all' ? 'bg-espresso text-white' : 'bg-cream text-primary'}`}>Wszystkie kategorie</button>
              {categories.map((item) => (
                <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? 'bg-espresso text-white' : 'bg-cream text-primary'}`}>{item}</button>
              ))}
              <button onClick={() => setSavedOnly((value) => !value)} className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold ${savedOnly ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'}`}>
                <Heart size={13} className="mr-1 inline" fill={savedOnly ? 'currentColor' : 'none'} /> Zapisane ({savedCount})
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Aktualne oferty</p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-espresso">{savedOnly ? 'Twoje zapisane promocje' : 'Znajdź coś dla siebie'}</h2>
            </div>
            <span className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-primary">{filtered.length} {filtered.length === 1 ? 'promocja' : filtered.length < 5 ? 'promocje' : 'promocji'}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-white p-10 text-center shadow-sm">
              <Store size={42} className="mx-auto text-primary/25" />
              <p className="mt-3 font-heading text-xl font-bold text-espresso">Brak wyników dla wybranych filtrów</p>
              <p className="mt-2 text-sm text-mink">Zmień kategorię, wyszukiwane hasło albo wyłącz filtr zapisanych.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={promotion}
                  onCopyCode={copyCode}
                  onLinkClick={trackLink}
                  onToggleSave={(item) => saveMutation.mutate(item)}
                  onToggleReminder={(item) => reminderMutation.mutate(item)}
                  isSaving={saveMutation.isPending}
                  isReminderSaving={reminderMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

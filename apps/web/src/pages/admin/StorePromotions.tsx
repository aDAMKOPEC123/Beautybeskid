import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  BarChart3,
  Bell,
  CalendarDays,
  CopyPlus,
  ExternalLink,
  Eye,
  Image,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Store,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StorePromotion, StorePromotionInput, StorePromotionLoyaltyTier, StorePromotionSkinType } from '@cosmo/shared';
import { storePromotionsApi } from '@/api/store-promotions.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AdminFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'hidden' | 'featured';

type PromotionForm = Omit<StorePromotionInput, 'startDate' | 'endDate' | 'tags' | 'targetConcerns'> & {
  startDate: string;
  endDate: string;
  tagsText: string;
  targetConcernsText: string;
  notificationTitle: string;
  notificationBody: string;
};

const LOYALTY_OPTIONS: Array<{ value: StorePromotionLoyaltyTier; label: string }> = [
  { value: 'BRONZE', label: 'Bronze' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
];

const SKIN_OPTIONS: Array<{ value: StorePromotionSkinType; label: string }> = [
  { value: 'SUCHA', label: 'Sucha' },
  { value: 'TLUSTA', label: 'Tłusta' },
  { value: 'MIESZANA', label: 'Mieszana' },
  { value: 'NORMALNA', label: 'Normalna' },
  { value: 'WRAZLIWA', label: 'Wrażliwa' },
];

const FILTERS: Array<{ value: AdminFilter; label: string }> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'active', label: 'Aktywne teraz' },
  { value: 'scheduled', label: 'Zaplanowane' },
  { value: 'expired', label: 'Wygasłe' },
  { value: 'hidden', label: 'Ukryte' },
  { value: 'featured', label: 'Wyróżnione' },
];

const toLocalInput = (date: Date | string) => {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};

const splitList = (value: string) =>
  Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));

const joinList = (values?: string[]) => values?.join(', ') ?? '';

const emptyForm = (): PromotionForm => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    storeName: '',
    brand: '',
    category: '',
    title: '',
    description: '',
    conditions: '',
    discountValue: '',
    promoCode: '',
    link: '',
    imageUrl: '',
    tagsText: '',
    targetLoyaltyTiers: [],
    targetSkinTypes: [],
    targetConcernsText: '',
    startDate: toLocalInput(start),
    endDate: toLocalInput(end),
    isActive: true,
    isFeatured: false,
    notifyClients: false,
    notificationTitle: '',
    notificationBody: '',
  };
};

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(date));

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message[0]?.message) return message[0].message as string;
  }
  return 'Nie udało się zapisać zmian. Spróbuj ponownie.';
};

const getPromotionStatus = (promotion: StorePromotion) => {
  const now = new Date();
  if (!promotion.isActive) return 'hidden' as const;
  if (new Date(promotion.startDate) > now) return 'scheduled' as const;
  if (new Date(promotion.endDate) < now) return 'expired' as const;
  return 'active' as const;
};

const statusLabel = {
  active: 'Aktywna teraz',
  scheduled: 'Zaplanowana',
  expired: 'Wygasła',
  hidden: 'Ukryta',
} as const;

const statusClass = {
  active: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-sky-100 text-sky-800',
  expired: 'bg-rose-100 text-rose-700',
  hidden: 'bg-slate-100 text-slate-600',
} as const;

export const AdminStorePromotions = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdminFilter>('all');
  const [editing, setEditing] = useState<StorePromotion | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: promotions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['store-promotions', 'admin'],
    queryFn: storePromotionsApi.getAll,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['store-promotions'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: StorePromotionInput & { imageFile?: File | null }) => {
      const { imageFile: selectedImage, ...payload } = data;
      const imageUrl = selectedImage ? await storePromotionsApi.uploadImage(selectedImage) : payload.imageUrl;
      return editing
        ? storePromotionsApi.update(editing.id, { ...payload, imageUrl })
        : storePromotionsApi.create({ ...payload, imageUrl });
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setImageFile(null);
      setImagePreview(null);
      toast.success(editing ? 'Promocja została zaktualizowana' : 'Promocja została dodana');
    },
    onError: (error) => setFormError(getErrorMessage(error)),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => storePromotionsApi.setActive(id, value),
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const featuredMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => storePromotionsApi.setFeatured(id, value),
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: storePromotionsApi.duplicate,
    onSuccess: () => {
      invalidate();
      toast.success('Utworzono kopię promocji jako ukrytą wersję roboczą');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: storePromotionsApi.remove,
    onSuccess: () => { invalidate(); toast.success('Promocja została usunięta'); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const filtered = useMemo(() => {
    const phrase = search.trim().toLocaleLowerCase('pl');
    return promotions.filter((item) => {
      const status = getPromotionStatus(item);
      if (filter !== 'all' && filter !== 'featured' && status !== filter) return false;
      if (filter === 'featured' && !item.isFeatured) return false;
      if (!phrase) return true;
      return [
        item.storeName,
        item.brand,
        item.category,
        item.title,
        item.discountValue,
        item.tags.join(' '),
      ].filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(phrase);
    });
  }, [filter, promotions, search]);

  const stats = useMemo(() => {
    const current = promotions.filter((item) => getPromotionStatus(item) === 'active').length;
    return {
      all: promotions.length,
      current,
      scheduled: promotions.filter((item) => getPromotionStatus(item) === 'scheduled').length,
      expired: promotions.filter((item) => getPromotionStatus(item) === 'expired').length,
      featured: promotions.filter((item) => item.isFeatured).length,
      views: promotions.reduce((sum, item) => sum + item.viewCount, 0),
      clicks: promotions.reduce((sum, item) => sum + item.clickCount, 0),
      copies: promotions.reduce((sum, item) => sum + item.copyCount, 0),
      saves: promotions.reduce((sum, item) => sum + item.saveCount, 0),
    };
  }, [promotions]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setImageFile(null);
    setImagePreview(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (promotion: StorePromotion) => {
    setEditing(promotion);
    setForm({
      storeName: promotion.storeName,
      brand: promotion.brand ?? '',
      category: promotion.category ?? '',
      title: promotion.title,
      description: promotion.description,
      conditions: promotion.conditions,
      discountValue: promotion.discountValue,
      promoCode: promotion.promoCode ?? '',
      link: promotion.link ?? '',
      imageUrl: promotion.imageUrl ?? '',
      tagsText: joinList(promotion.tags),
      targetLoyaltyTiers: promotion.targetLoyaltyTiers,
      targetSkinTypes: promotion.targetSkinTypes,
      targetConcernsText: joinList(promotion.targetConcerns),
      startDate: toLocalInput(promotion.startDate),
      endDate: toLocalInput(promotion.endDate),
      isActive: promotion.isActive,
      isFeatured: promotion.isFeatured,
      notifyClients: false,
      notificationTitle: '',
      notificationBody: '',
    });
    setImageFile(null);
    setImagePreview(promotion.imageUrl);
    setFormError('');
    setFormOpen(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.');
      return;
    }

    saveMutation.mutate({
      storeName: form.storeName,
      brand: form.brand || null,
      category: form.category || null,
      title: form.title,
      description: form.description,
      conditions: form.conditions,
      discountValue: form.discountValue,
      promoCode: form.promoCode || null,
      link: form.link || null,
      imageUrl: form.imageUrl || null,
      tags: splitList(form.tagsText),
      targetLoyaltyTiers: form.targetLoyaltyTiers,
      targetSkinTypes: form.targetSkinTypes,
      targetConcerns: splitList(form.targetConcernsText),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      notifyClients: form.notifyClients,
      notificationTitle: form.notificationTitle || undefined,
      notificationBody: form.notificationBody || undefined,
      imageFile,
    });
  };

  const setField = <K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleArrayValue = <T extends string>(values: T[] | undefined, value: T) =>
    values?.includes(value) ? values.filter((item) => item !== value) : [...(values ?? []), value];

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Sprzedaż i marketing</p>
          <h1 className="mt-1 text-2xl font-heading font-bold text-primary sm:text-3xl">Promocje sklepowe</h1>
          <p className="mt-1 text-sm text-muted-foreground">Zarządzaj ofertami, targetowaniem, powiadomieniami i wynikami.</p>
        </div>
        <Button onClick={openCreate} className="min-h-11 gap-2 rounded-full px-5"><Plus size={18} /> Dodaj promocję</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Wszystkie" value={stats.all} icon={<Store size={18} />} />
        <Stat label="Aktywne teraz" value={stats.current} icon={<Sparkles size={18} />} />
        <Stat label="Zaplanowane" value={stats.scheduled} icon={<CalendarDays size={18} />} />
        <Stat label="Wyświetlenia" value={stats.views} icon={<Eye size={18} />} />
        <Stat label="Klik/kod/zapis" value={`${stats.clicks}/${stats.copies}/${stats.saves}`} icon={<BarChart3 size={18} />} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj sklepu, kategorii, tagu…" className="pl-10" />
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-semibold text-destructive">Nie udało się pobrać promocji.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Spróbuj ponownie</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <Store className="mx-auto text-primary/40" size={36} />
          <p className="mt-3 font-semibold text-primary">{search || filter !== 'all' ? 'Brak pasujących promocji' : 'Nie dodano jeszcze żadnej promocji'}</p>
          {!search && filter === 'all' && <Button onClick={openCreate} variant="outline" className="mt-4">Dodaj pierwszą promocję</Button>}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((promotion) => {
            const status = getPromotionStatus(promotion);
            return (
              <article key={promotion.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex min-h-40">
                  <div className="flex w-28 shrink-0 items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 sm:w-44">
                    {promotion.imageUrl ? <img src={promotion.imageUrl} alt={`Grafika ${promotion.storeName}`} className="h-full w-full object-cover" /> : <Image size={30} className="text-primary/30" />}
                  </div>
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary/60">{promotion.storeName}{promotion.brand ? ` · ${promotion.brand}` : ''}</p>
                        <h2 className="mt-1 font-heading text-lg font-bold leading-tight text-primary">{promotion.title}</h2>
                        {promotion.category && <p className="mt-1 text-xs font-semibold text-muted-foreground">{promotion.category}</p>}
                      </div>
                      <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">{promotion.discountValue}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{promotion.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={`rounded-full px-2.5 py-1 ${statusClass[status]}`}>{statusLabel[status]}</span>
                      {promotion.isFeatured && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Wyróżniona</span>}
                      {(promotion.targetLoyaltyTiers.length > 0 || promotion.targetSkinTypes.length > 0 || promotion.targetConcerns.length > 0) && (
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">Targetowana</span>
                      )}
                    </div>
                    {promotion.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {promotion.tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 border-t px-4 py-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <p className="flex items-center gap-2"><CalendarDays size={15} /> {formatDate(promotion.startDate)} – {formatDate(promotion.endDate)}</p>
                  <p className="flex items-center gap-2 sm:justify-end"><Users size={15} /> Dopasowanych: {promotion.matchingRecipientsCount ?? 0}</p>
                  <p className="flex items-center gap-2"><Eye size={15} /> {promotion.viewCount} wyświetleń</p>
                  <p className="flex items-center gap-2 sm:justify-end"><MousePointerClick size={15} /> {promotion.clickCount} klik. · {promotion.copyCount} kopii · {promotion.saveCount} zapisów</p>
                </div>
                <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    {promotion.targetLoyaltyTiers.length > 0 ? `Poziomy: ${promotion.targetLoyaltyTiers.join(', ')}` : 'Widoczna dla wszystkich poziomów'}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button variant="ghost" size="sm" title={promotion.isFeatured ? 'Usuń wyróżnienie' : 'Wyróżnij'} onClick={() => featuredMutation.mutate({ id: promotion.id, value: !promotion.isFeatured })} className={promotion.isFeatured ? 'text-amber-600' : ''}><Star size={16} fill={promotion.isFeatured ? 'currentColor' : 'none'} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => activeMutation.mutate({ id: promotion.id, value: !promotion.isActive })}>{promotion.isActive ? 'Ukryj' : 'Pokaż'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(promotion.id)} title="Duplikuj"><CopyPlus size={16} /></Button>
                    {promotion.link && <Button asChild variant="ghost" size="sm"><a href={promotion.link} target="_blank" rel="noreferrer" title="Otwórz link"><ExternalLink size={16} /></a></Button>}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(promotion)} title="Edytuj"><Pencil size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(`Usunąć promocję „${promotion.title}”?`)) deleteMutation.mutate(promotion.id); }} title="Usuń"><Trash2 size={16} /></Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="promotion-form-title">
          <form onSubmit={submit} className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary/60">Promocja sklepowa</p>
                <h2 id="promotion-form-title" className="font-heading text-xl font-bold text-primary">{editing ? 'Edytuj promocję' : 'Nowa promocja'}</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Zamknij"><X size={20} /></button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_320px]">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nazwa sklepu / marki" required><Input required maxLength={120} value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} placeholder="np. Hebe" /></Field>
                <Field label="Wartość promocji" required><Input required maxLength={80} value={form.discountValue} onChange={(e) => setField('discountValue', e.target.value)} placeholder="np. -20% lub 2+1 gratis" /></Field>
                <Field label="Marka produktu"><Input maxLength={120} value={form.brand ?? ''} onChange={(e) => setField('brand', e.target.value)} placeholder="np. La Roche-Posay" /></Field>
                <Field label="Kategoria"><Input maxLength={80} value={form.category ?? ''} onChange={(e) => setField('category', e.target.value)} placeholder="np. SPF, oczyszczanie, makijaż" /></Field>
                <div className="sm:col-span-2"><Field label="Tytuł" required><Input required maxLength={180} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="np. -20% na pielęgnację twarzy" /></Field></div>
                <div className="sm:col-span-2"><Field label="Opis" required><textarea required maxLength={3000} rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Krótko opisz ofertę…" /></Field></div>
                <div className="sm:col-span-2"><Field label="Warunki promocji"><textarea maxLength={3000} rows={3} value={form.conditions} onChange={(e) => setField('conditions', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="np. Oferta nie łączy się z innymi rabatami" /></Field></div>
                <Field label="Kod rabatowy"><Input maxLength={80} value={form.promoCode ?? ''} onChange={(e) => setField('promoCode', e.target.value)} placeholder="np. COSMO15" /></Field>
                <Field label="Link do oferty"><Input type="url" value={form.link ?? ''} onChange={(e) => setField('link', e.target.value)} placeholder="https://…" /></Field>
                <div className="sm:col-span-2"><Field label="Tagi po przecinku"><Input value={form.tagsText} onChange={(e) => setField('tagsText', e.target.value)} placeholder="np. spf, trądzik, skóra wrażliwa" /></Field></div>
                <Field label="Początek promocji" required><Input type="datetime-local" required value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} /></Field>
                <Field label="Koniec promocji" required><Input type="datetime-local" required min={form.startDate} value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} /></Field>

                <div className="sm:col-span-2 rounded-2xl border p-4">
                  <p className="text-sm font-bold text-foreground">Personalizacja widoczności</p>
                  <p className="mt-1 text-xs text-muted-foreground">Jeśli nic nie zaznaczysz, promocja będzie widoczna dla wszystkich klientek.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <CheckboxGroup
                      label="Poziomy lojalności"
                      options={LOYALTY_OPTIONS}
                      values={form.targetLoyaltyTiers ?? []}
                      onToggle={(value) => setField('targetLoyaltyTiers', toggleArrayValue(form.targetLoyaltyTiers, value))}
                    />
                    <CheckboxGroup
                      label="Typ skóry"
                      options={SKIN_OPTIONS}
                      values={form.targetSkinTypes ?? []}
                      onToggle={(value) => setField('targetSkinTypes', toggleArrayValue(form.targetSkinTypes, value))}
                    />
                  </div>
                  <div className="mt-4">
                    <Field label="Problemy / zainteresowania skóry po przecinku">
                      <Input value={form.targetConcernsText} onChange={(e) => setField('targetConcernsText', e.target.value)} placeholder="np. przebarwienia, trądzik, odwodnienie" />
                    </Field>
                  </div>
                </div>

                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="h-4 w-4" /><span><strong className="block text-sm">Widoczna</strong><small className="text-muted-foreground">Klienci zobaczą ją w terminie promocji</small></span></label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setField('isFeatured', e.target.checked)} className="h-4 w-4" /><span><strong className="block text-sm">Wyróżniona</strong><small className="text-muted-foreground">Pokaż jako najlepszą ofertę</small></span></label>

                <div className="sm:col-span-2 rounded-2xl border border-oak/30 bg-oak/5 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={form.notifyClients} onChange={(e) => setField('notifyClients', e.target.checked)} className="mt-1 h-4 w-4" />
                    <span>
                      <strong className="flex items-center gap-2 text-sm"><Bell size={16} /> Wyślij powiadomienie po zapisie</strong>
                      <small className="text-muted-foreground">Trafi tylko do dopasowanych klientek ze zgodą marketingową.</small>
                    </span>
                  </label>
                  {form.notifyClients && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Tytuł powiadomienia"><Input maxLength={120} value={form.notificationTitle} onChange={(e) => setField('notificationTitle', e.target.value)} placeholder="Domyślnie: Nowa promocja…" /></Field>
                      <Field label="Treść powiadomienia"><Input maxLength={240} value={form.notificationBody} onChange={(e) => setField('notificationBody', e.target.value)} placeholder="Domyślna treść z tytułem i rabatem" /></Field>
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-bold text-foreground">Grafika promocji</p>
                  <label className="mt-3 flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40 text-center hover:bg-muted">
                    {imagePreview || form.imageUrl ? (
                      <img src={imagePreview || form.imageUrl || ''} alt="Podgląd promocji" className="h-full w-full object-cover" />
                    ) : (
                      <span className="space-y-2 text-sm text-muted-foreground"><Upload className="mx-auto" size={28} /> Kliknij, aby wgrać grafikę</span>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <Field label="albo URL grafiki">
                    <Input type="url" value={form.imageUrl ?? ''} onChange={(e) => { setField('imageUrl', e.target.value); setImagePreview(e.target.value); }} placeholder="https://…" />
                  </Field>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <div className="relative h-36 bg-gradient-to-br from-cream via-white to-primary/10">
                    {imagePreview || form.imageUrl ? (
                      <img src={imagePreview || form.imageUrl || ''} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Store size={42} className="text-primary/20" /></div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">{form.discountValue || '-%'}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/60">{form.storeName || 'Nazwa sklepu'}</p>
                    <h3 className="mt-1 font-heading text-lg font-bold text-espresso">{form.title || 'Tytuł promocji'}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-mink">{form.description || 'Krótki podgląd tego, jak karta będzie wyglądała u klientki.'}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Podgląd karty klienta</p>
                  </div>
                </div>
              </aside>
            </div>

            {formError && <p className="mx-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</p>}
            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-card/95 px-5 py-4 backdrop-blur">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Zapisywanie…' : editing ? 'Zapisz zmiany' : 'Dodaj promocję'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="rounded-2xl border bg-card px-5 py-4">
    <div className="flex items-center justify-between gap-3 text-muted-foreground">
      <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      {icon}
    </div>
    <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <label className="block space-y-1.5"><span className="text-sm font-semibold text-foreground">{label}{required && <span className="text-destructive"> *</span>}</span>{children}</label>
);

const CheckboxGroup = <T extends string>({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  values: T[];
  onToggle: (value: T) => void;
}) => (
  <div>
    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onToggle(option.value)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${values.includes(option.value) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

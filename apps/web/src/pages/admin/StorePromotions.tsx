import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarDays, ExternalLink, Image, Pencil, Plus, Search, Star, Store, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { StorePromotion, StorePromotionInput } from '@cosmo/shared';
import { storePromotionsApi } from '@/api/store-promotions.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PromotionForm = Omit<StorePromotionInput, 'startDate' | 'endDate'> & {
  startDate: string;
  endDate: string;
};

const toLocalInput = (date: Date | string) => {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};

const emptyForm = (): PromotionForm => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    storeName: '', title: '', description: '', conditions: '', discountValue: '',
    promoCode: '', link: '', imageUrl: '',
    startDate: toLocalInput(start), endDate: toLocalInput(end),
    isActive: true, isFeatured: false,
  };
};

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(date));

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message[0]?.message) return message[0].message as string;
  }
  return 'Nie udało się zapisać zmian. Spróbuj ponownie.';
};

export const AdminStorePromotions = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<StorePromotion | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
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
    mutationFn: (data: StorePromotionInput) => editing
      ? storePromotionsApi.update(editing.id, data)
      : storePromotionsApi.create(data),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
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

  const deleteMutation = useMutation({
    mutationFn: storePromotionsApi.remove,
    onSuccess: () => { invalidate(); toast.success('Promocja została usunięta'); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const filtered = useMemo(() => {
    const phrase = search.trim().toLocaleLowerCase('pl');
    if (!phrase) return promotions;
    return promotions.filter((item) =>
      `${item.storeName} ${item.title} ${item.discountValue}`.toLocaleLowerCase('pl').includes(phrase));
  }, [promotions, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (promotion: StorePromotion) => {
    setEditing(promotion);
    setForm({
      storeName: promotion.storeName,
      title: promotion.title,
      description: promotion.description,
      conditions: promotion.conditions,
      discountValue: promotion.discountValue,
      promoCode: promotion.promoCode ?? '',
      link: promotion.link ?? '',
      imageUrl: promotion.imageUrl ?? '',
      startDate: toLocalInput(promotion.startDate),
      endDate: toLocalInput(promotion.endDate),
      isActive: promotion.isActive,
      isFeatured: promotion.isFeatured,
    });
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
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      promoCode: form.promoCode || null,
      link: form.link || null,
      imageUrl: form.imageUrl || null,
    });
  };

  const setField = <K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Sprzedaż</p>
          <h1 className="mt-1 text-2xl font-heading font-bold text-primary sm:text-3xl">Promocje sklepowe</h1>
          <p className="mt-1 text-sm text-muted-foreground">Zarządzaj ofertami widocznymi w panelu klienta.</p>
        </div>
        <Button onClick={openCreate} className="min-h-11 gap-2 rounded-full px-5"><Plus size={18} /> Dodaj promocję</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Wszystkie', promotions.length],
          ['Widoczne', promotions.filter((item) => item.isActive).length],
          ['Wyróżnione', promotions.filter((item) => item.isFeatured).length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <label className="relative block max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj sklepu lub promocji…" className="pl-10" />
      </label>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-semibold text-destructive">Nie udało się pobrać promocji.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Spróbuj ponownie</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <Store className="mx-auto text-primary/40" size={36} />
          <p className="mt-3 font-semibold text-primary">{search ? 'Brak pasujących promocji' : 'Nie dodano jeszcze żadnej promocji'}</p>
          {!search && <Button onClick={openCreate} variant="outline" className="mt-4">Dodaj pierwszą promocję</Button>}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((promotion) => {
            const expired = new Date(promotion.endDate) < new Date();
            const upcoming = new Date(promotion.startDate) > new Date();
            return (
              <article key={promotion.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex min-h-36">
                  <div className="flex w-28 shrink-0 items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 sm:w-40">
                    {promotion.imageUrl ? <img src={promotion.imageUrl} alt={`Grafika ${promotion.storeName}`} className="h-full w-full object-cover" /> : <Image size={30} className="text-primary/30" />}
                  </div>
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary/60">{promotion.storeName}</p>
                        <h2 className="mt-1 font-heading text-lg font-bold leading-tight text-primary">{promotion.title}</h2>
                      </div>
                      <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">{promotion.discountValue}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{promotion.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={`rounded-full px-2.5 py-1 ${promotion.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{promotion.isActive ? 'Widoczna' : 'Ukryta'}</span>
                      {promotion.isFeatured && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Wyróżniona</span>}
                      {(expired || upcoming) && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">{expired ? 'Zakończona' : 'Zaplanowana'}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={15} /> {formatDate(promotion.startDate)} – {formatDate(promotion.endDate)}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button variant="ghost" size="sm" title={promotion.isFeatured ? 'Usuń wyróżnienie' : 'Wyróżnij'} onClick={() => featuredMutation.mutate({ id: promotion.id, value: !promotion.isFeatured })} className={promotion.isFeatured ? 'text-amber-600' : ''}><Star size={16} fill={promotion.isFeatured ? 'currentColor' : 'none'} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => activeMutation.mutate({ id: promotion.id, value: !promotion.isActive })}>{promotion.isActive ? 'Ukryj' : 'Pokaż'}</Button>
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
          <form onSubmit={submit} className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-5 py-4 backdrop-blur">
              <div><p className="text-xs font-bold uppercase tracking-wider text-primary/60">Promocja sklepowa</p><h2 id="promotion-form-title" className="font-heading text-xl font-bold text-primary">{editing ? 'Edytuj promocję' : 'Nowa promocja'}</h2></div>
              <button type="button" onClick={() => setFormOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Zamknij"><X size={20} /></button>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Nazwa sklepu / marki" required><Input required maxLength={120} value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} placeholder="np. Rossmann" /></Field>
              <Field label="Wartość promocji" required><Input required maxLength={80} value={form.discountValue} onChange={(e) => setField('discountValue', e.target.value)} placeholder="np. -20% lub 2+1 gratis" /></Field>
              <div className="sm:col-span-2"><Field label="Tytuł" required><Input required maxLength={180} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="np. -20% na pielęgnację twarzy" /></Field></div>
              <div className="sm:col-span-2"><Field label="Opis" required><textarea required maxLength={3000} rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Krótko opisz ofertę…" /></Field></div>
              <div className="sm:col-span-2"><Field label="Warunki promocji"><textarea maxLength={3000} rows={3} value={form.conditions} onChange={(e) => setField('conditions', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="np. Oferta nie łączy się z innymi rabatami" /></Field></div>
              <Field label="Kod rabatowy"><Input maxLength={80} value={form.promoCode ?? ''} onChange={(e) => setField('promoCode', e.target.value)} placeholder="np. COSMO15" /></Field>
              <Field label="Link do oferty"><Input type="url" value={form.link ?? ''} onChange={(e) => setField('link', e.target.value)} placeholder="https://…" /></Field>
              <div className="sm:col-span-2"><Field label="URL grafiki / logo"><Input type="url" value={form.imageUrl ?? ''} onChange={(e) => setField('imageUrl', e.target.value)} placeholder="https://…" /></Field></div>
              <Field label="Początek promocji" required><Input type="datetime-local" required value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} /></Field>
              <Field label="Koniec promocji" required><Input type="datetime-local" required min={form.startDate} value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} /></Field>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="h-4 w-4" /><span><strong className="block text-sm">Widoczna</strong><small className="text-muted-foreground">Klienci zobaczą ją w terminie promocji</small></span></label>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setField('isFeatured', e.target.checked)} className="h-4 w-4" /><span><strong className="block text-sm">Wyróżniona</strong><small className="text-muted-foreground">Pokaż jako najlepszą ofertę</small></span></label>
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

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <label className="block space-y-1.5"><span className="text-sm font-semibold text-foreground">{label}{required && <span className="text-destructive"> *</span>}</span>{children}</label>
);

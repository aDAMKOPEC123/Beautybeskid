import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { WynikPost, CreateWynikDto } from '@/types/marketing.types';
import { PLATFORM_LABELS } from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  wynik?: WynikPost | null;
}

export const WynikModal = ({ open, onClose, wynik }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateWynikDto>();

  const { data: posts = [] } = useQuery({
    queryKey: ['marketing', 'posts'],
    queryFn: () => marketingApi.getPosts({}),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      reset(wynik ? {
        postId: wynik.postId ?? '',
        title: wynik.title,
        platform: wynik.platform,
        publishedAt: wynik.publishedAt.slice(0, 10),
        reach: wynik.reach ?? undefined,
        views: wynik.views ?? undefined,
        likes: wynik.likes ?? undefined,
        comments: wynik.comments ?? undefined,
      } : {
        platform: 'IG',
        publishedAt: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, wynik, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateWynikDto) => {
      const payload = { ...data, postId: data.postId || undefined };
      return wynik
        ? marketingApi.updateWynik(wynik.id, payload)
        : marketingApi.createWynik(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'wyniki'] });
      toast.success(wynik ? 'Zapisano zmiany' : 'Dodano wynik');
      onClose();
    },
    onError: () => toast.error('Blad zapisu'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {wynik ? 'Edytuj wynik' : 'Dodaj wynik posta'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Post o laminacji - wyniki"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Platforma *</label>
                <select {...register('platform', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>).map(p => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data publikacji *</label>
                <input
                  type="date"
                  {...register('publishedAt', { required: 'Wymagane' })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
                {errors.publishedAt && <p className="text-destructive text-xs mt-1">{errors.publishedAt.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Powiazany post (opcjonalnie)</label>
              <select {...register('postId')} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">— brak —</option>
                {posts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Zasieg</label>
                <input
                  type="number"
                  {...register('reach', { valueAsNumber: true })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wyswietlen</label>
                <input
                  type="number"
                  {...register('views', { valueAsNumber: true })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Polubien</label>
                <input
                  type="number"
                  {...register('likes', { valueAsNumber: true })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Komentarzy</label>
                <input
                  type="number"
                  {...register('comments', { valueAsNumber: true })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  min={0}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border rounded-md py-2 text-sm hover:bg-accent transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Zapisuje...' : 'Zapisz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

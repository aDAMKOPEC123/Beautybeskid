import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { KaruzelaIdea, CreateKaruzelaDto } from '@/types/marketing.types';
import { CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  karuzela?: KaruzelaIdea | null;
}

export const KaruzelaIdeaModal = ({ open, onClose, karuzela }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateKaruzelaDto>();

  useEffect(() => {
    if (open) {
      reset(karuzela ? {
        title: karuzela.title,
        slideDesc: karuzela.slideDesc ?? '',
        category: karuzela.category,
        status: karuzela.status,
        plannedDate: karuzela.plannedDate ? karuzela.plannedDate.slice(0, 10) : '',
      } : {
        category: 'LAMINACJA',
        status: 'POMYSL',
      });
    }
  }, [open, karuzela, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateKaruzelaDto) =>
      karuzela ? marketingApi.updateKaruzela(karuzela.id, data) : marketingApi.createKaruzela(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'karuzele'] });
      toast.success(karuzela ? 'Zapisano zmiany' : 'Dodano pomysl');
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
            {karuzela ? 'Edytuj karuzele' : 'Nowy pomysl na karuzele'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. 5 krokow do idealnej laminacji"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Opis slajdow</label>
              <textarea
                {...register('slideDesc')}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Krotki opis poszczegolnych slajdow..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Kategoria *</label>
                <select {...register('category', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select {...register('status', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(IDEA_STATUS_LABELS) as Array<keyof typeof IDEA_STATUS_LABELS>).map(s => (
                    <option key={s} value={s}>{IDEA_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Planowana data</label>
              <input
                type="date"
                {...register('plannedDate')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
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

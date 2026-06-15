import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { NagranieItem, CreateNagranieDto } from '@/types/marketing.types';
import { NAGRANIE_STATUS_LABELS, PRIORITY_LABELS } from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  nagranie?: NagranieItem | null;
}

export const NagranieModal = ({ open, onClose, nagranie }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateNagranieDto>();

  const { data: rolki = [] } = useQuery({
    queryKey: ['marketing', 'ideas'],
    queryFn: () => marketingApi.getIdeas({}),
    enabled: open,
  });

  const { data: karuzele = [] } = useQuery({
    queryKey: ['marketing', 'karuzele'],
    queryFn: () => marketingApi.getKaruzele({}),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      reset(nagranie ? {
        title: nagranie.title,
        rolkaId: nagranie.rolkaId ?? '',
        karuzelaId: nagranie.karuzelaId ?? '',
        status: nagranie.status,
        priority: nagranie.priority,
      } : {
        status: 'DO_NAGRANIA',
        priority: 'SREDNI',
      });
    }
  }, [open, nagranie, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateNagranieDto) => {
      const payload = {
        ...data,
        rolkaId: data.rolkaId || undefined,
        karuzelaId: data.karuzelaId || undefined,
      };
      return nagranie
        ? marketingApi.updateNagranie(nagranie.id, payload)
        : marketingApi.createNagranie(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'nagrania'] });
      toast.success(nagranie ? 'Zapisano zmiany' : 'Dodano nagranie');
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
            {nagranie ? 'Edytuj nagranie' : 'Nowe nagranie'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Nagranie laminacja brwi"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select {...register('status', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(NAGRANIE_STATUS_LABELS) as Array<keyof typeof NAGRANIE_STATUS_LABELS>).map(s => (
                    <option key={s} value={s}>{NAGRANIE_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priorytet *</label>
                <select {...register('priority', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(PRIORITY_LABELS) as Array<keyof typeof PRIORITY_LABELS>).map(p => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Powiaz z rolka</label>
              <select {...register('rolkaId')} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">— brak —</option>
                {rolki.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Powiaz z karuzela</label>
              <select {...register('karuzelaId')} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">— brak —</option>
                {karuzele.map(k => (
                  <option key={k.id} value={k.id}>{k.title}</option>
                ))}
              </select>
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

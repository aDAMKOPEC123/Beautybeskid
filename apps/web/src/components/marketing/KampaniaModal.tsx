import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { Kampania, CreateKampaniaDto } from '@/types/marketing.types';
import { PLATFORM_LABELS } from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  kampania?: Kampania | null;
}

export const KampaniaModal = ({ open, onClose, kampania }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateKampaniaDto>();

  useEffect(() => {
    if (open) {
      reset(kampania ? {
        name: kampania.name,
        goal: kampania.goal ?? '',
        dateFrom: kampania.dateFrom ? kampania.dateFrom.slice(0, 10) : '',
        dateTo: kampania.dateTo ? kampania.dateTo.slice(0, 10) : '',
        platform: kampania.platform,
        notes: kampania.notes ?? '',
      } : {
        platform: 'IG',
      });
    }
  }, [open, kampania, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateKampaniaDto) =>
      kampania ? marketingApi.updateKampania(kampania.id, data) : marketingApi.createKampania(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'kampanie'] });
      toast.success(kampania ? 'Zapisano zmiany' : 'Dodano kampanie');
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
            {kampania ? 'Edytuj kampanie' : 'Nowa kampania'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nazwa *</label>
              <input
                {...register('name', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Kampania letnia 2024"
              />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Platforma *</label>
              <select {...register('platform', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {(Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>).map(p => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cel kampanii</label>
              <input
                {...register('goal')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Zwiekszyc zaangazowanie o 20%"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Data od</label>
                <input
                  type="date"
                  {...register('dateFrom')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data do</label>
                <input
                  type="date"
                  {...register('dateTo')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notatki</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Dodatkowe informacje o kampanii..."
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

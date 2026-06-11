import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { RolkaIdea, CreateIdeaDto } from '@/types/marketing.types';
import {
  CATEGORY_LABELS,
  TYPE_LABELS,
  IDEA_STATUS_LABELS,
} from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  idea?: RolkaIdea | null;
}

export const RolkaIdeaModal = ({ open, onClose, idea }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateIdeaDto>();

  useEffect(() => {
    if (open) {
      reset(idea ? {
        title: idea.title,
        hook: idea.hook ?? '',
        sceneDesc: idea.sceneDesc ?? '',
        category: idea.category,
        type: idea.type,
        audioName: idea.audioName ?? '',
        audioUrl: idea.audioUrl ?? '',
        props: idea.props ?? '',
        status: idea.status,
        plannedDate: idea.plannedDate ? idea.plannedDate.slice(0, 10) : '',
      } : {
        category: 'LAMINACJA',
        type: 'BEFORE_AFTER',
        status: 'POMYSL',
      });
    }
  }, [open, idea, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateIdeaDto) =>
      idea ? marketingApi.updateIdea(idea.id, data) : marketingApi.createIdea(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success(idea ? 'Zapisano zmiany' : 'Dodano pomysl');
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
            {idea ? 'Edytuj pomysl' : 'Nowy pomysl na rolke'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Before/after laminacja brwi"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hook (pierwsze 3 sekundy)</label>
              <input
                {...register('hook')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Nie uwierzysz w ten efekt..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Opis sceny</label>
              <textarea
                {...register('sceneDesc')}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Co sie dzieje w filmiku..."
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
                <label className="block text-sm font-medium mb-1">Typ *</label>
                <select {...register('type', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Dzwiek / trend</label>
                <input
                  {...register('audioName')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="Nazwa dzwieku"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link do audio</label>
                <input
                  {...register('audioUrl')}
                  type="url"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rekwizyty</label>
              <input
                {...register('props')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Dobre oswietlenie, biale tlo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select {...register('status', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(IDEA_STATUS_LABELS) as Array<keyof typeof IDEA_STATUS_LABELS>).map(s => (
                    <option key={s} value={s}>{IDEA_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Planowana data</label>
                <input
                  type="date"
                  {...register('plannedDate')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
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

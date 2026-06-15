import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { OpisPost, CreateOpisDto } from '@/types/marketing.types';
import { CATEGORY_LABELS } from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  opis?: OpisPost | null;
}

export const OpisModal = ({ open, onClose, opis }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateOpisDto>();

  useEffect(() => {
    if (open) {
      reset(opis ? {
        title: opis.title,
        content: opis.content,
        hashtags: opis.hashtags ?? '',
        category: opis.category,
      } : {
        category: 'LAMINACJA',
      });
    }
  }, [open, opis, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateOpisDto) =>
      opis ? marketingApi.updateOpis(opis.id, data) : marketingApi.createOpis(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'opisy'] });
      toast.success(opis ? 'Zapisano zmiany' : 'Dodano opis');
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
            {opis ? 'Edytuj opis' : 'Nowy opis posta'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Opis do posta o laminacji brwi"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Kategoria *</label>
              <select {...register('category', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tresc opisu *</label>
              <textarea
                {...register('content', { required: 'Wymagane' })}
                rows={6}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Tresc posta na social media..."
              />
              {errors.content && <p className="text-destructive text-xs mt-1">{errors.content.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hashtagi</label>
              <input
                {...register('hashtags')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="#laminacja #brwi #beauty"
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

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { ContentPost, CreatePostDto } from '@/types/marketing.types';
import {
  PLATFORM_LABELS,
  FORMAT_LABELS,
  STATUS_LABELS,
} from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  post?: ContentPost | null;
  defaultValues?: Partial<CreatePostDto>;
  ideaId?: string;
}

export const ContentPostModal = ({ open, onClose, post, defaultValues, ideaId }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePostDto>();

  useEffect(() => {
    if (open) {
      reset(post ? {
        title: post.title,
        platform: post.platform,
        format: post.format,
        scheduledAt: post.scheduledAt.slice(0, 16),
        status: post.status,
        notes: post.notes ?? '',
      } : {
        status: 'POMYSL',
        format: 'ROLKA',
        platform: 'IG',
        scheduledAt: new Date().toISOString().slice(0, 16),
        ...defaultValues,
      });
    }
  }, [open, post, defaultValues, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      if (ideaId && !post) {
        return marketingApi.scheduleIdea(ideaId, data);
      }
      if (post) return marketingApi.updatePost(post.id, data);
      return marketingApi.createPost(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] });
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success(post ? 'Zapisano zmiany' : 'Dodano publikacje');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Blad zapisu');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {post ? 'Edytuj publikacje' : 'Nowa publikacja'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Before/after laminacja"
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
                <label className="block text-sm font-medium mb-1">Format *</label>
                <select {...register('format', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(FORMAT_LABELS) as Array<keyof typeof FORMAT_LABELS>).map(f => (
                    <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data i godzina publikacji *</label>
              <input
                type="datetime-local"
                {...register('scheduledAt', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status *</label>
              <select {...register('status', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notatki</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Dodatkowe uwagi..."
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

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { homecareApi } from '@/api/homecare.api';

export function HomecareRoutinePanel({ appointmentId }: { appointmentId: string }) {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<{ first48h: string; followingDays: string; products: string } | null>(null);

  const { data: routine, isLoading, error } = useQuery({
    queryKey: ['homecare', appointmentId],
    queryFn: () => homecareApi.get(appointmentId),
    enabled: isOpen,
    retry: false,
  });

  const is404 = error && (error as any)?.response?.status === 404;

  // Init draft whenever the routine loads (use routine.id as dep to avoid object reference issues)
  const routineId = (routine as any)?.id;
  useEffect(() => {
    if (routine) {
      setDraft({ first48h: routine.first48h, followingDays: routine.followingDays, products: routine.products });
    }
  }, [routineId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: updateMutate, isPending: isUpdating } = useMutation({
    mutationFn: () => homecareApi.update(appointmentId, draft!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecare', appointmentId] });
      toast.success('Rutyna zaktualizowana');
    },
    onError: () => toast.error('Błąd aktualizacji rutyny'),
  });

  const { mutate: createDraftMutate, isPending: isCreating } = useMutation({
    mutationFn: () => homecareApi.createDraft(appointmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecare', appointmentId] });
      toast.success('Rutyna utworzona');
    },
    onError: () => toast.error('Błąd tworzenia rutyny'),
  });

  const { mutate: sendMutate, isPending: isSending } = useMutation({
    mutationFn: async () => {
      if (draft) await homecareApi.update(appointmentId, draft);
      return homecareApi.send(appointmentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecare', appointmentId] });
      toast.success('Rutyna wysłana do klientki');
    },
    onError: () => toast.error('Błąd wysyłania rutyny'),
  });

  const isSent = !!routine?.sentAt;

  return (
    <div className="border-t mt-2 pt-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
      <button
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
        Rutyna pielęgnacyjna
        {isSent && (
          <span className="text-green-600 font-semibold ml-1">
            ✓ Wysłana {format(new Date(routine!.sentAt!), 'dd.MM.yyyy HH:mm', { locale: pl })}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {isLoading && <div className="text-xs text-muted-foreground">Wczytywanie...</div>}

          {is404 && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Brak rutyny dla tej wizyty.</p>
              <button
                onClick={() => createDraftMutate()}
                disabled={isCreating}
                className="text-xs px-2.5 py-1 rounded-lg border border-input hover:bg-accent disabled:opacity-50"
              >
                {isCreating ? '...' : 'Utwórz rutynę'}
              </button>
            </div>
          )}

          {routine && draft !== null && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pierwsze 48 godzin</label>
                <textarea
                  value={draft.first48h}
                  onChange={(e) => setDraft((d) => d ? { ...d, first48h: e.target.value } : d)}
                  rows={3}
                  className="mt-0.5 w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kolejne dni</label>
                <textarea
                  value={draft.followingDays}
                  onChange={(e) => setDraft((d) => d ? { ...d, followingDays: e.target.value } : d)}
                  rows={3}
                  className="mt-0.5 w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Zalecane produkty</label>
                <textarea
                  value={draft.products}
                  onChange={(e) => setDraft((d) => d ? { ...d, products: e.target.value } : d)}
                  rows={2}
                  className="mt-0.5 w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => updateMutate()}
                  disabled={isUpdating}
                  className="text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-accent disabled:opacity-50"
                >
                  {isUpdating ? '...' : 'Zapisz'}
                </button>
                <button
                  onClick={() => sendMutate()}
                  disabled={isSending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSending ? 'Wysyłanie...' : isSent ? 'Wyślij ponownie' : 'Wyślij klientce'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

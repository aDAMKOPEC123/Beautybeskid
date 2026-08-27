import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import externalCalendarApi from '@/api/external-calendar.api';
import { RefreshCw, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AppleCalendarSettingsModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { data: source } = useQuery({
    queryKey: ['external-calendar-source'],
    queryFn: () => externalCalendarApi.getSource(),
    enabled: open,
  });

  useEffect(() => { setUrl(source?.url ?? ''); }, [source]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['external-calendar-source'] });
    qc.invalidateQueries({ queryKey: ['external-calendar-events'] });
  };

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => externalCalendarApi.saveSource({ url }),
    onSuccess: () => { setMessage('Zapisano link'); invalidate(); },
    onError: (e: any) => setMessage(e?.response?.data?.message ?? 'Nie udało się zapisać'),
  });

  const { mutate: sync, isPending: isSyncing } = useMutation({
    mutationFn: () => externalCalendarApi.syncNow(),
    onSuccess: (r) => { setMessage(`Pobrano ${r.imported} wydarzeń`); invalidate(); },
    onError: (e: any) => setMessage(e?.response?.data?.message ?? 'Synchronizacja nie powiodła się'),
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: () => externalCalendarApi.deleteSource(),
    onSuccess: () => { setUrl(''); setMessage('Odłączono kalendarz'); invalidate(); },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Kalendarz Apple</h2>
          <button className="ml-auto rounded-lg p-1 hover:bg-accent" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block text-sm">
          Link subskrypcji (webcal:// lub https://)
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="webcal://p01-calendars.icloud.com/published/..."
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
        </label>

        <details className="mb-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Skąd wziąć link?</summary>
          <ol className="ml-4 mt-2 list-decimal space-y-1">
            <li>Otwórz aplikację Kalendarz na Macu lub iPhonie.</li>
            <li>Kliknij prawym (lub „Edytuj”) na kalendarzu, który chcesz podpiąć.</li>
            <li>Włącz „Kalendarz publiczny”.</li>
            <li>Skopiuj wyświetlony link i wklej powyżej.</li>
          </ol>
          <p className="mt-2">
            Wydarzenia są tylko wyświetlane — nigdy nie blokują zapisów klientek.
            Żeby zablokować godziny, kliknij godzinę w kalendarzu i wybierz „Zablokuj godziny”.
          </p>
        </details>

        <p className="mb-3 text-xs text-muted-foreground">
          {source?.lastSyncError
            ? <span className="text-red-600">Błąd ostatniej synchronizacji: {source.lastSyncError}</span>
            : source?.lastSyncedAt
              ? `Ostatnia synchronizacja: ${new Date(source.lastSyncedAt).toLocaleString('pl-PL')}`
              : 'Jeszcze nie synchronizowano.'}
        </p>

        {message && <p className="mb-3 text-xs font-medium">{message}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          {source && (
            <button className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
              disabled={isDisconnecting} onClick={() => disconnect()}>
              Odłącz
            </button>
          )}
          <button className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm disabled:opacity-50"
            disabled={isSyncing || !source} onClick={() => sync()}>
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : undefined} />
            Synchronizuj teraz
          </button>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isSaving || !url.trim()} onClick={() => save()}>
            {isSaving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}

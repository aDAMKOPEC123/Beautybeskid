import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { NagranieModal } from '@/components/marketing/NagranieModal';
import type { NagranieItem, NagranieStatus, Priority } from '@/types/marketing.types';
import { NAGRANIE_STATUS_LABELS, PRIORITY_LABELS } from '@/types/marketing.types';

const PRIORITY_BADGE: Record<Priority, string> = {
  WYSOKI: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SREDNI: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  NISKI: 'bg-muted text-muted-foreground',
};

export const MarketingNagrania = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<NagranieItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<NagranieStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketing', 'nagrania'],
    queryFn: () => marketingApi.getNagrania({}),
  });

  const filtered = useMemo(() => items.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    return true;
  }), [items, filterStatus, filterPriority]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: NagranieStatus }) =>
      marketingApi.updateNagranie(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'nagrania'] });
    },
    onError: () => toast.error('Blad aktualizacji'),
  });

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteNagranie,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'nagrania'] });
      toast.success('Nagranie usuniete');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const handleToggleStatus = (item: NagranieItem) => {
    const newStatus: NagranieStatus = item.status === 'DO_NAGRANIA' ? 'NAGRANE' : 'DO_NAGRANIA';
    updateMutation.mutate({ id: item.id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac to nagranie?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Lista nagran</h2>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nowe nagranie
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as NagranieStatus | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie statusy</option>
          {(Object.keys(NAGRANIE_STATUS_LABELS) as NagranieStatus[]).map(s => (
            <option key={s} value={s}>{NAGRANIE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as Priority | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie priorytety</option>
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak nagran. Dodaj pierwsze!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium w-10">Status</th>
                <th className="px-4 py-3 font-medium">Tytul</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Powiazanie</th>
                <th className="px-4 py-3 font-medium">Priorytet</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={item.status === 'NAGRANE'}
                      onChange={() => handleToggleStatus(item)}
                      className="w-4 h-4 rounded cursor-pointer accent-primary"
                    />
                  </td>
                  <td className={['px-4 py-3 font-medium max-w-[200px] truncate', item.status === 'NAGRANE' ? 'line-through text-muted-foreground' : ''].join(' ')}>
                    {item.title}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {item.rolka ? (
                      <span className="text-xs">Rolka: {item.rolka.title}</span>
                    ) : item.karuzela ? (
                      <span className="text-xs">Karuzela: {item.karuzela.title}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={['px-2 py-0.5 rounded-full text-xs', PRIORITY_BADGE[item.priority]].join(' ')}>
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => { setEditing(item); setModalOpen(true); }}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        Usun
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NagranieModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        nagranie={editing}
      />
    </div>
  );
};

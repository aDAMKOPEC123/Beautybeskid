import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { TrendModal } from '@/components/marketing/TrendModal';
import type { Trend, SocialPlatform, TrendStatus } from '@/types/marketing.types';
import { PLATFORM_LABELS, TREND_STATUS_LABELS } from '@/types/marketing.types';

export const MarketingTrendy = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Trend | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | ''>('');
  const [filterStatus, setFilterStatus] = useState<TrendStatus | ''>('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketing', 'trendy'],
    queryFn: () => marketingApi.getTrendy({}),
  });

  const filtered = useMemo(() => items.filter(i => {
    if (filterPlatform && i.platform !== filterPlatform) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  }), [items, filterPlatform, filterStatus]);

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteTrend,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'trendy'] });
      toast.success('Trend usuniety');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac ten trend?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Trendy</h2>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nowy trend
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value as SocialPlatform | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie platformy</option>
          {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(p => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TrendStatus | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie statusy</option>
          {(Object.keys(TREND_STATUS_LABELS) as TrendStatus[]).map(s => (
            <option key={s} value={s}>{TREND_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak trendow. Dodaj pierwszy!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nazwa</th>
                <th className="px-4 py-3 font-medium">Platforma</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Link</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Notatki</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[180px] truncate">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {PLATFORM_LABELS[item.platform]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex items-center gap-1"
                      >
                        Link ↗
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'px-2 py-0.5 rounded-full text-xs',
                      item.status === 'AKTYWNY'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-muted text-muted-foreground',
                    ].join(' ')}>
                      {TREND_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {item.notes ?? '-'}
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

      <TrendModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        trend={editing}
      />
    </div>
  );
};

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { KampaniaModal } from '@/components/marketing/KampaniaModal';
import type { Kampania } from '@/types/marketing.types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/types/marketing.types';

export const MarketingKampanie = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Kampania | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketing', 'kampanie'],
    queryFn: marketingApi.getKampanie,
  });

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteKampania,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'kampanie'] });
      toast.success('Kampania usunieta');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac te kampanie?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pl-PL') : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Kampanie</h2>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nowa kampania
        </button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak kampanii. Dodaj pierwsza!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nazwa</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Cel</th>
                <th className="px-4 py-3 font-medium">Platforma</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Daty</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const from = formatDate(item.dateFrom);
                const to = formatDate(item.dateTo);
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      {item.goal ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                        style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                      >
                        {PLATFORM_LABELS[item.platform]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {from && to ? `${from} - ${to}` : from ?? to ?? '-'}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <KampaniaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        kampania={editing}
      />
    </div>
  );
};

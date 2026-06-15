import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { KaruzelaIdeaModal } from '@/components/marketing/KaruzelaIdeaModal';
import { ContentPostModal } from '@/components/marketing/ContentPostModal';
import type { KaruzelaIdea, IdeaCategory, IdeaStatus } from '@/types/marketing.types';
import { CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/marketing.types';

export const MarketingKaruzele = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<KaruzelaIdea | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState<KaruzelaIdea | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<IdeaCategory | ''>('');
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | ''>('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketing', 'karuzele'],
    queryFn: () => marketingApi.getKaruzele({}),
  });

  const filtered = useMemo(() => items.filter(i => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  }), [items, filterCategory, filterStatus]);

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteKaruzela,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'karuzele'] });
      toast.success('Pomysl usuniety');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac ten pomysl?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Bank pomyslow na karuzele</h2>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nowy pomysl
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as IdeaCategory | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie kategorie</option>
          {(Object.keys(CATEGORY_LABELS) as IdeaCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as IdeaStatus | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie statusy</option>
          {(Object.keys(IDEA_STATUS_LABELS) as IdeaStatus[]).map(s => (
            <option key={s} value={s}>{IDEA_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak pomyslow. Dodaj pierwszy!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tytul</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Opis slajdow</th>
                <th className="px-4 py-3 font-medium">Kategoria</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Zaplanowana</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {item.slideDesc ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {IDEA_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {item.plannedDate
                      ? new Date(item.plannedDate).toLocaleDateString('pl-PL')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!item.post && (
                        <button
                          onClick={() => { setScheduling(item); setScheduleOpen(true); }}
                          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Zaplanuj
                        </button>
                      )}
                      {item.post && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Zaplanowana
                        </span>
                      )}
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

      <KaruzelaIdeaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        karuzela={editing}
      />

      <ContentPostModal
        open={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setScheduling(null); }}
        ideaId={scheduling?.id}
        defaultValues={{
          title: scheduling?.title,
          format: 'KARUZELA',
          platform: 'IG',
          status: 'POMYSL',
        }}
      />
    </div>
  );
};

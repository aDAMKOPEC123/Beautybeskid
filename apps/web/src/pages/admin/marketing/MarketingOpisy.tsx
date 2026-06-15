import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { OpisModal } from '@/components/marketing/OpisModal';
import type { OpisPost, IdeaCategory } from '@/types/marketing.types';
import { CATEGORY_LABELS } from '@/types/marketing.types';

export const MarketingOpisy = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OpisPost | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<IdeaCategory | ''>('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketing', 'opisy'],
    queryFn: () => marketingApi.getOpisy({}),
  });

  const filtered = useMemo(() => items.filter(i => {
    if (filterCategory && i.category !== filterCategory) return false;
    return true;
  }), [items, filterCategory]);

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteOpis,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'opisy'] });
      toast.success('Opis usuniety');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac ten opis?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopy = (item: OpisPost) => {
    const text = item.hashtags
      ? `${item.content}\n\n${item.hashtags}`
      : item.content;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Skopiowano do schowka');
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Bank opisow postow</h2>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nowy opis
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
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak opisow. Dodaj pierwszy!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tytul</th>
                <th className="px-4 py-3 font-medium">Kategoria</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Fragment</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[180px] truncate">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[280px] truncate">
                    {item.content.slice(0, 60)}{item.content.length > 60 ? '...' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleCopy(item)}
                        className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        Kopiuj
                      </button>
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

      <OpisModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        opis={editing}
      />
    </div>
  );
};

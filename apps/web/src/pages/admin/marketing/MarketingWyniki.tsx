import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { WynikModal } from '@/components/marketing/WynikModal';
import type { WynikPost, SocialPlatform } from '@/types/marketing.types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/types/marketing.types';

export const MarketingWyniki = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<WynikPost | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | ''>('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketing', 'wyniki'],
    queryFn: () => marketingApi.getWyniki({}),
  });

  const filtered = filterPlatform
    ? items.filter(i => i.platform === filterPlatform)
    : items;

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteWynik,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'wyniki'] });
      toast.success('Wynik usuniety');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac ten wynik?')) {
      deleteMutation.mutate(id);
    }
  };

  const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString('pl-PL') : '-';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Wyniki postow</h2>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Dodaj wynik
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
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak wynikow. Dodaj pierwszy!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tytul / Post</th>
                <th className="px-4 py-3 font-medium">Platforma</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Data</th>
                <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Zasieg</th>
                <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Wyswietlen</th>
                <th className="px-4 py-3 font-medium text-right">Polubien</th>
                <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Komentarzy</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium max-w-[180px] truncate">{item.title}</div>
                    {item.post && (
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{item.post.title}</div>
                    )}
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
                    {new Date(item.publishedAt).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{fmt(item.reach)}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{fmt(item.views)}</td>
                  <td className="px-4 py-3 text-right">{fmt(item.likes)}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{fmt(item.comments)}</td>
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

      <WynikModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        wynik={editing}
      />
    </div>
  );
};

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { RolkaIdeaModal } from '@/components/marketing/RolkaIdeaModal';
import { ContentPostModal } from '@/components/marketing/ContentPostModal';
import type { RolkaIdea, IdeaCategory, IdeaType, IdeaStatus } from '@/types/marketing.types';
import {
  CATEGORY_LABELS,
  TYPE_LABELS,
  IDEA_STATUS_LABELS,
} from '@/types/marketing.types';

export const MarketingRolki = () => {
  const qc = useQueryClient();
  const [editingIdea, setEditingIdea] = useState<RolkaIdea | null>(null);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [schedulingIdea, setSchedulingIdea] = useState<RolkaIdea | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<IdeaCategory | ''>('');
  const [filterType, setFilterType] = useState<IdeaType | ''>('');
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | ''>('');

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['marketing', 'ideas'],
    queryFn: () => marketingApi.getIdeas({}),
  });

  const filtered = useMemo(() => ideas.filter(i => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (filterType && i.type !== filterType) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  }), [ideas, filterCategory, filterType, filterStatus]);

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteIdea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success('Pomysl usuniety');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const duplicateMutation = useMutation({
    mutationFn: marketingApi.duplicateIdea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success('Pomysl zduplikowany');
    },
    onError: () => toast.error('Blad duplikowania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac ten pomysl?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Bank pomyslow na rolki</h2>
        <button
          onClick={() => { setEditingIdea(null); setIdeaModalOpen(true); }}
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
          value={filterType}
          onChange={e => setFilterType(e.target.value as IdeaType | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie typy</option>
          {(Object.keys(TYPE_LABELS) as IdeaType[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
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
                <th className="px-4 py-3 font-medium hidden md:table-cell">Hook</th>
                <th className="px-4 py-3 font-medium">Kategoria</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Typ</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Zaplanowana</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((idea) => (
                <tr key={idea.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{idea.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {idea.hook ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {CATEGORY_LABELS[idea.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {TYPE_LABELS[idea.type]}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {IDEA_STATUS_LABELS[idea.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {idea.plannedDate
                      ? new Date(idea.plannedDate).toLocaleDateString('pl-PL')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!idea.post && (
                        <button
                          onClick={() => { setSchedulingIdea(idea); setScheduleModalOpen(true); }}
                          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Zaplanuj
                        </button>
                      )}
                      {idea.post && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Zaplanowana
                        </span>
                      )}
                      <button
                        onClick={() => duplicateMutation.mutate(idea.id)}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Duplikuj
                      </button>
                      <button
                        onClick={() => { setEditingIdea(idea); setIdeaModalOpen(true); }}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
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

      <RolkaIdeaModal
        open={ideaModalOpen}
        onClose={() => { setIdeaModalOpen(false); setEditingIdea(null); }}
        idea={editingIdea}
      />

      <ContentPostModal
        open={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setSchedulingIdea(null); }}
        ideaId={schedulingIdea?.id}
        defaultValues={{
          title: schedulingIdea?.title,
          format: 'ROLKA',
          platform: 'IG',
          status: 'POMYSL',
        }}
      />
    </div>
  );
};

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import {
  Sparkles, Plus, Trash2, ChevronDown, ChevronUp,
  ExternalLink, Eye, EyeOff, Upload, X, Link2,
  Users, Pencil, Check, Save,
} from 'lucide-react';
import { beautyPlanApi, type BeautyPlan, type PlanSection, type PlanExternalLink } from '@/api/beauty-plan.api';
import { api } from '@/lib/axios';
import { v4 as uuidv4 } from 'uuid';

type UserItem = { id: string; name: string; email: string; avatarPath?: string | null };

function errMsg(e: unknown, fallback: string) {
  if (isAxiosError(e)) return e.response?.data?.message ?? fallback;
  return fallback;
}

// ─── User selector ────────────────────────────────────────────────────────────

function UserSelector({
  selected,
  onSelect,
}: {
  selected: UserItem | null;
  onSelect: (u: UserItem) => void;
}) {
  const [search, setSearch] = useState('');

  const { data: users = [] } = useQuery<UserItem[]>({
    queryKey: ['users', 'list'],
    queryFn: () =>
      api.get('/users').then((r) => {
        const d = r.data?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.users)) return d.users;
        return [];
      }),
  });

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Wybierz użytkownika</p>
      <input
        type="text"
        placeholder="Szukaj po nazwie lub e-mailu..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
        style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
      />
      <div className="max-h-64 overflow-y-auto space-y-1 rounded-xl border p-2">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
              selected?.id === u.id ? 'text-foreground' : 'hover:bg-accent'
            }`}
            style={selected?.id === u.id ? { background: 'rgba(196,150,90,0.1)' } : {}}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'rgba(196,150,90,0.15)', color: '#C4965A' }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            {selected?.id === u.id && (
              <Check size={14} className="ml-auto shrink-0" style={{ color: '#C4965A' }} />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Brak wyników</p>
        )}
      </div>
    </div>
  );
}

// ─── Section editor ───────────────────────────────────────────────────────────

function SectionEditor({
  section,
  index,
  planId,
  onGetOrCreatePlanId,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: PlanSection;
  index: number;
  planId: string | undefined;
  onGetOrCreatePlanId: () => Promise<string | null>;
  onChange: (s: PlanSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      // If no plan exists yet, auto-save as draft first
      const id = planId ?? (await onGetOrCreatePlanId());
      if (!id) {
        toast.error('Nie udało się zapisać planu przed dodaniem zdjęcia');
        return;
      }
      const imagePath = await beautyPlanApi.uploadSectionImage(id, section.id, file);
      onChange({ ...section, imageUrl: imagePath });
      toast.success('Zdjęcie dodane');
    } catch {
      toast.error('Błąd przesyłania zdjęcia');
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    if (!newLink.label || !newLink.url) return;
    onChange({ ...section, externalLinks: [...(section.externalLinks ?? []), { ...newLink }] });
    setNewLink({ label: '', url: '' });
    setShowLinkForm(false);
  };

  const removeLink = (i: number) => {
    onChange({ ...section, externalLinks: (section.externalLinks ?? []).filter((_, idx) => idx !== i) });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(196,150,90,0.2)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(196,150,90,0.05)' }}>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: 'rgba(196,150,90,0.15)', color: '#C4965A' }}
        >
          {index + 1}
        </div>
        <span className="flex-1 text-sm font-medium truncate">{section.title || 'Sekcja bez tytułu'}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
            title="Przesuń wyżej"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
            title="Przesuń niżej"
          >
            <ChevronDown size={14} />
          </button>
          <button onClick={() => setExpanded((e) => !e)} className="p-1 rounded hover:bg-accent transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
              Tytuł sekcji
            </label>
            <input
              type="text"
              value={section.title}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
              placeholder="np. Poranna pielęgnacja"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
              Treść / Opis
            </label>
            <textarea
              value={section.content}
              onChange={(e) => onChange({ ...section, content: e.target.value })}
              rows={4}
              placeholder="Opisz szczegółowe zalecenia dla tej sekcji..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
              Zdjęcie sekcji
            </label>
            {section.imageUrl ? (
              <div className="relative group">
                <img src={section.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => onChange({ ...section, imageUrl: undefined })}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary/40 transition-colors disabled:opacity-60"
                style={{ borderColor: 'rgba(196,150,90,0.25)' }}
              >
                {uploading ? (
                  <span className="text-xs">Przesyłanie...</span>
                ) : (
                  <>
                    <Upload size={18} className="opacity-50" />
                    <span>Kliknij aby dodać zdjęcie</span>
                    <span className="text-xs opacity-60">(plan zostanie zapisany automatycznie jeśli potrzeba)</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </div>

          {/* External links */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
              Linki zewnętrzne
            </label>
            <div className="space-y-2">
              {(section.externalLinks ?? []).map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg text-sm"
                  style={{ background: 'rgba(196,150,90,0.05)', border: '1px solid rgba(196,150,90,0.15)' }}
                >
                  <ExternalLink size={12} style={{ color: '#C4965A', flexShrink: 0 }} />
                  <span className="flex-1 truncate font-medium">{link.label}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{link.url}</span>
                  <button onClick={() => removeLink(i)} className="shrink-0 p-1 hover:text-destructive transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {showLinkForm ? (
                <div className="space-y-2 p-3 rounded-lg" style={{ border: '1px dashed rgba(196,150,90,0.3)' }}>
                  <input
                    type="text"
                    placeholder="Etykieta (np. Krem z SPF 50)"
                    value={newLink.label}
                    onChange={(e) => setNewLink((l) => ({ ...l, label: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
                  />
                  <input
                    type="url"
                    placeholder="URL (https://...)"
                    value={newLink.url}
                    onChange={(e) => setNewLink((l) => ({ ...l, url: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addLink}
                      className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white"
                      style={{ background: '#C4965A' }}
                    >
                      Dodaj link
                    </button>
                    <button
                      onClick={() => setShowLinkForm(false)}
                      className="px-3 py-1.5 rounded-md text-xs hover:bg-accent transition-colors"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkForm(true)}
                  className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ color: '#C4965A' }}
                >
                  <Link2 size={12} />
                  Dodaj link
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plan form ────────────────────────────────────────────────────────────────

function PlanForm({
  userId,
  existingPlan,
  onSaved,
}: {
  userId: string;
  existingPlan: BeautyPlan | null;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(existingPlan?.title ?? '');
  const [intro, setIntro] = useState(existingPlan?.intro ?? '');
  const [sections, setSections] = useState<PlanSection[]>((existingPlan?.sections as PlanSection[]) ?? []);
  const [generalLinks, setGeneralLinks] = useState<PlanExternalLink[]>((existingPlan?.externalLinks as PlanExternalLink[]) ?? []);
  const [newGlobalLink, setNewGlobalLink] = useState({ label: '', url: '' });
  const [showGlobalLinkForm, setShowGlobalLinkForm] = useState(false);
  // Tracks plan ID after auto-save (draft) or after create
  const [savedPlanId, setSavedPlanId] = useState<string | undefined>(existingPlan?.id);

  const createMut = useMutation({
    mutationFn: (data: { title: string; intro?: string; sections: PlanSection[]; externalLinks: PlanExternalLink[] }) =>
      beautyPlanApi.create(userId, data),
    onSuccess: (plan) => {
      setSavedPlanId(plan.id);
      qc.invalidateQueries({ queryKey: ['beauty-plans'] });
    },
    onError: (e) => toast.error(errMsg(e, 'Błąd tworzenia planu')),
  });

  const updateMut = useMutation({
    mutationFn: (data: { title?: string; intro?: string; sections?: PlanSection[]; externalLinks?: PlanExternalLink[] }) =>
      beautyPlanApi.update(savedPlanId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beauty-plans'] });
    },
    onError: (e) => toast.error(errMsg(e, 'Błąd zapisu')),
  });

  // Called by SectionEditor when user tries to upload image before plan is saved
  const getOrCreatePlanId = async (): Promise<string | null> => {
    if (savedPlanId) return savedPlanId;
    if (!title.trim()) {
      toast.error('Podaj najpierw tytuł planu, aby można było zapisać szkic');
      return null;
    }
    try {
      const plan = await beautyPlanApi.create(userId, {
        title,
        intro: intro || undefined,
        sections,
        externalLinks: generalLinks,
      });
      setSavedPlanId(plan.id);
      qc.invalidateQueries({ queryKey: ['beauty-plans'] });
      toast.success('Plan zapisany jako szkic — możesz teraz dodać zdjęcie');
      return plan.id;
    } catch (e) {
      toast.error(errMsg(e, 'Błąd autozapisu planu'));
      return null;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Podaj tytuł planu');
      return;
    }
    const payload = { title, intro: intro || undefined, sections, externalLinks: generalLinks };
    if (savedPlanId) {
      await updateMut.mutateAsync(payload);
      toast.success(existingPlan ? 'Plan zaktualizowany' : 'Plan zapisany');
    } else {
      await createMut.mutateAsync(payload);
      toast.success('Beauty plan utworzony');
    }
    onSaved();
  };

  const addSection = () =>
    setSections((s) => [...s, { id: uuidv4(), title: '', content: '', externalLinks: [] }]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSections((s) => {
      const arr = [...s];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      return arr;
    });
  };

  const addGlobalLink = () => {
    if (!newGlobalLink.label || !newGlobalLink.url) return;
    setGeneralLinks((l) => [...l, { ...newGlobalLink }]);
    setNewGlobalLink({ label: '', url: '' });
    setShowGlobalLinkForm(false);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Draft notice */}
      {savedPlanId && !existingPlan && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(196,150,90,0.08)', border: '1px solid rgba(196,150,90,0.2)', color: '#C4965A' }}
        >
          <Save size={12} />
          Szkic zapisany automatycznie — możesz teraz dodawać zdjęcia do sekcji
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
          Tytuł planu *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="np. Indywidualny program nawilżenia i regeneracji"
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
        />
      </div>

      {/* Intro */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
          Wstęp / Opis ogólny
        </label>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={4}
          placeholder="Wprowadzenie do planu, ogólna charakterystyka skóry klientki, cel kuracji..."
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
        />
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sekcje zaleceń ({sections.length})
          </label>
          <button
            onClick={addSection}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
          >
            <Plus size={13} />
            Dodaj sekcję
          </button>
        </div>
        <div className="space-y-3">
          {sections.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              index={i}
              planId={savedPlanId}
              onGetOrCreatePlanId={getOrCreatePlanId}
              onChange={(updated) => setSections((arr) => arr.map((x, idx) => (idx === i ? updated : x)))}
              onDelete={() => setSections((arr) => arr.filter((_, idx) => idx !== i))}
              onMoveUp={() => moveSection(i, 'up')}
              onMoveDown={() => moveSection(i, 'down')}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
            />
          ))}
          {sections.length === 0 && (
            <div
              className="py-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted-foreground"
              style={{ borderColor: 'rgba(196,150,90,0.2)' }}
            >
              <Sparkles size={22} className="opacity-30" />
              <span>Dodaj pierwszą sekcję zaleceń</span>
            </div>
          )}
        </div>
      </div>

      {/* General links */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ogólne linki do zasobów
          </label>
        </div>
        <div className="space-y-2">
          {generalLinks.map((link, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(196,150,90,0.05)', border: '1px solid rgba(196,150,90,0.15)' }}
            >
              <ExternalLink size={12} style={{ color: '#C4965A' }} />
              <span className="flex-1 font-medium truncate">{link.label}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{link.url}</span>
              <button
                onClick={() => setGeneralLinks((l) => l.filter((_, idx) => idx !== i))}
                className="p-1 hover:text-destructive transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {showGlobalLinkForm ? (
            <div className="space-y-2 p-3 rounded-lg" style={{ border: '1px dashed rgba(196,150,90,0.3)' }}>
              <input
                type="text"
                placeholder="Etykieta"
                value={newGlobalLink.label}
                onChange={(e) => setNewGlobalLink((l) => ({ ...l, label: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={newGlobalLink.url}
                onChange={(e) => setNewGlobalLink((l) => ({ ...l, url: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(196,150,90,0.4)' } as React.CSSProperties}
              />
              <div className="flex gap-2">
                <button
                  onClick={addGlobalLink}
                  className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white"
                  style={{ background: '#C4965A' }}
                >
                  Dodaj
                </button>
                <button
                  onClick={() => setShowGlobalLinkForm(false)}
                  className="px-3 py-1.5 rounded-md text-xs hover:bg-accent transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowGlobalLinkForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#C4965A' }}
            >
              <Link2 size={12} />
              Dodaj link
            </button>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C4965A 0%, #a8793d 100%)' }}
        >
          <Save size={15} />
          {isSaving
            ? 'Zapisywanie...'
            : savedPlanId && !existingPlan
            ? 'Zaktualizuj i zamknij'
            : existingPlan
            ? 'Zaktualizuj plan'
            : 'Utwórz plan'}
        </button>
      </div>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: BeautyPlan; onEdit: (p: BeautyPlan) => void }) {
  const qc = useQueryClient();
  const sections = (plan.sections as PlanSection[]) ?? [];

  const togglePublish = useMutation({
    mutationFn: () => beautyPlanApi.update(plan.id, { isPublished: !plan.isPublished }),
    onSuccess: () => {
      toast.success(plan.isPublished ? 'Plan ukryty' : 'Plan opublikowany — klientka może go teraz zobaczyć');
      qc.invalidateQueries({ queryKey: ['beauty-plans'] });
    },
    onError: (e) => toast.error(errMsg(e, 'Błąd')),
  });

  const deleteMut = useMutation({
    mutationFn: () => beautyPlanApi.delete(plan.id),
    onSuccess: () => {
      toast.success('Plan usunięty');
      qc.invalidateQueries({ queryKey: ['beauty-plans'] });
    },
    onError: (e) => toast.error(errMsg(e, 'Błąd usuwania')),
  });

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'var(--card)',
        border: `1px solid ${plan.isPublished ? 'rgba(196,150,90,0.3)' : 'rgba(0,0,0,0.08)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
        >
          {plan.user?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{plan.user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{plan.user?.email}</p>
        </div>
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={
            plan.isPublished
              ? { background: 'rgba(196,150,90,0.15)', color: '#C4965A' }
              : { background: 'rgba(0,0,0,0.06)', color: 'var(--muted-foreground)' }
          }
        >
          {plan.isPublished ? 'Opublikowany' : 'Szkic'}
        </span>
      </div>

      <div>
        <p className="text-[13px] font-semibold leading-snug">{plan.title}</p>
        {plan.intro && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.intro}</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles size={11} style={{ color: '#C4965A' }} />
        <span>{sections.length} sekcji</span>
        <span className="opacity-30">·</span>
        <span>
          {new Date(plan.updatedAt).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onEdit(plan)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-accent"
          style={{ border: '1px solid rgba(0,0,0,0.1)' }}
        >
          <Pencil size={12} />
          Edytuj
        </button>
        <button
          onClick={() => togglePublish.mutate()}
          disabled={togglePublish.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={
            plan.isPublished
              ? { border: '1px solid rgba(196,150,90,0.3)', color: '#C4965A', background: 'rgba(196,150,90,0.08)' }
              : { border: '1px solid rgba(196,150,90,0.3)', color: '#C4965A' }
          }
        >
          {plan.isPublished ? <EyeOff size={12} /> : <Eye size={12} />}
          {plan.isPublished ? 'Ukryj' : 'Opublikuj'}
        </button>
        <button
          onClick={() => {
            if (confirm(`Usunąć beauty plan dla ${plan.user?.name}?`)) deleteMut.mutate();
          }}
          disabled={deleteMut.isPending}
          className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
          style={{ border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminBeautyPlans() {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<BeautyPlan | null>(null);

  const { data: plans = [], isLoading } = useQuery<BeautyPlan[]>({
    queryKey: ['beauty-plans'],
    queryFn: beautyPlanApi.getAll,
  });

  const handleEdit = (plan: BeautyPlan) => {
    setEditingPlan(plan);
    setMode('edit');
  };

  const handleBack = () => {
    setMode('list');
    setEditingPlan(null);
    setSelectedUser(null);
  };

  if (mode === 'create') {
    return (
      <div className="space-y-6 animate-enter">
        <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Powrót
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Nowy Beauty Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">Utwórz spersonalizowany plan dla klientki</p>
        </div>

        {!selectedUser ? (
          <UserSelector selected={selectedUser} onSelect={setSelectedUser} />
        ) : (
          <div className="space-y-6">
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(196,150,90,0.08)', border: '1px solid rgba(196,150,90,0.2)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: 'rgba(196,150,90,0.2)', color: '#C4965A' }}
              >
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{selectedUser.name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:opacity-60 transition-opacity">
                <X size={14} />
              </button>
            </div>
            <PlanForm userId={selectedUser.id} existingPlan={null} onSaved={handleBack} />
          </div>
        )}
      </div>
    );
  }

  if (mode === 'edit' && editingPlan) {
    return (
      <div className="space-y-6 animate-enter">
        <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Powrót
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Edytuj Beauty Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan dla: <strong>{editingPlan.user?.name}</strong>
          </p>
        </div>
        <PlanForm userId={editingPlan.userId} existingPlan={editingPlan} onSaved={handleBack} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Beauty Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">Spersonalizowane plany pielęgnacji dla klientek</p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #C4965A 0%, #a8793d 100%)' }}
        >
          <Plus size={16} />
          Nowy plan
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(196,150,90,0.08)' }}
          >
            <Users size={28} className="opacity-30" style={{ color: '#C4965A' }} />
          </div>
          <p className="text-muted-foreground text-sm">Brak beauty planów. Utwórz pierwszy dla klientki.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

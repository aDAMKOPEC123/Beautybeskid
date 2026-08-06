import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';

type InstructorForm = {
  slug: string;
  name: string;
  title: string;
  shortBio: string;
  fullBio: string;
  credentials: string;
  photoUrl: string;
  isActive: boolean;
  displayOrder: number;
};

const EMPTY: InstructorForm = {
  slug: '', name: '', title: '', shortBio: '', fullBio: '',
  credentials: '', photoUrl: '', isActive: true, displayOrder: 0,
};

const input = 'w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

export function AdminInstructors() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: string | null; form: InstructorForm } | null>(null);

  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ['admin', 'academy', 'instructors'],
    queryFn: academyApi.adminGetInstructors,
  });

  const close = () => setEditing(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'instructors'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const { id, form } = editing!;
      const payload = {
        ...form,
        credentials: form.credentials.split(',').map((value) => value.trim()).filter(Boolean),
        photoUrl: form.photoUrl.trim() || null,
      };
      return id ? academyApi.adminUpdateInstructor(id, payload) : academyApi.adminCreateInstructor(payload);
    },
    onSuccess: () => { toast.success('Zapisano prowadzącą'); refresh(); close(); },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Nie udało się zapisać'),
  });

  const deleteMutation = useMutation({
    mutationFn: academyApi.adminDeleteInstructor,
    onSuccess: (result: any) => {
      toast.success(result?.isActive === false ? 'Prowadząca ma przypisane kursy — została dezaktywowana' : 'Prowadząca usunięta');
      refresh();
    },
  });

  const startEdit = (person: any) => setEditing({
    id: person.id,
    form: {
      slug: person.slug, name: person.name, title: person.title,
      shortBio: person.shortBio, fullBio: person.fullBio,
      credentials: (person.credentials ?? []).join(', '),
      photoUrl: person.photoUrl ?? '',
      isActive: person.isActive, displayOrder: person.displayOrder,
    },
  });

  const set = (patch: Partial<InstructorForm>) =>
    setEditing((prev) => prev && { ...prev, form: { ...prev.form, ...patch } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Prowadzące widoczne na stronach sprzedażowych Akademii. Kurs bez przypisanej osoby nie pokaże sekcji autorytetu.
        </p>
        <button onClick={() => setEditing({ id: null, form: EMPTY })}
          className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">
          <Plus className="w-4 h-4"/>Dodaj
        </button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Wczytywanie…</p> : (
        <div className="space-y-2">
          {(instructors as any[]).map((person) => (
            <div key={person.id} className="flex items-center gap-3 border rounded-lg p-3">
              {person.photoUrl
                ? <img src={person.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover"/>
                : <div className="w-11 h-11 rounded-full bg-muted grid place-items-center text-xs text-muted-foreground">brak</div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {person.name}
                  {!person.isActive && <span className="ml-2 text-xs text-muted-foreground">(nieaktywna)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{person.title} · {person._count?.courses ?? 0} kursów</p>
              </div>
              <button onClick={() => startEdit(person)} className="p-2 rounded hover:bg-accent" title="Edytuj">
                <Pencil className="w-4 h-4"/>
              </button>
              <button onClick={() => deleteMutation.mutate(person.id)} className="p-2 rounded hover:bg-accent text-destructive" title="Usuń">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          ))}
          {!instructors.length && <p className="text-sm text-muted-foreground">Brak prowadzących.</p>}
        </div>
      )}

      {editing && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{editing.id ? 'Edytuj prowadzącą' : 'Nowa prowadząca'}</h3>
            <button onClick={close} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4"/></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Imię i nazwisko</label>
              <input className={input} value={editing.form.name} onChange={(e) => set({ name: e.target.value })}/>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Adres (slug)</label>
              <input className={`${input} font-mono`} value={editing.form.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="imie-nazwisko"/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tytuł zawodowy</label>
              <input className={input} value={editing.form.title} onChange={(e) => set({ title: e.target.value })} placeholder="magister kosmetologii"/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Krótki opis (karty kursów, sekcja na stronie głównej)</label>
              <textarea rows={3} className={input} value={editing.form.shortBio} onChange={(e) => set({ shortBio: e.target.value })}/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pełne bio (strona kursu)</label>
              <textarea rows={6} className={input} value={editing.form.fullBio} onChange={(e) => set({ fullBio: e.target.value })}/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kwalifikacje (oddzielone przecinkami)</label>
              <input className={input} value={editing.form.credentials} onChange={(e) => set({ credentials: e.target.value })}
                placeholder="mgr kosmetologii, 5 lat praktyki"/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Adres zdjęcia</label>
              <input className={input} value={editing.form.photoUrl} onChange={(e) => set({ photoUrl: e.target.value })} placeholder="/uploads/..."/>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kolejność</label>
              <input type="number" className={input} value={editing.form.displayOrder}
                onChange={(e) => set({ displayOrder: parseInt(e.target.value) || 0 })}/>
            </div>
            <label className="flex items-center gap-2 text-sm self-end pb-2">
              <input type="checkbox" checked={editing.form.isActive} onChange={(e) => set({ isActive: e.target.checked })}/>
              Aktywna
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-60">
              {saveMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}
            </button>
            <button onClick={close} className="border rounded-md px-4 py-2 text-sm">Anuluj</button>
          </div>
        </div>
      )}
    </div>
  );
}

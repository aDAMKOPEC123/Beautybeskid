import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Plus, Trash2, UserRound } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { AdminHelp, HelpField } from '@/components/AdminHelp';

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const emptyDraft = {
  slug: '',
  name: '',
  title: '',
  shortBio: '',
  fullBio: '',
  credentialsText: '',
  photoUrl: '',
  isActive: true,
  displayOrder: 0,
};

export function AdminInstructors() {
  const client = useQueryClient();
  const { data: instructors = [], isLoading } = useQuery({ queryKey: ['academy', 'instructors'], queryFn: academyApi.adminGetInstructors });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const refresh = () => client.invalidateQueries({ queryKey: ['academy', 'instructors'] });

  const payload = () => ({
    slug: draft.slug.trim() || slugify(draft.name),
    name: draft.name.trim(),
    title: draft.title.trim(),
    shortBio: draft.shortBio.trim(),
    fullBio: draft.fullBio.trim(),
    credentials: draft.credentialsText.split('\n').map((line) => line.trim()).filter(Boolean),
    photoUrl: draft.photoUrl.trim(),
    isActive: draft.isActive,
    displayOrder: Number(draft.displayOrder) || 0,
  });

  const save = useMutation({
    mutationFn: () => (editingId ? academyApi.adminUpdateInstructor(editingId, payload()) : academyApi.adminCreateInstructor(payload())),
    onSuccess: () => {
      toast.success(editingId ? 'Dane prowadzącej zapisane' : 'Prowadząca dodana');
      setEditingId(null);
      setDraft(emptyDraft);
      refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Nie udało się zapisać'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteInstructor(id),
    onSuccess: () => { toast.success('Gotowe — sprawdź listę poniżej'); refresh(); },
    onError: () => toast.error('Nie udało się usunąć'),
  });

  const edit = (instructor: any) => {
    setEditingId(instructor.id);
    setDraft({
      slug: instructor.slug ?? '',
      name: instructor.name ?? '',
      title: instructor.title ?? '',
      shortBio: instructor.shortBio ?? '',
      fullBio: instructor.fullBio ?? '',
      credentialsText: (instructor.credentials ?? []).join('\n'),
      photoUrl: instructor.photoUrl ?? '',
      isActive: instructor.isActive !== false,
      displayOrder: instructor.displayOrder ?? 0,
    });
  };

  if (isLoading) return <div className="academy-loading">Ładujemy prowadzące…</div>;

  return (
    <div className="analytics-page">
      <header className="analytics-head">
        <div>
          <p className="academy-kicker text-caramel">Zespół</p>
          <h1>Prowadzące</h1>
          <p>Osoby, których nazwisko widnieje przy kursach i na stronach sprzedażowych.</p>
        </div>
      </header>

      <AdminHelp
        title="Po co jest ta zakładka"
        steps={[
          'Kliknij „Dodaj nową prowadzącą” albo wybierz istniejącą z listy po prawej.',
          'Wypełnij imię i nazwisko, tytuł zawodowy oraz krótki opis — to trzy pola obowiązkowe.',
          'Dodaj pełne bio i kwalifikacje, jeśli chcesz, żeby kursantki zobaczyły więcej na stronie kursu.',
          'Kliknij „Zapisz”. Prowadząca pojawi się do wyboru przy kursach w zakładce „Kursy i programy”.',
        ]}
      >
        Tutaj tworzysz wizytówki osób prowadzących kursy. Kursantka widzi je na stronie kursu — zdjęcie,
        tytuł zawodowy i opis budują zaufanie przed zakupem. Jedna prowadząca może mieć wiele kursów.
      </AdminHelp>

      <div className="admin-two-columns">
        <section className="analytics-card">
          <div className="analytics-card-title">
            <div>
              <strong>{editingId ? 'Edytujesz prowadzącą' : 'Nowa prowadząca'}</strong>
              <span>{editingId ? 'Zmiany zobaczysz na stronie kursu od razu po zapisaniu' : 'Wypełnij trzy pierwsze pola — reszta jest opcjonalna'}</span>
            </div>
            <UserRound />
          </div>

          <div className="admin-form-grid">
            <HelpField label="Imię i nazwisko *" hint="Tak, jak ma być podpisane przy kursie, np. „Wiktoria Ćwik”.">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </HelpField>

            <HelpField label="Tytuł zawodowy *" hint="Jedna linijka pod nazwiskiem, np. „Kosmetolog, specjalistka od cery trądzikowej”.">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </HelpField>

            <HelpField label="Krótki opis *" hint="2–3 zdania. To widać na karcie kursu, więc napisz najmocniejszy argument.">
              <textarea value={draft.shortBio} onChange={(e) => setDraft({ ...draft, shortBio: e.target.value })} />
            </HelpField>

            <HelpField label="Pełne bio" hint="Dłuższa historia — doświadczenie, podejście do pracy. Zostaw puste, a użyjemy krótkiego opisu.">
              <textarea value={draft.fullBio} onChange={(e) => setDraft({ ...draft, fullBio: e.target.value })} />
            </HelpField>

            <HelpField label="Kwalifikacje" hint="Jedna pozycja w każdej linii, np. „Certyfikat mezoterapii igłowej”. Wyświetlą się jako lista.">
              <textarea value={draft.credentialsText} onChange={(e) => setDraft({ ...draft, credentialsText: e.target.value })} />
            </HelpField>

            <HelpField label="Adres zdjęcia" hint="Wklej link do zdjęcia. Pliki wgrywasz w zakładce „Biblioteka mediów” i kopiujesz stamtąd adres.">
              <input value={draft.photoUrl} onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })} placeholder="https://…" />
            </HelpField>

            <div className="admin-form-split">
              <HelpField label="Adres na stronie (slug)" hint="Zostaw puste — utworzymy go z imienia i nazwiska. Tylko małe litery, cyfry i myślniki.">
                <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder={slugify(draft.name) || 'imie-nazwisko'} />
              </HelpField>

              <HelpField label="Kolejność" hint="Niższy numer = wyżej na liście prowadzących. Zostaw 0, jeśli kolejność nie ma znaczenia.">
                <input type="number" min="0" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} />
              </HelpField>
            </div>

            <label className="academy-check">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              <span>Widoczna na stronie — odznacz, gdy prowadząca ma chwilowo zniknąć z Akademii, ale jej kursy mają zostać.</span>
            </label>

            <div className="admin-form-actions">
              <button className="academy-button" onClick={() => save.mutate()} disabled={save.isPending || !draft.name.trim()}>
                {save.isPending ? 'Zapisywanie…' : editingId ? 'Zapisz zmiany' : 'Dodaj prowadzącą'}
              </button>
              {editingId && (
                <button type="button" className="admin-button-ghost" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>
                  Anuluj i zacznij nową
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-title">
            <div>
              <strong>Prowadzące ({instructors.length})</strong>
              <span>Kliknij kartę, żeby edytować</span>
            </div>
            <GraduationCap />
          </div>

          {instructors.length === 0 && (
            <div className="analytics-empty"><UserRound /><p>Nie ma jeszcze żadnej prowadzącej. Dodaj pierwszą po lewej stronie.</p></div>
          )}

          <div className="admin-record-list">
            {(instructors as any[]).map((instructor) => (
              <article key={instructor.id} className={editingId === instructor.id ? 'selected' : ''}>
                <button type="button" onClick={() => edit(instructor)}>
                  {instructor.photoUrl
                    ? <img src={instructor.photoUrl} alt="" />
                    : <span className="admin-record-avatar">{instructor.name?.[0] ?? '?'}</span>}
                  <span>
                    <strong>{instructor.name}</strong>
                    <small>{instructor.title}</small>
                    <small>
                      {instructor._count?.courses ?? 0} {(instructor._count?.courses ?? 0) === 1 ? 'kurs' : 'kursów'}
                      {instructor.isActive === false && ' · ukryta na stronie'}
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className="admin-record-delete"
                  title={instructor._count?.courses ? 'Ukryj prowadzącą' : 'Usuń prowadzącą'}
                  aria-label={instructor._count?.courses ? 'Ukryj prowadzącą' : 'Usuń prowadzącą'}
                  onClick={() => {
                    const hasCourses = Boolean(instructor._count?.courses);
                    const message = hasCourses
                      ? `${instructor.name} prowadzi ${instructor._count.courses} kurs(ów), więc zamiast usunięcia zostanie ukryta na stronie. Jej dane zostaną zachowane i możesz je przywrócić. Kontynuować?`
                      : `Trwale usunąć ${instructor.name}? Tej operacji nie da się cofnąć.`;
                    if (confirm(message)) remove.mutate(instructor.id);
                  }}
                >
                  <Trash2 />
                </button>
              </article>
            ))}
          </div>

          <button type="button" className="admin-button-ghost admin-full" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>
            <Plus />Dodaj nową prowadzącą
          </button>
        </section>
      </div>
    </div>
  );
}

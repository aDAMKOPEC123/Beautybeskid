import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleHelp, ListChecks, Plus, Trash2 } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { AdminHelp, HelpField } from '@/components/AdminHelp';
import { QuestionEditor } from '@/components/QuestionEditor';

const emptyDraft = {
  title: '',
  description: '',
  thumbnailUrl: '',
  passingScore: 70,
  maxAttempts: 3,
  timeLimitMinutes: '' as number | '',
  isPublished: false,
};

export function AdminQuizzes() {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);

  const { data: quizzes = [], isLoading } = useQuery({ queryKey: ['academy', 'quizzes'], queryFn: academyApi.adminGetQuizzes });
  const { data: quiz } = useQuery({
    queryKey: ['academy', 'quiz', selectedId],
    queryFn: () => academyApi.adminGetQuiz(selectedId!),
    enabled: Boolean(selectedId),
  });

  const refreshList = () => client.invalidateQueries({ queryKey: ['academy', 'quizzes'] });
  const refreshQuiz = () => client.invalidateQueries({ queryKey: ['academy', 'quiz', selectedId] });

  const payload = () => ({
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    thumbnailUrl: draft.thumbnailUrl.trim() || null,
    passingScore: Number(draft.passingScore) || 70,
    maxAttempts: Number(draft.maxAttempts) || 3,
    timeLimitMinutes: draft.timeLimitMinutes === '' ? null : Number(draft.timeLimitMinutes),
    isPublished: draft.isPublished,
  });

  const save = useMutation({
    mutationFn: () => (creating ? academyApi.adminCreateQuiz(payload()) : academyApi.adminUpdateQuiz(selectedId!, payload())),
    onSuccess: (saved: any) => {
      toast.success(creating ? 'Quiz utworzony — teraz dodaj pytania' : 'Ustawienia zapisane');
      setCreating(false);
      setSelectedId(saved?.id ?? selectedId);
      refreshList();
      refreshQuiz();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Nie udało się zapisać quizu'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteQuiz(id),
    onSuccess: () => { toast.success('Quiz usunięty'); setSelectedId(null); refreshList(); },
    onError: () => toast.error('Nie udało się usunąć quizu'),
  });

  const select = (item: any) => {
    setCreating(false);
    setSelectedId(item.id);
    setDraft({
      title: item.title ?? '',
      description: item.description ?? '',
      thumbnailUrl: item.thumbnailUrl ?? '',
      passingScore: item.passingScore ?? 70,
      maxAttempts: item.maxAttempts ?? 3,
      timeLimitMinutes: item.timeLimitMinutes ?? '',
      isPublished: Boolean(item.isPublished),
    });
  };

  const startNew = () => { setCreating(true); setSelectedId(null); setDraft(emptyDraft); };

  if (isLoading) return <div className="academy-loading">Ładujemy quizy…</div>;

  const standalone = (quizzes as any[]).filter((item) => !item.lesson);
  const inLessons = (quizzes as any[]).filter((item) => item.lesson);
  const showForm = creating || Boolean(selectedId);

  return (
    <div className="analytics-page">
      <header className="analytics-head">
        <div>
          <p className="academy-kicker text-caramel">Sprawdzanie wiedzy</p>
          <h1>Quizy</h1>
          <p>Testy samodzielne oraz punkty kontrolne wbudowane w lekcje kursów.</p>
        </div>
      </header>

      <AdminHelp
        title="Po co jest ta zakładka"
        steps={[
          'Kliknij „Nowy quiz” i nadaj mu tytuł — reszta ustawień ma sensowne wartości domyślne.',
          'Zapisz quiz. Dopiero wtedy pojawi się miejsce na pytania.',
          'Dodaj pytania: treść, odpowiedzi i zaznaczenie, która jest poprawna.',
          'Na końcu zaznacz „Widoczny dla kursantek” i zapisz — bez tego quizu nikt nie zobaczy.',
        ]}
      >
        Tutaj tworzysz testy, które kursantka rozwiązuje po nauce. <strong>Quizy samodzielne</strong> są
        dostępne z menu Akademii i po zdaniu wystawiają certyfikat. <strong>Punkty kontrolne w lekcjach</strong>
        {' '}powstają w zakładce „Kursy i programy" — tutaj widzisz je tylko podglądowo i możesz poprawić pytania.
      </AdminHelp>

      <div className="admin-two-columns">
        <section className="analytics-card">
          <div className="analytics-card-title">
            <div>
              <strong>{creating ? 'Nowy quiz' : selectedId ? 'Ustawienia quizu' : 'Wybierz quiz'}</strong>
              <span>{showForm ? 'Zmiany działają dopiero po kliknięciu „Zapisz”' : 'Kliknij quiz na liście obok albo utwórz nowy'}</span>
            </div>
            <CircleHelp />
          </div>

          {!showForm && (
            <div className="analytics-empty">
              <ListChecks />
              <p>Nie wybrano żadnego quizu.</p>
              <button type="button" className="academy-button" onClick={startNew}><Plus />Nowy quiz</button>
            </div>
          )}

          {showForm && (
            <div className="admin-form-grid">
              <HelpField label="Tytuł quizu *" hint="Kursantka widzi go na liście, np. „Sprawdź wiedzę: cera naczyniowa”.">
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </HelpField>

              <HelpField label="Opis" hint="Jedno–dwa zdania: czego dotyczy test i po co go rozwiązywać.">
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </HelpField>

              <HelpField label="Adres obrazka" hint="Miniatura na liście quizów. Link skopiujesz z zakładki „Biblioteka mediów”.">
                <input value={draft.thumbnailUrl} onChange={(e) => setDraft({ ...draft, thumbnailUrl: e.target.value })} placeholder="https://…" />
              </HelpField>

              <div className="admin-form-split">
                <HelpField label="Próg zaliczenia (%)" hint="Ile procent pytań trzeba mieć dobrze. 70 to rozsądny standard.">
                  <input type="number" min="1" max="100" value={draft.passingScore} onChange={(e) => setDraft({ ...draft, passingScore: Number(e.target.value) })} />
                </HelpField>

                <HelpField label="Limit prób na dobę" hint="Ile razy w ciągu 24 godzin można podejść do testu.">
                  <input type="number" min="1" value={draft.maxAttempts} onChange={(e) => setDraft({ ...draft, maxAttempts: Number(e.target.value) })} />
                </HelpField>
              </div>

              <HelpField label="Limit czasu (minuty)" hint="Zostaw puste, żeby kursantka miała tyle czasu, ile potrzebuje.">
                <input
                  type="number"
                  min="1"
                  value={draft.timeLimitMinutes}
                  onChange={(e) => setDraft({ ...draft, timeLimitMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </HelpField>

              <label className="academy-check">
                <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} />
                <span>Widoczny dla kursantek — zaznacz dopiero, gdy quiz ma komplet pytań i jest sprawdzony.</span>
              </label>

              <div className="admin-form-actions">
                <button className="academy-button" onClick={() => save.mutate()} disabled={save.isPending || !draft.title.trim()}>
                  {save.isPending ? 'Zapisywanie…' : creating ? 'Utwórz quiz' : 'Zapisz ustawienia'}
                </button>
                <button type="button" className="admin-button-ghost" onClick={() => { setCreating(false); setSelectedId(null); }}>Zamknij</button>
              </div>
            </div>
          )}

          {selectedId && quiz && (
            <div className="admin-subsection">
              <div className="analytics-card-title">
                <div>
                  <strong>Pytania ({quiz.questions?.length ?? 0})</strong>
                  <span>Pytania zapisują się od razu — niezależnie od ustawień powyżej</span>
                </div>
                <ListChecks />
              </div>
              <QuestionEditor quizId={quiz.id} questions={quiz.questions ?? []} onChanged={() => { refreshQuiz(); refreshList(); }} />
            </div>
          )}
        </section>

        <section className="analytics-card">
          <div className="analytics-card-title">
            <div>
              <strong>Wszystkie quizy ({quizzes.length})</strong>
              <span>Kliknij, żeby otworzyć</span>
            </div>
            <button type="button" className="admin-button-ghost" onClick={startNew}><Plus />Nowy quiz</button>
          </div>

          <QuizGroup
            title="Samodzielne"
            description="Dostępne z menu Akademii dla każdej kursantki, która kupiła jakikolwiek kurs. Zdanie wystawia certyfikat."
            quizzes={standalone}
            selectedId={selectedId}
            onSelect={select}
            onDelete={(item) => { if (confirm(`Usunąć quiz „${item.title}" razem z pytaniami i wynikami kursantek? Tej operacji nie da się cofnąć.`)) remove.mutate(item.id); }}
          />

          <QuizGroup
            title="Punkty kontrolne w lekcjach"
            description="Powstają w zakładce „Kursy i programy”. Tutaj możesz poprawić pytania i ustawienia, ale nie usuwaj ich stąd — usuń całą lekcję w Studiu."
            quizzes={inLessons}
            selectedId={selectedId}
            onSelect={select}
          />
        </section>
      </div>
    </div>
  );
}

function QuizGroup({ title, description, quizzes, selectedId, onSelect, onDelete }: {
  title: string;
  description: string;
  quizzes: any[];
  selectedId: string | null;
  onSelect: (quiz: any) => void;
  onDelete?: (quiz: any) => void;
}) {
  return (
    <div className="admin-group">
      <h3>{title}</h3>
      <p className="admin-group-description">{description}</p>
      {quizzes.length === 0 && <p className="question-editor-empty">Brak quizów w tej grupie.</p>}
      <div className="admin-record-list">
        {quizzes.map((item) => (
          <article key={item.id} className={selectedId === item.id ? 'selected' : ''}>
            <button type="button" onClick={() => onSelect(item)}>
              <span className="admin-record-avatar"><CircleHelp /></span>
              <span>
                <strong>{item.title}</strong>
                {item.lesson && <small>Lekcja: {item.lesson.title}</small>}
                <small>
                  {item._count?.questions ?? 0} pytań · {item._count?.attempts ?? 0} podejść ·{' '}
                  {item.isPublished ? 'widoczny' : 'ukryty (szkic)'}
                </small>
              </span>
            </button>
            {onDelete && (
              <button type="button" className="admin-record-delete" title="Usuń quiz" aria-label="Usuń quiz" onClick={() => onDelete(item)}>
                <Trash2 />
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academyApi } from '@/api/academy.api';
import { AdminHelp } from '@/components/AdminHelp';

// ── Types ──────────────────────────────────────────────────────────────────

type StepType = 'INTERVIEW' | 'DIAGNOSIS' | 'TREATMENT' | 'RESULT';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface StepAnswer {
  text: string;
  isCorrect: boolean;
  explanation: string;
}

interface StepDraft {
  type: StepType;
  content: string;
  questionText: string;
  multiSelect: boolean;
  answers: StepAnswer[];
}

interface DiagnosticCaseSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
  published: boolean;
  order: number;
  clientName: string;
  clientAge: number;
  course?: { id: string; title: string };
  _count: { steps: number; attempts: number };
}

interface Course {
  id: string;
  title: string;
  slug: string;
}

interface CaseStats {
  totalAttempts: number;
  averageScorePercent: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const difficultyLabel: Record<Difficulty, string> = {
  EASY: 'Łatwy',
  MEDIUM: 'Średni',
  HARD: 'Trudny',
};

const difficultyColor: Record<Difficulty, string> = {
  EASY: '#2e6346',
  MEDIUM: '#b47c35',
  HARD: '#b04739',
};

const stepTypeLabel: Record<StepType, string> = {
  INTERVIEW: 'Wywiad',
  DIAGNOSIS: 'Diagnoza',
  TREATMENT: 'Zabieg',
  RESULT: 'Wynik',
};

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? 'wide' : ''}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

const emptyCase = {
  title: '',
  clientName: '',
  clientAge: 25,
  clientDescription: '',
  difficulty: 'MEDIUM' as Difficulty,
  courseId: '',
  regionSlug: '',
  order: 0,
  published: false,
};

function emptyStep(): StepDraft {
  return {
    type: 'INTERVIEW',
    content: '',
    questionText: '',
    multiSelect: false,
    answers: [
      { text: '', isCorrect: false, explanation: '' },
      { text: '', isCorrect: false, explanation: '' },
    ],
  };
}

// ── Step builder ───────────────────────────────────────────────────────────

function StepBuilder({
  steps,
  onChange,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
}) {
  function updateStep(idx: number, patch: Partial<StepDraft>) {
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function updateAnswer(stepIdx: number, answerIdx: number, patch: Partial<StepAnswer>) {
    const updated = steps[stepIdx].answers.map((a, i) =>
      i === answerIdx ? { ...a, ...patch } : a
    );
    updateStep(stepIdx, { answers: updated });
  }

  function addAnswer(stepIdx: number) {
    const updated = [...steps[stepIdx].answers, { text: '', isCorrect: false, explanation: '' }];
    updateStep(stepIdx, { answers: updated });
  }

  function removeAnswer(stepIdx: number, answerIdx: number) {
    const updated = steps[stepIdx].answers.filter((_, i) => i !== answerIdx);
    updateStep(stepIdx, { answers: updated });
  }

  function addStep() {
    onChange([...steps, emptyStep()]);
  }

  function removeStep(idx: number) {
    onChange(steps.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {steps.map((step, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #dfe4dc',
            borderRadius: 10,
            padding: 16,
            marginBottom: 14,
            background: '#fafcf9',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Krok {idx + 1}</strong>
            <button
              type="button"
              style={{ color: '#b04739', fontSize: 12 }}
              onClick={() => removeStep(idx)}
            >
              Usuń krok
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <label>
              <span style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Typ kroku</span>
              <select
                value={step.type}
                onChange={(e) => updateStep(idx, { type: e.target.value as StepType })}
              >
                {(Object.keys(stepTypeLabel) as StepType[]).map((t) => (
                  <option key={t} value={t}>
                    {stepTypeLabel[t]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 18 }}>
              <input
                type="checkbox"
                checked={step.multiSelect}
                onChange={(e) => updateStep(idx, { multiSelect: e.target.checked })}
              />
              <span style={{ fontSize: 12 }}>Wiele odpowiedzi</span>
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 10 }}>
            <span style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Treść kroku</span>
            <textarea
              required
              rows={3}
              value={step.content}
              onChange={(e) => updateStep(idx, { content: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            <span style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Pytanie (opcjonalne)</span>
            <input
              value={step.questionText}
              onChange={(e) => updateStep(idx, { questionText: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Odpowiedzi:</p>
            {step.answers.map((answer, aIdx) => (
              <div key={aIdx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                <input
                  placeholder={`Odpowiedź ${aIdx + 1}`}
                  value={answer.text}
                  onChange={(e) => updateAnswer(idx, aIdx, { text: e.target.value })}
                  style={{ flex: 2 }}
                />
                <input
                  placeholder="Wyjaśnienie"
                  value={answer.explanation}
                  onChange={(e) => updateAnswer(idx, aIdx, { explanation: e.target.value })}
                  style={{ flex: 2 }}
                />
                <label style={{ display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap', fontSize: 11, paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={answer.isCorrect}
                    onChange={(e) => updateAnswer(idx, aIdx, { isCorrect: e.target.checked })}
                  />
                  ok
                </label>
                <button
                  type="button"
                  style={{ color: '#b04739', fontSize: 11, paddingTop: 4 }}
                  onClick={() => removeAnswer(idx, aIdx)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              style={{ fontSize: 11, marginTop: 4 }}
              onClick={() => addAnswer(idx)}
            >
              + Odpowiedź
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addStep} style={{ marginTop: 8 }}>
        + Dodaj krok
      </button>
    </div>
  );
}

// ── Stats panel ────────────────────────────────────────────────────────────

function StatsPanel({ caseId }: { caseId: string }) {
  const { data: stats, isLoading } = useQuery<CaseStats>({
    queryKey: ['academy', 'admin', 'diagnostic-cases', caseId, 'stats'],
    queryFn: () => academyApi.adminGetDiagnosticCaseStats(caseId),
    enabled: Boolean(caseId),
  });

  if (isLoading) return <p style={{ fontSize: 12 }}>Ładowanie statystyk…</p>;
  if (!stats) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        padding: '14px 18px',
        background: '#f0f7f2',
        borderRadius: 10,
        marginBottom: 20,
        fontSize: 13,
      }}
    >
      <div>
        <strong style={{ display: 'block', fontSize: 22 }}>{stats.totalAttempts}</strong>
        <span>Podejść</span>
      </div>
      <div>
        <strong style={{ display: 'block', fontSize: 22 }}>
          {stats.averageScorePercent != null ? `${Math.round(stats.averageScorePercent)}%` : '—'}
        </strong>
        <span>Średni wynik</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AdminCaseStudies() {
  const client = useQueryClient();

  const { data: cases = [], isLoading } = useQuery<DiagnosticCaseSummary[]>({
    queryKey: ['academy', 'admin', 'diagnostic-cases'],
    queryFn: academyApi.adminGetDiagnosticCases,
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['academy', 'admin', 'courses'],
    queryFn: academyApi.adminGetCourses,
  });

  const [form, setForm] = useState(emptyCase);
  const [editingId, setEditingId] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);
  const [showForm, setShowForm] = useState(false);

  const set = (name: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  // Validation
  function validate(): string | null {
    if (steps.length < 2) return 'Przypadek musi mieć co najmniej 2 kroki.';
    if (steps[steps.length - 1].type !== 'RESULT') return 'Ostatni krok musi być typu RESULT (Wynik).';
    return null;
  }

  const save = useMutation({
    mutationFn: () => {
      const error = validate();
      if (error) return Promise.reject(new Error(error));

      const payload = {
        ...form,
        clientAge: Number(form.clientAge),
        order: Number(form.order),
        courseId: form.courseId || null,
        regionSlug: form.regionSlug || null,
        steps: steps.map((s, idx) => ({
          type: s.type,
          content: s.content,
          questionText: s.questionText || null,
          multiSelect: s.multiSelect,
          order: idx,
          answers: s.answers
            .filter((a) => a.text.trim())
            .map((a, aIdx) => ({
              text: a.text,
              isCorrect: a.isCorrect,
              explanation: a.explanation || null,
              order: aIdx,
            })),
        })),
      };

      return editingId
        ? academyApi.adminUpdateDiagnosticCase(editingId, payload)
        : academyApi.adminCreateDiagnosticCase(payload);
    },
    onSuccess: () => {
      toast.success('Przypadek kliniczny zapisany');
      resetForm();
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'diagnostic-cases'] });
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się zapisać przypadku');
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteDiagnosticCase(id),
    onSuccess: () => {
      toast.success('Przypadek usunięty');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'diagnostic-cases'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się usunąć');
    },
  });

  function resetForm() {
    setForm(emptyCase);
    setEditingId('');
    setSteps([emptyStep()]);
    setShowForm(false);
  }

  async function startEdit(c: DiagnosticCaseSummary) {
    try {
      const full = await academyApi.adminGetDiagnosticCase(c.id);
      setEditingId(c.id);
      setForm({
        title: full.title ?? '',
        clientName: full.clientName ?? '',
        clientAge: full.clientAge ?? 25,
        clientDescription: full.clientDescription ?? '',
        difficulty: full.difficulty ?? 'MEDIUM',
        courseId: full.course?.id ?? '',
        regionSlug: full.regionSlug ?? '',
        order: full.order ?? 0,
        published: full.published ?? false,
      });
      // Rebuild steps from API response
      const apiSteps: StepDraft[] = (full.steps ?? []).map(
        (s: {
          type: StepType;
          content: string;
          questionText?: string;
          multiSelect?: boolean;
          answers?: { text: string; isCorrect: boolean; explanation?: string }[];
        }) => ({
          type: s.type,
          content: s.content ?? '',
          questionText: s.questionText ?? '',
          multiSelect: s.multiSelect ?? false,
          answers: (s.answers ?? []).map((a) => ({
            text: a.text ?? '',
            isCorrect: a.isCorrect ?? false,
            explanation: a.explanation ?? '',
          })),
        })
      );
      setSteps(apiSteps.length > 0 ? apiSteps : [emptyStep()]);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Nie udało się załadować danych przypadku');
    }
  }

  function handleDelete(id: string, title: string) {
    if (!window.confirm(`Usunąć przypadek kliniczny "${title}"?`)) return;
    del.mutate(id);
  }

  return (
    <div className="academy-admin-form-page">
      <header>
        <p className="academy-kicker">Diagnostyka kliniczna</p>
        <h1>Przypadki kliniczne</h1>
        <p>Interaktywne scenariusze diagnostyczne dla kursantek. Każdy przypadek prowadzi przez wywiad, diagnozę i leczenie.</p>
      </header>

      <AdminHelp
        title="Po co jest ta zakładka"
        steps={[
          'Opisz pacjentkę: wiek, typ cery, zgłaszany problem. To ekran startowy przypadku.',
          'Dodaj kroki po kolei — każdy krok to jedno pytanie lub decyzja, np. „Co zrobisz najpierw?”.',
          'W każdym kroku podaj możliwe odpowiedzi i zaznacz właściwą wraz z uzasadnieniem.',
          'Wgraj zdjęcia do kroków, w których kursantka ma coś ocenić wzrokowo.',
          'Przypisz przypadek do kursu i opublikuj — pojawi się w zakładce „Przypadki” tego kursu.',
        ]}
      >
        Przypadek kliniczny to ćwiczenie „co byś zrobiła”. Kursantka przechodzi krok po kroku przez decyzje
        realnego zabiegu i po każdej dostaje informację zwrotną. <strong>To najbardziej pracochłonna, ale
        i najskuteczniejsza forma nauki</strong> — jeden dobry przypadek jest wart więcej niż pięć filmów.
      </AdminHelp>

      {/* Toggle form button */}
      {!showForm && (
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => { resetForm(); setShowForm(true); }}>
            + Nowy przypadek kliniczny
          </button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <section>
          <h2>{editingId ? 'Edytuj przypadek kliniczny' : 'Nowy przypadek kliniczny'}</h2>

          {editingId && <StatsPanel caseId={editingId} />}

          <form
            className="academy-admin-field-grid"
            onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}
          >
            <Field label="Tytuł" wide>
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field label="Imię klientki">
              <input
                required
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
              />
            </Field>
            <Field label="Wiek klientki">
              <input
                required
                type="number"
                min="1"
                max="120"
                value={form.clientAge}
                onChange={(e) => set('clientAge', Number(e.target.value))}
              />
            </Field>
            <Field label="Poziom trudności">
              <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                <option value="EASY">Łatwy</option>
                <option value="MEDIUM">Średni</option>
                <option value="HARD">Trudny</option>
              </select>
            </Field>
            <Field label="Powiązany kurs">
              <select value={form.courseId} onChange={(e) => set('courseId', e.target.value)}>
                <option value="">— brak —</option>
                {(courses as Course[]).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Slug regionu atlasu">
              <input
                value={form.regionSlug}
                placeholder="np. twarz, dekolt"
                onChange={(e) => set('regionSlug', e.target.value)}
              />
            </Field>
            <Field label="Kolejność">
              <input
                type="number"
                min="0"
                value={form.order}
                onChange={(e) => set('order', Number(e.target.value))}
              />
            </Field>
            <Field label="Opis klientki" wide>
              <textarea
                rows={3}
                value={form.clientDescription}
                onChange={(e) => set('clientDescription', e.target.value)}
              />
            </Field>
            <label className="academy-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => set('published', e.target.checked)}
              />
              <span>Opublikowany</span>
            </label>

            {/* Step builder */}
            <fieldset className="wide" style={{ border: 'none', padding: 0 }}>
              <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                Kroki przypadku
              </legend>
              <p style={{ fontSize: 11, color: '#5a7a62', marginBottom: 12 }}>
                Wymagane minimum 2 kroki. Ostatni krok musi być typu &quot;Wynik&quot;.
              </p>
              <StepBuilder steps={steps} onChange={setSteps} />
            </fieldset>

            <button disabled={save.isPending}>
              {editingId ? 'Zapisz zmiany' : 'Utwórz przypadek'}
            </button>
            <button type="button" onClick={resetForm}>
              Anuluj
            </button>
          </form>
        </section>
      )}

      {/* List */}
      <section>
        <h2>Przypadki kliniczne ({(cases as DiagnosticCaseSummary[]).length})</h2>
        {isLoading ? (
          <p>Ładowanie…</p>
        ) : (
          <div className="academy-admin-card-list">
            {(cases as DiagnosticCaseSummary[]).map((c) => (
              <article key={c.id}>
                <div>
                  <strong>{c.title}</strong>
                  <p>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 7px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#fff',
                        background: difficultyColor[c.difficulty] ?? '#888',
                        marginRight: 6,
                      }}
                    >
                      {difficultyLabel[c.difficulty] ?? c.difficulty}
                    </span>
                    {c.clientName}, {c.clientAge} lat ·{' '}
                    {c.course?.title ?? 'bez kursu'} ·{' '}
                    {c._count.steps} kroków · {c._count.attempts} podejść ·{' '}
                    poz. {c.order} · {c.published ? 'opublikowany' : 'szkic'}
                  </p>
                </div>
                <button onClick={() => startEdit(c)}>Edytuj</button>
                <button
                  onClick={() => handleDelete(c.id, c.title)}
                  disabled={del.isPending}
                  style={{ marginLeft: 6, color: '#b04739' }}
                >
                  Usuń
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

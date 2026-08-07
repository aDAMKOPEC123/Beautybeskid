import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

type Option = { id?: string; text: string; isCorrect: boolean };
type Question = { id: string; text: string; type: string; explanation?: string | null; order?: number; options?: Option[] };

const TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Jedna poprawna odpowiedź', hint: 'Kursantka zaznacza dokładnie jedną odpowiedź. Najczęstszy wybór.' },
  { value: 'MULTIPLE_CHOICE', label: 'Kilka poprawnych odpowiedzi', hint: 'Kursantka musi zaznaczyć wszystkie poprawne, żeby dostać punkt.' },
  { value: 'TRUE_FALSE', label: 'Prawda / fałsz', hint: 'Dwie odpowiedzi: prawda i fałsz. Zaznacz, która jest poprawna.' },
];

const blankOptions = (): Option[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
];

const trueFalseOptions = (): Option[] => [
  { text: 'Prawda', isCorrect: true },
  { text: 'Fałsz', isCorrect: false },
];

/**
 * Edytor listy pytań jednego quizu. Używany w zakładce „Quizy" oraz w punktach
 * kontrolnych wewnątrz Studia kursów — dzięki temu obsługa jest wszędzie taka sama.
 */
export function QuestionEditor({ quizId, questions, onChanged }: { quizId: string; questions: Question[]; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const remove = async (question: Question) => {
    if (!confirm(`Usunąć pytanie „${question.text}"? Tej operacji nie da się cofnąć.`)) return;
    try {
      await academyApi.adminDeleteQuestion(question.id);
      toast.success('Pytanie usunięte');
      onChanged();
    } catch {
      toast.error('Nie udało się usunąć pytania');
    }
  };

  return (
    <div className="question-editor">
      <p className="question-editor-hint">
        Każde pytanie sprawdza jedną konkretną rzecz. Wpisz jedną odpowiedź poprawną i co najmniej jedną
        błędną, ale wiarygodną — pytanie z oczywistą odpowiedzią niczego nie sprawdza.
      </p>

      {questions.length === 0 && !adding && (
        <p className="question-editor-empty">Ten quiz nie ma jeszcze żadnego pytania. Dodaj pierwsze poniżej.</p>
      )}

      <ol className="question-list">
        {questions.map((question, index) => (
          <li key={question.id}>
            {editingId === question.id ? (
              <QuestionForm
                quizId={quizId}
                question={question}
                onDone={() => { setEditingId(null); onChanged(); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="question-row">
                <span className="question-number">{index + 1}</span>
                <div>
                  <strong>{question.text}</strong>
                  <ul>
                    {(question.options ?? []).map((option) => (
                      <li key={option.id ?? option.text} className={option.isCorrect ? 'correct' : ''}>
                        {option.isCorrect ? <Check /> : <X />}{option.text}
                      </li>
                    ))}
                  </ul>
                  {question.explanation && <p className="question-explanation">Wyjaśnienie: {question.explanation}</p>}
                </div>
                <div className="question-actions">
                  <button type="button" title="Popraw pytanie" aria-label="Popraw pytanie" onClick={() => setEditingId(question.id)}><Pencil /></button>
                  <button type="button" title="Usuń pytanie" aria-label="Usuń pytanie" onClick={() => remove(question)}><Trash2 /></button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {adding ? (
        <QuestionForm
          quizId={quizId}
          nextOrder={questions.length}
          onDone={() => { setAdding(false); onChanged(); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="admin-button-ghost admin-full" onClick={() => setAdding(true)}>
          <Plus />Dodaj pytanie
        </button>
      )}
    </div>
  );
}

function QuestionForm({ quizId, question, nextOrder = 0, onDone, onCancel }: {
  quizId: string;
  question?: Question;
  nextOrder?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(question?.text ?? '');
  const [type, setType] = useState(question?.type ?? 'SINGLE_CHOICE');
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [options, setOptions] = useState<Option[]>(
    question?.options?.length ? question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) : blankOptions()
  );
  const [saving, setSaving] = useState(false);

  const changeType = (value: string) => {
    setType(value);
    if (value === 'TRUE_FALSE') setOptions(trueFalseOptions());
  };

  const setOption = (index: number, patch: Partial<Option>) => {
    setOptions(options.map((option, i) => {
      if (i !== index) {
        // Przy jednej poprawnej odpowiedzi zaznaczenie nowej odznacza poprzednią.
        if (patch.isCorrect && type !== 'MULTIPLE_CHOICE') return { ...option, isCorrect: false };
        return option;
      }
      return { ...option, ...patch };
    }));
  };

  const save = async () => {
    const filled = options.filter((option) => option.text.trim());
    if (!text.trim()) return toast.error('Wpisz treść pytania');
    if (filled.length < 2) return toast.error('Wpisz co najmniej dwie odpowiedzi');
    if (!filled.some((option) => option.isCorrect)) return toast.error('Zaznacz, która odpowiedź jest poprawna');

    const payload = {
      text: text.trim(),
      type,
      explanation: explanation.trim() || null,
      order: question?.order ?? nextOrder,
      options: filled.map((option, index) => ({ text: option.text.trim(), isCorrect: option.isCorrect, order: index })),
    };

    setSaving(true);
    try {
      if (question) await academyApi.adminUpdateQuestion(question.id, payload);
      else await academyApi.adminCreateQuestion(quizId, payload);
      toast.success(question ? 'Pytanie poprawione' : 'Pytanie dodane');
      onDone();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Nie udało się zapisać pytania');
    } finally {
      setSaving(false);
    }
  };

  const typeHint = TYPES.find((option) => option.value === type)?.hint;

  return (
    <div className="question-form">
      <label className="admin-field">
        <span>Treść pytania</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="np. Jak długo należy odczekać między zabiegami mikrodermabrazji?" />
        <small>Pytaj o jedną rzecz. Unikaj „które z poniższych nie jest…” — zaprzeczenia mylą kursantki.</small>
      </label>

      <label className="admin-field">
        <span>Rodzaj pytania</span>
        <select value={type} onChange={(e) => changeType(e.target.value)}>
          {TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <small>{typeHint}</small>
      </label>

      <div className="admin-field">
        <span>Odpowiedzi</span>
        <div className="question-options">
          {options.map((option, index) => (
            <div key={index} className={option.isCorrect ? 'correct' : ''}>
              <label title="Zaznacz jako poprawną">
                <input
                  type={type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                  name={`correct-${quizId}-${question?.id ?? 'new'}`}
                  checked={option.isCorrect}
                  onChange={(e) => setOption(index, { isCorrect: e.target.checked })}
                />
              </label>
              <input
                value={option.text}
                onChange={(e) => setOption(index, { text: e.target.value })}
                placeholder={index === 0 ? 'Poprawna odpowiedź' : 'Odpowiedź błędna, ale wiarygodna'}
                disabled={type === 'TRUE_FALSE'}
              />
              {options.length > 2 && type !== 'TRUE_FALSE' && (
                <button type="button" title="Usuń tę odpowiedź" aria-label="Usuń tę odpowiedź" onClick={() => setOptions(options.filter((_, i) => i !== index))}>
                  <Trash2 />
                </button>
              )}
            </div>
          ))}
        </div>
        {type !== 'TRUE_FALSE' && options.length < 6 && (
          <button type="button" className="admin-button-ghost" onClick={() => setOptions([...options, { text: '', isCorrect: false }])}>
            <Plus />Dodaj kolejną odpowiedź
          </button>
        )}
        <small>Kliknij kółko (lub kwadrat) po lewej stronie odpowiedzi, żeby oznaczyć ją jako poprawną.</small>
      </div>

      <label className="admin-field">
        <span>Wyjaśnienie (opcjonalne)</span>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="np. Skóra potrzebuje 7–10 dni na regenerację bariery." />
        <small>Kursantka zobaczy to po odpowiedzeniu. Wykorzystaj jako mini-lekcję, zwłaszcza przy częstych błędach.</small>
      </label>

      <div className="admin-form-actions">
        <button type="button" className="academy-button" onClick={save} disabled={saving}>
          {saving ? 'Zapisywanie…' : question ? 'Zapisz poprawki' : 'Dodaj pytanie'}
        </button>
        <button type="button" className="admin-button-ghost" onClick={onCancel}>Anuluj</button>
      </div>
    </div>
  );
}

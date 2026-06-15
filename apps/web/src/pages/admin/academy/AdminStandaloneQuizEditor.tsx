import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface QuizFormData {
  title: string;
  description: string;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: string;
  isPublished: boolean;
}

const defaultForm: QuizFormData = {
  title: '',
  description: '',
  passingScore: 70,
  maxAttempts: 3,
  timeLimitMinutes: '',
  isPublished: false,
};

export function AdminStandaloneQuizEditor() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuizFormData>(defaultForm);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['admin', 'academy', 'quizzes'],
    queryFn: academyApi.adminGetQuizzes,
  });

  const { data: quizDetail } = useQuery({
    queryKey: ['admin', 'academy', 'quiz', expandedQuiz],
    queryFn: () => academyApi.adminGetQuiz(expandedQuiz!),
    enabled: !!expandedQuiz,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultForm) =>
      academyApi.adminCreateQuiz({
        ...data,
        timeLimitMinutes: data.timeLimitMinutes ? parseInt(data.timeLimitMinutes) : undefined,
      }),
    onSuccess: () => {
      toast.success('Quiz utworzony');
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'quizzes'] });
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: () => toast.error('Błąd podczas tworzenia quizu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof defaultForm> }) =>
      academyApi.adminUpdateQuiz(id, {
        ...data,
        timeLimitMinutes: data.timeLimitMinutes ? parseInt(data.timeLimitMinutes as string) : undefined,
      }),
    onSuccess: () => {
      toast.success('Quiz zaktualizowany');
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'quizzes'] });
      setEditingId(null);
      setForm(defaultForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: academyApi.adminDeleteQuiz,
    onSuccess: () => {
      toast.success('Quiz usunięty');
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'quizzes'] });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: (data: { quizId: string; text: string; type: string; options: { text: string; isCorrect: boolean }[] }) =>
      academyApi.adminCreateQuestion(data.quizId, { text: data.text, type: data.type, options: data.options }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'quiz', expandedQuiz] });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: academyApi.adminDeleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'quiz', expandedQuiz] });
    },
  });

  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'SINGLE_CHOICE', options: [{ text: '', isCorrect: false }] });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error('Tytuł jest wymagany');
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (quiz: any) => {
    setEditingId(quiz.id);
    setForm({
      title: quiz.title ?? '',
      description: quiz.description ?? '',
      passingScore: quiz.passingScore ?? 70,
      maxAttempts: quiz.maxAttempts ?? 3,
      timeLimitMinutes: quiz.timeLimitMinutes?.toString() ?? '',
      isPublished: quiz.isPublished ?? false,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Quizy standalone ({quizzes.filter((q: any) => q.lesson === null).length})</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(defaultForm); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4"/>
          Nowy quiz
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <h3 className="font-medium text-sm">{editingId ? 'Edytuj quiz' : 'Nowy quiz'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tytuł *</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Opis</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Próg zdania (%)</label>
              <input type="number" min={0} max={100} value={form.passingScore}
                onChange={(e) => setForm((p) => ({ ...p, passingScore: parseInt(e.target.value) || 70 }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Maks. prób / 24h</label>
              <input type="number" min={1} value={form.maxAttempts}
                onChange={(e) => setForm((p) => ({ ...p, maxAttempts: parseInt(e.target.value) || 3 }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Limit czasu (min, opcjonalnie)</label>
              <input type="number" min={1} value={form.timeLimitMinutes}
                onChange={(e) => setForm((p) => ({ ...p, timeLimitMinutes: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="published" checked={form.isPublished}
                onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
                className="rounded"/>
              <label htmlFor="published" className="text-sm">Opublikowany</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {editingId ? 'Zapisz' : 'Utwórz'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }}
              className="px-4 py-2 border rounded-md text-sm hover:bg-accent transition-colors">
              Anuluj
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map((i)=><div key={i} className="h-16 bg-muted rounded-lg animate-pulse"/>)}</div>
      ) : (
        <div className="space-y-3">
          {(quizzes as any[]).filter((q: any) => !q.lesson).map((quiz: any) => (
            <div key={quiz.id} className="bg-card rounded-lg border overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{quiz.title}</p>
                    {quiz.isPublished ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Opublikowany</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Szkic</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {quiz._count?.questions ?? 0} pytań · Próg: {quiz.passingScore}% · Maks. prób: {quiz.maxAttempts}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => startEdit(quiz)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                    <Edit2 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors">
                    {expandedQuiz === quiz.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                  </button>
                  <button onClick={() => window.confirm(`Usunąć quiz "${quiz.title}"?`) && deleteMutation.mutate(quiz.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              {expandedQuiz === quiz.id && quizDetail && (
                <div className="border-t p-4 space-y-4">
                  <h4 className="text-sm font-medium">Pytania</h4>
                  {quizDetail.questions?.map((q: any, idx: number) => (
                    <div key={q.id} className="bg-muted/30 rounded-md p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{idx + 1}. {q.text}</p>
                        <button onClick={() => deleteQuestionMutation.mutate(q.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0">
                          <X className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                      <div className="space-y-1">
                        {q.options?.map((opt: any) => (
                          <div key={opt.id} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${opt.isCorrect ? 'bg-green-100 text-green-700' : 'bg-muted'}`}>
                            {opt.isCorrect && <Check className="w-3 h-3"/>}
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Add question */}
                  <div className="border rounded-md p-3 space-y-3">
                    <h5 className="text-sm font-medium">Dodaj pytanie</h5>
                    <input value={newQuestion.text} onChange={(e) => setNewQuestion((p) => ({ ...p, text: e.target.value }))}
                      placeholder="Treść pytania" className="w-full border rounded px-3 py-2 text-sm focus:outline-none"/>
                    <select value={newQuestion.type} onChange={(e) => setNewQuestion((p) => ({ ...p, type: e.target.value }))}
                      className="border rounded px-3 py-2 text-sm focus:outline-none">
                      <option value="SINGLE_CHOICE">Jednokrotny wybór</option>
                      <option value="MULTIPLE_CHOICE">Wielokrotny wybór</option>
                      <option value="TRUE_FALSE">Prawda/Fałsz</option>
                    </select>
                    <div className="space-y-2">
                      {newQuestion.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" checked={opt.isCorrect}
                            onChange={(e) => setNewQuestion((p) => ({ ...p, options: p.options.map((o, j) => j === i ? { ...o, isCorrect: e.target.checked } : newQuestion.type === 'SINGLE_CHOICE' ? { ...o, isCorrect: false } : o) }))}/>
                          <input value={opt.text} onChange={(e) => setNewQuestion((p) => ({ ...p, options: p.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o) }))}
                            placeholder={`Opcja ${i + 1}`} className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none"/>
                          {newQuestion.options.length > 1 && (
                            <button onClick={() => setNewQuestion((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                              className="p-1 hover:text-destructive"><X className="w-3.5 h-3.5"/></button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setNewQuestion((p) => ({ ...p, options: [...p.options, { text: '', isCorrect: false }] }))}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3"/> Dodaj opcję
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (!newQuestion.text.trim()) return;
                        addQuestionMutation.mutate({ quizId: quiz.id, text: newQuestion.text, type: newQuestion.type, options: newQuestion.options.filter((o) => o.text.trim()) });
                        setNewQuestion({ text: '', type: 'SINGLE_CHOICE', options: [{ text: '', isCorrect: false }] });
                      }}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                      Dodaj pytanie
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { academyApi } from '@/api/academy.api';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface QuizQuestion {
  id: string;
  text: string;
  type: string;
  options: { id: string; text: string; order: number }[];
  explanation?: string;
}

interface LessonQuizPlayerProps {
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    timeLimitMinutes?: number;
    questions: QuizQuestion[];
  };
  isStandalone?: boolean;
  onPassed?: (certificate: any) => void;
}

export function LessonQuizPlayer({ quiz, isStandalone: _isStandalone, onPassed }: LessonQuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null
  );

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const submitMutation = useMutation({
    mutationFn: (payload: { questionId: string; selectedOptionIds: string[] }[]) =>
      academyApi.submitQuizAttempt(quiz.id, payload),
    onSuccess: (data) => {
      setResult(data);
      if (data.passed && onPassed) onPassed(data.certificate);
    },
  });

  const handleToggleOption = (questionId: string, optionId: string, multi: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (multi) {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmit = () => {
    const payload = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id] ?? [],
    }));
    submitMutation.mutate(payload);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div
          className={`rounded-lg p-6 text-center space-y-3 ${
            result.passed
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {result.passed ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          )}
          <h3 className="text-xl font-bold">
            {result.passed ? 'Gratulacje! Zdałeś/aś!' : 'Niestety, nie udało się'}
          </h3>
          <p className="text-muted-foreground">
            Wynik:{' '}
            <span className="font-semibold text-foreground">{result.score}%</span>{' '}
            (próg zdania: {quiz.passingScore}%)
          </p>
          {result.passed && result.certificate && (
            <a
              href={academyApi.getCertificateDownloadUrl(result.certificate.verificationCode)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              download
            >
              <Award className="w-4 h-4" />
              Pobierz certyfikat
            </a>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Przegląd odpowiedzi</h4>
          {quiz.questions.map((q, idx) => {
            const graded = result.gradedResults?.find((gr: any) => gr.questionId === q.id);
            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  graded?.isCorrect
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-red-200 bg-red-50/50'
                }`}
              >
                <p className="text-sm font-medium mb-2">
                  {idx + 1}. {q.text}
                </p>
                <div className="space-y-1">
                  {q.options.map((opt) => {
                    const selected = (answers[q.id] ?? []).includes(opt.id);
                    const isCorrect = graded?.correctOptionIds?.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`text-sm px-3 py-1.5 rounded ${
                          isCorrect
                            ? 'text-green-700 bg-green-100'
                            : selected && !isCorrect
                            ? 'text-red-700 bg-red-100'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {opt.text} {isCorrect && '✓'} {selected && !isCorrect && '✗'}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            setResult(null);
            setAnswers({});
          }}
          className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timeLeft !== null && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4" />
          <span className={timeLeft < 60 ? 'text-red-500' : ''}>{formatTime(timeLeft)}</span>
        </div>
      )}

      {quiz.questions.map((q, idx) => {
        const isMulti = q.type === 'MULTIPLE_CHOICE';
        const selected = answers[q.id] ?? [];
        return (
          <div key={q.id} className="bg-card rounded-lg border p-4 space-y-3">
            <p className="font-medium text-sm">
              {idx + 1}. {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleToggleOption(q.id, opt.id, isMulti)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm border transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {submitMutation.isPending ? 'Sprawdzanie...' : 'Wyślij odpowiedzi'}
      </button>
    </div>
  );
}

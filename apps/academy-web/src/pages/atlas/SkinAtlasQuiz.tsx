import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  questionImageUrl?: string;
  condition: { name: string; slug: string };
  answers: QuizAnswer[];
}

interface SubmitResult {
  id: string;
  score: number;
  maxScore: number;
  answers: unknown;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function SkinAtlasQuiz() {
  const { region } = useParams<{ region?: string }>();

  const { data: rawQuestions, isLoading, isError } = useQuery<QuizQuestion[]>({
    queryKey: ['academy', 'atlas', 'quiz', region ?? null],
    queryFn: () => academyApi.getAtlasQuizQuestions(region),
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (rawQuestions && rawQuestions.length > 0 && questions.length === 0) {
      setQuestions(shuffleArray(rawQuestions));
    }
  }, [rawQuestions, questions.length]);

  const submitMutation = useMutation<SubmitResult, Error, { regionSlug?: string; answers: { questionId: string; selectedAnswerId: string }[] }>({
    mutationFn: (data) => academyApi.submitAtlasQuiz(data),
  });

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const allAnswered = questions.length > 0 && userAnswers.size === questions.length;

  function handleSelectAnswer(answerId: string) {
    if (showFeedback) return;
    setUserAnswers(prev => new Map(prev).set(currentQuestion.id, answerId));
    setShowFeedback(true);
  }

  function handleNext() {
    setShowFeedback(false);
    setCurrentIndex(prev => prev + 1);
  }

  function handleShowSummary() {
    const answers = Array.from(userAnswers.entries()).map(([questionId, selectedAnswerId]) => ({
      questionId,
      selectedAnswerId,
    }));
    submitMutation.mutate({ regionSlug: region, answers });
    setSubmitted(true);
  }

  function handleRestart() {
    setQuestions(shuffleArray(rawQuestions ?? []));
    setCurrentIndex(0);
    setUserAnswers(new Map());
    setShowFeedback(false);
    setSubmitted(false);
  }

  function getScore(): number {
    let score = 0;
    for (const q of questions) {
      const selectedId = userAnswers.get(q.id);
      if (selectedId) {
        const correct = q.answers.find(a => a.isCorrect);
        if (correct && correct.id === selectedId) score++;
      }
    }
    return score;
  }

  if (isLoading) {
    return (
      <div className="academy-page">
        <div className="atlas-quiz">
          <div className="academy-route-loading" role="status">Ładowanie pytań…</div>
        </div>
      </div>
    );
  }

  if (isError || !rawQuestions) {
    return (
      <div className="academy-page">
        <div className="atlas-quiz">
          <p style={{ color: '#b04739' }}>Nie udało się załadować pytań. Spróbuj ponownie.</p>
          <Link to="/atlas" style={{ color: '#2e6346', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', textDecoration: 'none', fontWeight: 700 }}>
            <ArrowLeft className="w-4 h-4" /> Powrót do atlasu
          </Link>
        </div>
      </div>
    );
  }

  if (rawQuestions.length === 0) {
    return (
      <div className="academy-page">
        <div className="atlas-quiz">
          <p style={{ color: '#6c7a71' }}>Brak pytań quizowych dla {region ? `regionu "${region}"` : 'tego atlasu'}.</p>
          <Link to="/atlas" style={{ color: '#2e6346', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', textDecoration: 'none', fontWeight: 700 }}>
            <ArrowLeft className="w-4 h-4" /> Powrót do atlasu
          </Link>
        </div>
      </div>
    );
  }

  // Summary screen
  if (submitted) {
    const score = submitMutation.data?.score ?? getScore();
    const maxScore = submitMutation.data?.maxScore ?? totalQuestions;
    const pct = Math.round((score / maxScore) * 100);
    const tier = pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low';

    return (
      <div className="academy-page">
        <div className="atlas-quiz">
          <Link to="/atlas" style={{ color: '#2e6346', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>
            <ArrowLeft className="w-4 h-4" /> Powrót do atlasu
          </Link>

          <div className={`atlas-quiz-result ${tier}`}>
            <div className="atlas-quiz-score">{score}/{maxScore}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#244333', marginTop: '0.5rem' }}>
              {pct}% poprawnych odpowiedzi
            </div>
            <div style={{ color: '#6c7a71', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              {tier === 'high' && 'Doskonały wynik! Świetnie znasz temat.'}
              {tier === 'medium' && 'Dobry wynik! Jest jeszcze pole do doskonalenia.'}
              {tier === 'low' && 'Warto powtórzyć materiał i spróbować ponownie.'}
            </div>
            <button className="atlas-quiz-next" style={{ marginTop: '1.25rem' }} onClick={handleRestart}>
              <RotateCcw className="w-4 h-4" style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Spróbuj ponownie
            </button>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#244333', marginBottom: '1rem' }}>
            Przegląd odpowiedzi
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions.map((q, idx) => {
              const selectedId = userAnswers.get(q.id);
              const correctAnswer = q.answers.find(a => a.isCorrect);
              const isCorrect = selectedId && correctAnswer && selectedId === correctAnswer.id;
              const selectedAnswer = q.answers.find(a => a.id === selectedId);

              return (
                <div key={q.id} style={{ padding: '1rem', border: '1px solid #e2e8e2', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}` }}>
                  <div className="atlas-quiz-condition-tag">{q.condition.name}</div>
                  <div style={{ fontWeight: 600, color: '#244333', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    {idx + 1}. {q.questionText}
                  </div>
                  <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4" style={{ color: '#22c55e', flexShrink: 0 }} />
                    ) : (
                      <XCircle className="w-4 h-4" style={{ color: '#ef4444', flexShrink: 0 }} />
                    )}
                    <span style={{ color: isCorrect ? '#166534' : '#991b1b' }}>
                      Twoja odpowiedź: {selectedAnswer?.text ?? '—'}
                    </span>
                  </div>
                  {!isCorrect && correctAnswer && (
                    <div style={{ fontSize: '0.875rem', color: '#166534', marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                      Poprawna: {correctAnswer.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  if (!currentQuestion) return null;

  const selectedAnswerId = userAnswers.get(currentQuestion.id);
  const correctAnswer = currentQuestion.answers.find(a => a.isCorrect);
  const progress = ((currentIndex) / totalQuestions) * 100;

  return (
    <div className="academy-page">
      <div className="atlas-quiz">
        <Link to="/atlas" style={{ color: '#2e6346', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>
          <ArrowLeft className="w-4 h-4" /> Powrót do atlasu
        </Link>

        <div className="atlas-quiz-progress">
          <span style={{ fontSize: '0.85rem', color: '#6c7a71', whiteSpace: 'nowrap' }}>
            {currentIndex + 1} / {totalQuestions}
          </span>
          <div className="atlas-quiz-progress-bar">
            <div className="atlas-quiz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="atlas-quiz-condition-tag">{currentQuestion.condition.name}</div>

        {currentQuestion.questionImageUrl && (
          <img
            src={currentQuestion.questionImageUrl}
            alt=""
            className="atlas-quiz-question-image"
          />
        )}

        <div className="atlas-quiz-question">{currentQuestion.questionText}</div>

        <div className="atlas-quiz-answers">
          {currentQuestion.answers
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(answer => {
              let cls = 'atlas-quiz-answer';
              if (showFeedback) {
                if (answer.isCorrect) cls += ' correct';
                else if (answer.id === selectedAnswerId) cls += ' incorrect';
              } else if (answer.id === selectedAnswerId) {
                cls += ' selected';
              }

              return (
                <button
                  key={answer.id}
                  className={cls}
                  disabled={showFeedback}
                  onClick={() => handleSelectAnswer(answer.id)}
                >
                  {answer.text}
                </button>
              );
            })}
        </div>

        {showFeedback && (
          <div className="atlas-quiz-explanation">
            {selectedAnswerId === correctAnswer?.id ? (
              <span style={{ color: '#166534', fontWeight: 700 }}>
                <CheckCircle className="w-4 h-4" style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                Poprawna odpowiedź!
              </span>
            ) : (
              <span style={{ color: '#991b1b', fontWeight: 700 }}>
                <XCircle className="w-4 h-4" style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                Niepoprawna. Prawidłowa odpowiedź: <strong>{correctAnswer?.text}</strong>
              </span>
            )}
          </div>
        )}

        <div className="atlas-quiz-nav">
          <span style={{ fontSize: '0.8rem', color: '#9ba69d' }}>
            {allAnswered && isLastQuestion ? 'Wszystkie pytania odpowiedziane' : ''}
          </span>
          {showFeedback && (
            isLastQuestion ? (
              <button className="atlas-quiz-next" onClick={handleShowSummary}>
                Zobacz wyniki
                <ChevronRight className="w-4 h-4" style={{ display: 'inline', marginLeft: '0.3rem', verticalAlign: 'middle' }} />
              </button>
            ) : (
              <button className="atlas-quiz-next" onClick={handleNext}>
                Następne pytanie
                <ChevronRight className="w-4 h-4" style={{ display: 'inline', marginLeft: '0.3rem', verticalAlign: 'middle' }} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

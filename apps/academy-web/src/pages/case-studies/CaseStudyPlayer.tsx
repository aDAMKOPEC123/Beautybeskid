import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

type StepType = 'INTERVIEW' | 'DIAGNOSIS' | 'TREATMENT' | 'RESULT';
type ImageType = 'BEFORE' | 'DURING' | 'AFTER';

interface CaseAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  order: number;
}

interface CaseImage {
  id: string;
  url: string;
  alt?: string;
  type: ImageType;
  order: number;
}

interface CaseStep {
  id: string;
  type: StepType;
  content: string;
  question?: string;
  multiSelect: boolean;
  order: number;
  answers: CaseAnswer[];
  images: CaseImage[];
}

interface DiagnosticCase {
  id: string;
  title: string;
  clientName: string;
  clientAge: number;
  clientDescription: string;
  regionSlug?: string;
  course?: { slug: string };
  steps: CaseStep[];
}

const STEP_LABELS: Record<StepType, string> = {
  INTERVIEW: 'Wywiad',
  DIAGNOSIS: 'Diagnoza',
  TREATMENT: 'Leczenie',
  RESULT: 'Wynik',
};

const IMAGE_LABELS: Record<ImageType, string> = {
  BEFORE: 'Przed',
  DURING: 'W trakcie',
  AFTER: 'Po',
};

export function CaseStudyPlayer() {
  const { slug, id } = useParams<{ slug: string; id: string }>();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [showFeedback, setShowFeedback] = useState<Map<string, boolean>>(new Map());
  const [submitted, setSubmitted] = useState(false);

  const { data: caseStudy, isLoading, isError } = useQuery<DiagnosticCase>({
    queryKey: ['academy', 'case', id],
    queryFn: () => academyApi.getDiagnosticCase(id!),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (stepAnswers: { stepId: string; selectedAnswerIds: string[] }[]) =>
      academyApi.submitDiagnosticCaseAttempt(id!, stepAnswers),
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) {
    return (
      <div className="case-player animate-pulse space-y-4">
        <div style={{ height: 8, background: '#e2e8e2', borderRadius: 4, marginBottom: '1rem' }} />
        <div style={{ height: 120, background: '#e8eee8', borderRadius: 10 }} />
        <div style={{ height: 200, background: '#e8eee8', borderRadius: 10 }} />
      </div>
    );
  }

  if (isError || !caseStudy) {
    return (
      <div className="case-player">
        <div className="academy-empty">
          <XCircle />
          <h2>Nie udało się załadować przypadku</h2>
          <p>Spróbuj odświeżyć stronę.</p>
        </div>
      </div>
    );
  }

  const steps = [...caseStudy.steps].sort((a, b) => a.order - b.order);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const stepAnswers = answers.get(step.id) ?? [];
  const feedbackShown = showFeedback.get(step.id) ?? false;
  const hasQuestion = Boolean(step.question) && step.answers.length > 0;
  const isResultStep = step.type === 'RESULT';

  // Compute score
  const stepsWithQuestions = steps.filter((s) => s.question && s.answers.length > 0);
  const correctCount = stepsWithQuestions.filter((s) => {
    const selected = answers.get(s.id) ?? [];
    const correctIds = s.answers.filter((a) => a.isCorrect).map((a) => a.id);
    if (selected.length !== correctIds.length) return false;
    return correctIds.every((cid) => selected.includes(cid));
  }).length;
  const maxScore = stepsWithQuestions.length;
  const scorePercent = maxScore > 0 ? (correctCount / maxScore) * 100 : 100;

  function handleToggleAnswer(answerId: string) {
    if (feedbackShown) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      const current = next.get(step.id) ?? [];
      if (step.multiSelect) {
        next.set(
          step.id,
          current.includes(answerId) ? current.filter((id) => id !== answerId) : [...current, answerId],
        );
      } else {
        next.set(step.id, current.includes(answerId) ? [] : [answerId]);
      }
      return next;
    });
  }

  function handleCheckAnswer() {
    setShowFeedback((prev) => {
      const next = new Map(prev);
      next.set(step.id, true);
      return next;
    });
  }

  function handleNext() {
    if (isLastStep) {
      // Build payload from all steps
      const stepAnswersPayload = steps
        .filter((s) => s.question && s.answers.length > 0)
        .map((s) => ({ stepId: s.id, selectedAnswerIds: answers.get(s.id) ?? [] }));
      mutation.mutate(stepAnswersPayload);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  function getAnswerClass(answer: CaseAnswer): string {
    const selected = stepAnswers.includes(answer.id);
    if (!feedbackShown) return selected ? 'case-answer-option selected' : 'case-answer-option';
    if (answer.isCorrect) return 'case-answer-option correct';
    if (selected && !answer.isCorrect) return 'case-answer-option incorrect';
    return 'case-answer-option';
  }

  const sortedAnswers = [...step.answers].sort((a, b) => a.order - b.order);
  const sortedImages = [...step.images].sort((a, b) => a.order - b.order);

  // Result / final score screen
  const showFinalScore = isResultStep && submitted;

  return (
    <div className="case-player">
      {/* Progress bar */}
      <div className="case-progress">
        <span className="case-step-label">{STEP_LABELS[step.type]}</span>
        <div className="case-progress-bar">
          <div className="case-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span style={{ fontSize: 12, color: '#6c7a71', whiteSpace: 'nowrap' }}>
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Client info */}
      <div className="case-client">
        <div className="case-client-name">{caseStudy.clientName}, {caseStudy.clientAge} lat</div>
        <p style={{ fontSize: '0.88rem', color: '#52665a', marginTop: '0.35rem' }}>{caseStudy.clientDescription}</p>
      </div>

      {/* Step images */}
      {sortedImages.length > 0 && (
        <div className="case-images">
          {sortedImages.map((img) => (
            <figure key={img.id}>
              <img src={img.url} alt={img.alt ?? IMAGE_LABELS[img.type]} />
              <div className="case-image-tag">{IMAGE_LABELS[img.type]}</div>
            </figure>
          ))}
        </div>
      )}

      {/* Step content */}
      <div
        style={{ lineHeight: 1.7, color: '#334a3c', fontSize: '0.95rem', marginBottom: '1rem' }}
        dangerouslySetInnerHTML={{ __html: step.content }}
      />

      {/* Question + answers */}
      {hasQuestion && !isResultStep && (
        <>
          <div className="case-question">{step.question}</div>

          <div role="group" aria-label="Odpowiedzi">
            {sortedAnswers.map((answer) => (
              <div
                key={answer.id}
                className={getAnswerClass(answer)}
                onClick={() => handleToggleAnswer(answer.id)}
                role={step.multiSelect ? 'checkbox' : 'radio'}
                aria-checked={stepAnswers.includes(answer.id)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleToggleAnswer(answer.id); }}
              >
                <span style={{ flex: 1 }}>{answer.text}</span>
                {feedbackShown && answer.isCorrect && (
                  <CheckCircle2 style={{ width: 18, height: 18, color: '#22c55e', flexShrink: 0 }} />
                )}
                {feedbackShown && !answer.isCorrect && stepAnswers.includes(answer.id) && (
                  <XCircle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {feedbackShown && sortedAnswers
            .filter((a) => (stepAnswers.includes(a.id) || a.isCorrect) && a.explanation)
            .map((a) => (
              <div
                key={a.id}
                className={`case-feedback ${a.isCorrect ? 'correct' : 'incorrect'}`}
              >
                <strong>{a.isCorrect ? 'Poprawna odpowiedź:' : 'Twoja odpowiedź:'}</strong> {a.explanation}
              </div>
            ))
          }

          {!feedbackShown && (
            <div className="case-nav" style={{ justifyContent: 'flex-start', marginTop: '1.5rem' }}>
              <button
                className="case-btn"
                onClick={handleCheckAnswer}
                disabled={stepAnswers.length === 0}
              >
                Sprawdź odpowiedź
              </button>
            </div>
          )}
        </>
      )}

      {/* Final score summary on RESULT step */}
      {isResultStep && (
        <>
          {showFinalScore ? (
            <div
              className={`case-result-score ${scorePercent >= 70 ? 'high' : scorePercent >= 40 ? 'medium' : 'low'}`}
            >
              <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                {correctCount}/{maxScore}
              </div>
              <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                Twój wynik: {correctCount}/{maxScore} prawidłowych odpowiedzi
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c7a71', marginTop: '0.25rem' }}>
                {scorePercent >= 70
                  ? 'Świetna robota! Opanowałaś ten przypadek.'
                  : scorePercent >= 40
                  ? 'Nieźle, ale warto powtórzyć materiał.'
                  : 'Wróć do materiałów kursu i spróbuj ponownie.'}
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#edf4ee', borderRadius: 10 }}>
              <p style={{ color: '#52665a', fontSize: '0.9rem' }}>
                Zapoznałaś się z wszystkimi krokami tego przypadku. Kliknij „Zakończ i sprawdź wynik", aby zobaczyć swój rezultat.
              </p>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="case-nav">
        <Link
          to={`/kurs/${slug}/przypadki`}
          style={{ fontSize: '0.85rem', color: '#6c7a71', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Wszystkie przypadki
        </Link>

        {(!isResultStep || !submitted) && (
          <button
            className="case-btn"
            onClick={handleNext}
            disabled={
              (hasQuestion && !isResultStep && !feedbackShown) ||
              mutation.isPending
            }
          >
            {isLastStep
              ? mutation.isPending
                ? 'Zapisywanie…'
                : 'Zakończ i sprawdź wynik'
              : 'Następny krok'}
          </button>
        )}
      </div>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, User } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface CaseStudySummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  difficulty: Difficulty;
  clientName: string;
  clientAge: number;
  _count: { steps: number; attempts: number };
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: 'Łatwy',
  MEDIUM: 'Średni',
  HARD: 'Trudny',
};

const DIFFICULTY_CSS: Record<Difficulty, string> = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export function CaseStudyList() {
  const { slug } = useParams<{ slug: string }>();

  const { data: cases = [], isLoading, isError } = useQuery<CaseStudySummary[]>({
    queryKey: ['academy', 'cases', slug],
    queryFn: () => academyApi.getDiagnosticCasesForCourse(slug!),
    enabled: Boolean(slug),
  });

  return (
    <div className="academy-page">
      <div className="atlas-breadcrumb">
        <Link to={`/kurs/${slug}`}>
          <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
          Powrót do kursu
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p className="academy-kicker" style={{ color: '#b47c35' }}>Diagnostyka praktyczna</p>
        <h1 className="font-heading" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a3828' }}>
          Przypadki diagnostyczne
        </h1>
        <p style={{ color: '#6c7a71', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Ćwicz rozpoznawanie i leczenie w oparciu o realne przypadki kliniczne.
        </p>
      </div>

      {isLoading && (
        <div className="case-list-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse" style={{ height: 260, background: '#e8eee8', borderRadius: 12 }} />
          ))}
        </div>
      )}

      {isError && (
        <div className="academy-empty">
          <BookOpen />
          <h2>Nie udało się pobrać przypadków</h2>
          <p>Spróbuj odświeżyć stronę.</p>
        </div>
      )}

      {!isLoading && !isError && cases.length === 0 && (
        <div className="academy-empty">
          <BookOpen />
          <h2>Ten kurs nie ma jeszcze case studies</h2>
          <p>Przypadki diagnostyczne pojawią się tutaj po ich dodaniu.</p>
        </div>
      )}

      {!isLoading && !isError && cases.length > 0 && (
        <div className="case-list-grid">
          {cases.map((cs) => (
            <Link
              key={cs.id}
              to={`/kurs/${slug}/przypadek/${cs.id}`}
              className="case-card"
            >
              {cs.thumbnailUrl ? (
                <img src={cs.thumbnailUrl} alt={cs.title} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 160,
                    background: 'linear-gradient(135deg, #edf4ee 0%, #d4e8d8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen style={{ width: 40, height: 40, color: '#2e6346', opacity: 0.5 }} />
                </div>
              )}
              <div className="case-card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className={`case-difficulty ${DIFFICULTY_CSS[cs.difficulty]}`}>
                    {DIFFICULTY_LABELS[cs.difficulty]}
                  </span>
                  <span style={{ fontSize: 12, color: '#6c7a71' }}>
                    {cs._count.steps} {cs._count.steps === 1 ? 'krok' : 'kroków'}
                  </span>
                </div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#1a3828', marginBottom: '0.4rem' }}>
                  {cs.title}
                </h2>
                {cs.description && (
                  <p style={{ fontSize: '0.83rem', color: '#6c7a71', marginBottom: '0.6rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {cs.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12, color: '#52665a' }}>
                  <User style={{ width: 13, height: 13 }} />
                  <span>Klientka: {cs.clientName}, {cs.clientAge} lat</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

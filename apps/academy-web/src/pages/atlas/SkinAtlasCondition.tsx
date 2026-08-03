import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, BookOpen, HelpCircle } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

const SEVERITY_LABELS: Record<string, string> = {
  MILD: 'Łagodny',
  MODERATE: 'Umiarkowany',
  SEVERE: 'Ciężki',
};

const SEVERITY_COLORS: Record<string, string> = {
  MILD: '#2e6346',
  MODERATE: '#b47c35',
  SEVERE: '#b04739',
};

interface AtlasImage {
  id: string;
  url: string;
  severity?: string;
  caption?: string;
}

interface RelatedCourse {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
}

interface AtlasConditionDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  causes?: string;
  treatments?: string;
  contraindications?: string;
  images: AtlasImage[];
  relatedCourse?: RelatedCourse;
  region: { id: string; name: string; slug: string };
  _count?: { quizQuestions: number };
}

function RichSection({ title, html }: { title: string; html?: string }) {
  if (!html) return null;
  return (
    <div className="atlas-section">
      <h3>{title}</h3>
      <div
        style={{ color: '#3d5247', lineHeight: 1.75, fontSize: '0.95rem' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function SkinAtlasCondition() {
  const { region: regionSlug, condition: conditionSlug } = useParams<{
    region: string;
    condition: string;
  }>();

  const { data: condition, isLoading } = useQuery<AtlasConditionDetail>({
    queryKey: ['academy', 'atlas', 'condition', regionSlug, conditionSlug],
    queryFn: () => academyApi.getAtlasCondition(regionSlug!, conditionSlug!),
    enabled: Boolean(regionSlug) && Boolean(conditionSlug),
  });

  const severityImages = condition?.images.filter((img) => img.severity) ?? [];
  const quizCount = condition?._count?.quizQuestions ?? 0;

  return (
    <div className="academy-page">
      <div className="atlas-breadcrumb">
        <Link to="/atlas">Atlas</Link>
        <ChevronRight className="w-3 h-3" />
        {condition ? (
          <Link to={`/atlas/${condition.region.slug}`}>{condition.region.name}</Link>
        ) : (
          <Link to={`/atlas/${regionSlug}`}>{regionSlug}</Link>
        )}
        <ChevronRight className="w-3 h-3" />
        <span>{isLoading ? '…' : (condition?.name ?? conditionSlug)}</span>
      </div>

      {isLoading && (
        <div>
          <div
            className="animate-pulse"
            style={{ height: 32, width: 280, background: '#e5ede6', borderRadius: 6, marginBottom: '1.5rem' }}
          />
          <div
            className="animate-pulse"
            style={{ height: 150, background: '#f0f5f0', borderRadius: 10 }}
          />
        </div>
      )}

      {!isLoading && condition && (
        <>
          <div className="atlas-page-header">
            <h1>{condition.name}</h1>
            {quizCount > 0 && (
              <Link to={`/atlas/quiz?region=${condition.region.slug}`} className="atlas-quiz-link">
                <HelpCircle className="w-4 h-4" />
                Sprawdz sie w quizie
              </Link>
            )}
          </div>

          {/* Severity gallery */}
          {severityImages.length > 0 && (
            <div className="atlas-section">
              <h3>Galeria nasilenia</h3>
              <div className="atlas-severity-gallery">
                {severityImages.map((img) => (
                  <div key={img.id} className="atlas-severity-card">
                    <img src={img.url} alt={img.caption ?? img.severity ?? 'Zdjęcie'} />
                    {img.severity && (
                      <div
                        className="atlas-severity-label"
                        style={{ color: SEVERITY_COLORS[img.severity] ?? '#244333' }}
                      >
                        {SEVERITY_LABELS[img.severity] ?? img.severity}
                      </div>
                    )}
                    {img.caption && (
                      <div style={{ fontSize: '11px', color: '#6c7a71', marginTop: '0.25rem' }}>
                        {img.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rich text sections */}
          <RichSection title="Opis" html={condition.description} />
          <RichSection title="Przyczyny" html={condition.causes} />
          <RichSection title="Metody leczenia" html={condition.treatments} />
          <RichSection title="Przeciwwskazania" html={condition.contraindications} />

          {/* Related course cross-sell */}
          {condition.relatedCourse && (
            <div className="atlas-crosssell">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                {condition.relatedCourse.coverImageUrl && (
                  <img
                    src={condition.relatedCourse.coverImageUrl}
                    alt={condition.relatedCourse.title}
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#2e6346',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Powiązany kurs
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#244333',
                    }}
                  >
                    {condition.relatedCourse.title}
                  </div>
                </div>
                <Link
                  to={`/kurs/${condition.relatedCourse.slug}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.2rem',
                    borderRadius: 8,
                    background: '#2e6346',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                  Naucz sie to leczyc
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, HelpCircle } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

interface AtlasCondition {
  id: string;
  name: string;
  slug: string;
  images?: Array<{ id: string; url: string; severity?: string }>;
  _count?: { quizQuestions: number };
}

interface AtlasRegionDetail {
  id: string;
  name: string;
  slug: string;
  parent?: { slug: string; name: string } | null;
  children?: Array<{ id: string; name: string; slug: string; _count: { conditions: number; children: number } }>;
  conditions: AtlasCondition[];
}

export function SkinAtlasRegion() {
  const { region: slug } = useParams<{ region: string }>();

  const { data: region, isLoading } = useQuery<AtlasRegionDetail>({
    queryKey: ['academy', 'atlas', 'region', slug],
    queryFn: () => academyApi.getAtlasRegion(slug!),
    enabled: Boolean(slug),
  });

  return (
    <div className="academy-page">
      <div className="atlas-breadcrumb">
        <Link to="/atlas">Atlas</Link>
        {region?.parent && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/atlas?parent=${region.parent.slug}`}>{region.parent.name}</Link>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span>{isLoading ? '…' : (region?.name ?? slug)}</span>
      </div>

      {isLoading && (
        <div className="atlas-condition-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="atlas-condition-card animate-pulse"
              style={{ height: 240, background: '#f0f5f0' }}
            />
          ))}
        </div>
      )}

      {!isLoading && region && (
        <>
          <div className="atlas-page-header">
            <h1>{region.name}</h1>
          </div>

          {/* Show child sub-regions if they exist */}
          {region.children && region.children.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#244333', marginBottom: '0.75rem' }}>Podregiony</h2>
              <div className="atlas-condition-grid">
                {region.children.map((child) => (
                  <Link
                    key={child.id}
                    to={`/atlas/${child.slug}`}
                    className="atlas-condition-card"
                  >
                    <div
                      style={{
                        width: '100%',
                        height: 120,
                        background: '#d8ead9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                      }}
                    >
                      📍
                    </div>
                    <div className="atlas-card-body">
                      <div style={{ fontWeight: 700, color: '#244333', fontSize: '0.95rem' }}>
                        {child.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6c7a71', marginTop: '0.3rem' }}>
                        {child._count.conditions} schorzeń
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {region.conditions.length === 0 && (!region.children || region.children.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6c7a71' }}>
              <p>Ten region nie zawiera jeszcze żadnych schorzeń.</p>
            </div>
          ) : region.conditions.length > 0 && (
            <>
              {region.children && region.children.length > 0 && (
                <h2 style={{ fontSize: '1.1rem', color: '#244333', marginBottom: '0.75rem' }}>Schorzenia w tym regionie</h2>
              )}
              <div className="atlas-condition-grid">
                {region.conditions.map((condition) => {
                  const thumb = condition.images?.[0]?.url;
                  const quizCount = condition._count?.quizQuestions ?? 0;
                  return (
                    <Link
                      key={condition.id}
                      to={`/atlas/${slug}/${condition.slug}`}
                      className="atlas-condition-card"
                    >
                      {thumb ? (
                        <img src={thumb} alt={condition.name} />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: 160,
                            background: '#d8ead9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                          }}
                        >
                          🔬
                        </div>
                      )}
                      <div className="atlas-card-body">
                        <div style={{ fontWeight: 700, color: '#244333', fontSize: '0.95rem' }}>
                          {condition.name}
                        </div>
                        {quizCount > 0 && (
                          <div className="atlas-quiz-badge" style={{ marginTop: '0.5rem' }}>
                            <HelpCircle className="w-3 h-3" />
                            {quizCount} pytań quizowych
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

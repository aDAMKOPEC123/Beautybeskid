import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Brain, ChevronRight, ArrowLeft } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { BodySilhouette } from './BodySilhouette';

interface AtlasRegion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  hotspotX?: number;
  hotspotY?: number;
  parentId?: string | null;
  _count: { conditions: number; children: number };
}

export function SkinAtlasMap() {
  const [searchParams] = useSearchParams();
  const parentSlug = searchParams.get('parent');

  const { data: parentRegion } = useQuery({
    queryKey: ['academy', 'atlas', 'region', parentSlug],
    queryFn: () => academyApi.getAtlasRegion(parentSlug!),
    enabled: Boolean(parentSlug),
  });

  const parentId = parentRegion?.id ?? undefined;

  const { data: regions, isLoading } = useQuery<AtlasRegion[]>({
    queryKey: ['academy', 'atlas', 'regions', parentId ?? 'root'],
    queryFn: () => academyApi.getAtlasRegions(parentSlug ? parentId : null),
    enabled: parentSlug ? Boolean(parentId) : true,
  });

  const isSubView = Boolean(parentSlug && parentRegion);

  return (
    <div className="academy-page">
      {isSubView && parentRegion && (
        <div className="atlas-breadcrumb">
          <Link to="/atlas">Atlas</Link>
          <ChevronRight className="w-3 h-3" />
          <span>{parentRegion.name}</span>
        </div>
      )}

      <div className="atlas-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isSubView && (
            <Link to="/atlas" className="atlas-back-link" style={{ color: '#2e6346', display: 'flex' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1>{isSubView ? parentRegion?.name : 'Atlas skóry'}</h1>
        </div>
        <Link to="/atlas/quiz" className="atlas-quiz-link">
          <Brain className="w-4 h-4" />
          Tryb quizu
        </Link>
      </div>

      {isSubView && parentRegion && (
        <p style={{ color: '#6c7a71', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Wybierz konkretny obszar, aby zobaczyć powiązane problemy skórne.
        </p>
      )}

      {isLoading && (
        <div className="atlas-map">
          <div className="atlas-body-image animate-pulse" style={{ background: '#e5ede6' }} />
          <div className="atlas-sidebar">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="atlas-region-card animate-pulse" style={{ height: 80, background: '#f0f5f0' }} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && (!regions || regions.length === 0) && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6c7a71' }}>
          <p style={{ fontSize: '1.1rem' }}>
            {isSubView ? 'Ten region nie zawiera jeszcze żadnych podregionów.' : 'Atlas nie zawiera jeszcze żadnych regionów.'}
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Wróć tu wkrótce — administrator uzupełnia treści.</p>
        </div>
      )}

      {!isLoading && regions && regions.length > 0 && (
        <div className="atlas-map">
          {/* Body silhouette with hotspot pins */}
          <div className="atlas-body-image">
            <BodySilhouette />
            {regions
              .filter((r) => r.hotspotX != null && r.hotspotY != null)
              .map((region) => {
                const hasChildren = region._count.children > 0;
                const linkTo = hasChildren
                  ? `/atlas?parent=${region.slug}`
                  : `/atlas/${region.slug}`;
                return (
                  <Link
                    key={region.id}
                    to={linkTo}
                    className="atlas-hotspot"
                    style={{ left: `${region.hotspotX}%`, top: `${region.hotspotY}%` }}
                    aria-label={region.name}
                  >
                    <span className="atlas-hotspot-tooltip">{region.name}</span>
                  </Link>
                );
              })}
          </div>

          {/* Sidebar region list */}
          <div className="atlas-sidebar">
            {regions.map((region) => {
              const hasChildren = region._count.children > 0;
              const linkTo = hasChildren
                ? `/atlas?parent=${region.slug}`
                : `/atlas/${region.slug}`;
              const countLabel = hasChildren
                ? `${region._count.children} podregionów`
                : `${region._count.conditions} schorzeń`;

              return (
                <Link key={region.id} to={linkTo} className="atlas-region-card">
                  {region.thumbnailUrl ? (
                    <img src={region.thumbnailUrl} alt={region.name} className="atlas-region-thumb" />
                  ) : (
                    <div
                      className="atlas-region-thumb"
                      style={{ background: '#d8ead9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}
                    >
                      {hasChildren ? '🧍' : '🩺'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#244333', fontSize: '0.95rem' }}>{region.name}</div>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#2e6346',
                      background: '#edf4ee',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {countLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

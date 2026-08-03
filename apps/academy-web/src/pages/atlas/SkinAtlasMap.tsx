import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

interface AtlasRegion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  hotspotX?: number;
  hotspotY?: number;
  _count: { conditions: number };
}

export function SkinAtlasMap() {
  const { data: regions, isLoading } = useQuery<AtlasRegion[]>({
    queryKey: ['academy', 'atlas', 'regions'],
    queryFn: academyApi.getAtlasRegions,
  });

  return (
    <div className="academy-page">
      <div className="atlas-page-header">
        <h1>Atlas skóry</h1>
        <Link to="/atlas/quiz" className="atlas-quiz-link">
          <Brain className="w-4 h-4" />
          Tryb quizu
        </Link>
      </div>

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
          <p style={{ fontSize: '1.1rem' }}>Atlas nie zawiera jeszcze żadnych regionów.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Wróć tu wkrótce — administrator uzupełnia treści.</p>
        </div>
      )}

      {!isLoading && regions && regions.length > 0 && (
        <div className="atlas-map">
          {/* Body silhouette with hotspot pins — hidden on mobile via CSS */}
          <div className="atlas-body-image">
            {regions
              .filter((r) => r.hotspotX != null && r.hotspotY != null)
              .map((region) => (
                <Link
                  key={region.id}
                  to={`/atlas/${region.slug}`}
                  className="atlas-hotspot"
                  style={{ left: `${region.hotspotX}%`, top: `${region.hotspotY}%` }}
                  aria-label={region.name}
                >
                  <span className="atlas-hotspot-tooltip">{region.name}</span>
                </Link>
              ))}
          </div>

          {/* Sidebar region list */}
          <div className="atlas-sidebar">
            {regions.map((region) => (
              <Link key={region.id} to={`/atlas/${region.slug}`} className="atlas-region-card">
                {region.imageUrl ? (
                  <img src={region.imageUrl} alt={region.name} className="atlas-region-thumb" />
                ) : (
                  <div
                    className="atlas-region-thumb"
                    style={{ background: '#d8ead9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}
                  >
                    🩺
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#244333', fontSize: '0.95rem' }}>{region.name}</div>
                  {region.description && (
                    <div style={{ fontSize: '0.8rem', color: '#6c7a71', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      {region.description.length > 80
                        ? `${region.description.slice(0, 80)}…`
                        : region.description}
                    </div>
                  )}
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
                  {region._count.conditions} schorzeń
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

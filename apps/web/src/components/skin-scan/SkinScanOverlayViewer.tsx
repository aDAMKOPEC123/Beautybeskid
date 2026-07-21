import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getMetricOverlays,
  type SkinScanAngle,
  type SkinScanSession,
} from '@/api/skin-scans.api';
import { usePrivateImage } from '@/hooks/usePrivateImage';

const ANGLES: SkinScanAngle[] = ['FRONT', 'LEFT', 'RIGHT', 'FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN', 'NECK'];

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Na wprost',
  LEFT: 'Lewy półprofil',
  RIGHT: 'Prawy półprofil',
  FOREHEAD: 'Czoło',
  LEFT_CHEEK: 'Lewy policzek',
  RIGHT_CHEEK: 'Prawy policzek',
  CHIN: 'Broda',
  NECK: 'Szyja',
};

const METRIC_CONFIG = {
  wrinkles: { label: 'Zmarszczki', color: '#9333EA' },
  pigmentation: { label: 'Przebarwienia', color: '#B47832' },
  redness: { label: 'Rumień', color: '#DC2626' },
  acne: { label: 'Trądzik', color: '#EAB308' },
  skinChanges: { label: 'Zmiany skórne', color: '#F97316' },
  zoneGrid: { label: 'Siatka stref', color: '#2563EB' },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

const PrivateImg = ({
  path,
  alt,
  className,
  style,
  onLoad,
}: {
  path: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
}) => {
  const src = usePrivateImage(path);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} />;
};

type Props = {
  session: SkinScanSession;
  className?: string;
};

export const SkinScanOverlayViewer = ({ session, className }: Props) => {
  const [activeAngle, setActiveAngle] = useState<SkinScanAngle>('FRONT');
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set());
  const [opacity, setOpacity] = useState(40);
  const [loadingOverlays, setLoadingOverlays] = useState<Set<string>>(new Set());

  const analysis = session.analysis;
  if (!analysis) return null;

  const availableOverlays = new Map<MetricKey, Partial<Record<SkinScanAngle, string>>>();
  for (const [key, metric] of Object.entries(analysis.metrics)) {
    if (metric.status !== 'AVAILABLE') continue;
    const overlays = getMetricOverlays(metric);
    if (overlays && Object.keys(overlays).length > 0) {
      availableOverlays.set(key as MetricKey, overlays);
    }
  }

  // Add non-metric overlays from faceParsing
  const fp = analysis.faceParsing as Record<string, unknown> | undefined;
  const zoneGridOverlay = fp?.zoneGridOverlay as Partial<Record<SkinScanAngle, string>> | undefined;
  if (zoneGridOverlay && Object.keys(zoneGridOverlay).length > 0) {
    availableOverlays.set('zoneGrid', zoneGridOverlay);
  }
  const skinChangesOverlay = fp?.skinChangesOverlay as Partial<Record<SkinScanAngle, string>> | undefined;
  if (skinChangesOverlay && Object.keys(skinChangesOverlay).length > 0) {
    availableOverlays.set('skinChanges', skinChangesOverlay);
  }

  if (availableOverlays.size === 0) return null;

  const anglesWithOverlays = ANGLES.filter((angle) =>
    Array.from(availableOverlays.values()).some((overlays) => overlays[angle]),
  );

  if (anglesWithOverlays.length === 0) return null;

  const currentImage = session.images.find((img) => img.angle === activeAngle);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleOverlayLoad = (key: string) => {
    setLoadingOverlays((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  return (
    <section className={`rounded-2xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-[#1A3828]">Mapa zmian na zdjęciach</h2>

        {/* Scrollable angle tabs */}
        {anglesWithOverlays.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
            {anglesWithOverlays.map((angle) => (
              <button
                key={angle}
                type="button"
                onClick={() => setActiveAngle(angle)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  activeAngle === angle
                    ? 'bg-[#1A3828] text-white'
                    : 'bg-[#FAF9F6] text-muted-foreground hover:bg-[#F0EDE6]'
                }`}
              >
                {ANGLE_LABELS[angle]}
              </button>
            ))}
          </div>
        )}

        {/* Image with overlays */}
        <div className="relative mt-3 overflow-hidden rounded-xl bg-[#102219]">
          {currentImage && (
            <PrivateImg
              path={currentImage.imagePath}
              alt={`Skan: ${ANGLE_LABELS[activeAngle]}`}
              className="block w-full"
            />
          )}
          {Array.from(activeMetrics).map((metricKey) => {
            const overlays = availableOverlays.get(metricKey);
            const overlayPath = overlays?.[activeAngle];
            if (!overlayPath) return null;
            const loadKey = `${metricKey}-${activeAngle}`;
            return (
              <PrivateImg
                key={loadKey}
                path={overlayPath}
                alt={`Overlay: ${METRIC_CONFIG[metricKey].label}`}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                style={{ opacity: opacity / 100 }}
                onLoad={() => handleOverlayLoad(loadKey)}
              />
            );
          })}
          {loadingOverlays.size > 0 && (
            <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Overlay toggles — compact */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from(availableOverlays.keys()).map((metricKey) => {
            const config = METRIC_CONFIG[metricKey];
            const isActive = activeMetrics.has(metricKey);
            const hasOverlayForAngle = availableOverlays.get(metricKey)?.[activeAngle];
            return (
              <button
                key={metricKey}
                type="button"
                onClick={() => toggleMetric(metricKey)}
                disabled={!hasOverlayForAngle}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-30 ${
                  isActive
                    ? 'border-[#1A3828] bg-[#1A3828] text-white'
                    : 'border-border bg-white text-[#30483A]'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                {config.label}
              </button>
            );
          })}
        </div>

        {activeMetrics.size > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#1A3828]"
            />
            <span className="text-[10px] font-semibold text-muted-foreground">{opacity}%</span>
          </div>
        )}
      </div>
    </section>
  );
};

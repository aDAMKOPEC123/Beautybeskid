import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  getMetricOverlays,
  type SkinScanAngle,
  type SkinScanSession,
} from '@/api/skin-scans.api';
import { usePrivateImage } from '@/hooks/usePrivateImage';

const ANGLES: SkinScanAngle[] = ['FRONT', 'LEFT', 'RIGHT'];

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Na wprost',
  LEFT: 'Lewy półprofil',
  RIGHT: 'Prawy półprofil',
};

const METRIC_CONFIG = {
  wrinkles: { label: 'Zmarszczki', color: '#9333EA' },
  pigmentation: { label: 'Przebarwienia', color: '#B47832' },
  redness: { label: 'Rumień', color: '#DC2626' },
  acne: { label: 'Trądzik', color: '#EAB308' },
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

  // Add zone grid overlay from faceParsing
  const fp = analysis.faceParsing as Record<string, unknown> | undefined;
  const zoneGridOverlay = fp?.zoneGridOverlay as Partial<Record<SkinScanAngle, string>> | undefined;
  if (zoneGridOverlay && Object.keys(zoneGridOverlay).length > 0) {
    availableOverlays.set('zoneGrid', zoneGridOverlay);
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
    <section className={`rounded-3xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#9333EA]/10 p-3 text-[#7C22CE]">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#1A3828]">Mapa zmian</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Włącz warstwę, aby zobaczyć gdzie na twarzy wykryto zmiany.
            </p>
          </div>
        </div>

        {anglesWithOverlays.length > 1 && (
          <div className="mt-5 flex gap-2">
            {anglesWithOverlays.map((angle) => (
              <button
                key={angle}
                type="button"
                onClick={() => setActiveAngle(angle)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
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

        <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#102219]">
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
            <div className="absolute right-3 top-3 rounded-full bg-black/50 p-2">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  isActive
                    ? 'border-[#1A3828] bg-[#1A3828] text-white'
                    : 'border-border bg-white text-[#30483A] hover:bg-[#FAF9F6]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
                {isActive ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            );
          })}
        </div>

        {activeMetrics.size > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Przezroczystość</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#1A3828]"
            />
            <span className="w-8 text-right text-xs font-semibold text-[#1A3828]">{opacity}%</span>
          </div>
        )}
      </div>
    </section>
  );
};

import { useState } from 'react';
import { Grid3X3, Crosshair, ZoomIn, AlertTriangle } from 'lucide-react';
import {
  getMetricOverlays,
  type SkinScanAnalysis,
  type SkinScanAngle,
  type SkinScanSession,
  type SkinScanZoneCloseup,
} from '@/api/skin-scans.api';
import { usePrivateImage } from '@/hooks/usePrivateImage';

const FRONT_ZONE_ORDER = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'perioral', 'chin'] as const;

const ZONE_CLOSEUP_ORDER: SkinScanAngle[] = ['FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN', 'NECK'];

const ZONE_CLOSEUP_LABELS: Record<string, string> = {
  FOREHEAD: 'Czoło',
  LEFT_CHEEK: 'Lewy policzek',
  RIGHT_CHEEK: 'Prawy policzek',
  CHIN: 'Broda',
  NECK: 'Szyja',
};

const ZONE_COLORS: Record<string, string> = {
  forehead: '#7C3AED',
  left_cheek: '#2563EB',
  right_cheek: '#0891B2',
  nose: '#059669',
  perioral: '#D97706',
  chin: '#DC2626',
};

const severityLabel = (value: number): { text: string; className: string } => {
  if (value < 3) return { text: 'Minimalne', className: 'text-emerald-700 bg-emerald-50' };
  if (value < 8) return { text: 'Umiarkowane', className: 'text-amber-700 bg-amber-50' };
  return { text: 'Podwyższone', className: 'text-red-700 bg-red-50' };
};

const acneGradeLabel = (grade: number): string => {
  if (grade <= 1) return 'Brak / minimalne';
  if (grade === 2) return 'Łagodne';
  if (grade === 3) return 'Umiarkowane';
  return 'Nasilone';
};

const PrivateImg = ({ path, alt, className }: { path: string; alt: string; className?: string }) => {
  const src = usePrivateImage(path);
  if (!src) return <div className={`animate-pulse bg-gray-200 ${className ?? ''}`} />;
  return <img src={src} alt={alt} className={className} />;
};

const ZonePhoto = ({
  session,
  angle,
  overlayPaths,
  showOverlay,
}: {
  session: SkinScanSession;
  angle: SkinScanAngle;
  overlayPaths: Record<string, string>;
  showOverlay: string | null;
}) => {
  const image = session.images.find((img) => img.angle === angle);
  if (!image) return null;

  const overlayPath = showOverlay ? overlayPaths[showOverlay] : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#102219]">
      <PrivateImg path={image.imagePath} alt={`Zdjęcie: ${angle}`} className="block w-full" />
      {overlayPath && (
        <PrivateImg
          path={overlayPath}
          alt={`Overlay: ${showOverlay}`}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
};

const GridOverlayImage = ({ basePath, overlayPath }: { basePath: string; overlayPath: string }) => {
  const baseSrc = usePrivateImage(basePath);
  const overlaySrc = usePrivateImage(overlayPath);
  if (!baseSrc) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#102219]">
      <img src={baseSrc} alt="Skan z siatką stref" className="block w-full" />
      {overlaySrc && (
        <img
          src={overlaySrc}
          alt="Siatka stref"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
};

const OVERLAY_TYPES = [
  { key: 'acne', label: 'Trądzik', color: '#EAB308' },
  { key: 'pigmentation', label: 'Przebarwienia', color: '#B47832' },
  { key: 'redness', label: 'Rumień', color: '#DC2626' },
  { key: 'wrinkles', label: 'Zmarszczki', color: '#9333EA' },
  { key: 'skinChanges', label: 'Zmiany skórne', color: '#F97316' },
] as const;

type Props = {
  analysis: SkinScanAnalysis;
  session: SkinScanSession;
  className?: string;
};

export const SkinScanZoneMap = ({ analysis, session, className }: Props) => {
  const [selectedZone, setSelectedZone] = useState<SkinScanAngle | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  const zoneCloseups = analysis.faceParsing?.zoneCloseups;
  const zones = analysis.faceParsing?.zones;
  const gridOverlay = analysis.faceParsing?.zoneGridOverlay;
  const hasCloseups = zoneCloseups && Object.keys(zoneCloseups).length > 0;
  const hasZones = zones && Object.keys(zones).length > 0;

  if (!hasCloseups && !hasZones) return null;

  // Collect all overlays for each angle from metrics
  const overlaysByAngle: Record<string, Record<string, string>> = {};
  for (const [key, m] of Object.entries(analysis.metrics)) {
    if (m.status !== 'AVAILABLE') continue;
    const ov = getMetricOverlays(m);
    if (!ov) continue;
    for (const [angle, path] of Object.entries(ov)) {
      if (!path) continue;
      if (!overlaysByAngle[angle]) overlaysByAngle[angle] = {};
      overlaysByAngle[angle][key] = path;
    }
  }
  // skinChanges overlay from faceParsing
  const skinChangesOv = analysis.faceParsing?.skinChangesOverlay;
  if (skinChangesOv) {
    for (const [angle, path] of Object.entries(skinChangesOv)) {
      if (!path) continue;
      if (!overlaysByAngle[angle]) overlaysByAngle[angle] = {};
      overlaysByAngle[angle].skinChanges = path;
    }
  }

  const frontImage = session.images.find((img) => img.angle === 'FRONT');
  const gridPath = gridOverlay?.FRONT;

  const availableCloseupAngles = ZONE_CLOSEUP_ORDER.filter(
    (a) => zoneCloseups?.[a] && session.images.some((img) => img.angle === a),
  );

  return (
    <section className={`rounded-3xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#2563EB]/10 p-3 text-[#1D4ED8]">
            <Crosshair className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#1A3828]">Analiza stref</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasCloseups
                ? 'Każda strefa przeanalizowana ze zbliżenia — trądzik, przebarwienia, rumień i zmarszczki.'
                : 'Twarz podzielona na strefy z analizą przebarwień i zaczerwienienia.'}
            </p>
          </div>
        </div>

        {/* Zone close-up cards (primary when available) */}
        {hasCloseups && (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              {availableCloseupAngles.map((angle) => (
                <button
                  key={angle}
                  type="button"
                  onClick={() => {
                    setSelectedZone(selectedZone === angle ? null : angle);
                    setActiveOverlay(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    selectedZone === angle
                      ? 'bg-[#1A3828] text-white'
                      : 'bg-[#FAF9F6] text-muted-foreground hover:bg-[#F0EDE6]'
                  }`}
                >
                  {ZONE_CLOSEUP_LABELS[angle]}
                </button>
              ))}
            </div>

            {/* Selected zone detail view */}
            {selectedZone && zoneCloseups?.[selectedZone] && (
              <ZoneDetailView
                angle={selectedZone}
                data={zoneCloseups[selectedZone]}
                session={session}
                overlays={overlaysByAngle[selectedZone] ?? {}}
                activeOverlay={activeOverlay}
                onToggleOverlay={(key) => setActiveOverlay(activeOverlay === key ? null : key)}
              />
            )}

            {/* Summary grid when nothing selected */}
            {!selectedZone && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableCloseupAngles.map((angle) => {
                  const zd = zoneCloseups![angle]!;
                  return (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => { setSelectedZone(angle); setActiveOverlay(null); }}
                      className="rounded-2xl border border-border/70 bg-[#FAF9F6] p-4 text-left transition-all hover:border-border hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#1A3828]">{ZONE_CLOSEUP_LABELS[angle]}</h3>
                        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <MetricRow label="Przebarwienia" value={`${zd.pigmentationCoverage}%`} severity={severityLabel(zd.pigmentationCoverage)} />
                        <MetricRow label="Rumień" value={`${zd.rednessCoverage}%`} severity={severityLabel(zd.rednessCoverage)} />
                        {zd.acneGrade != null && (
                          <MetricRow label="Trądzik" value={acneGradeLabel(zd.acneGrade)} />
                        )}
                        {zd.acneLesionCount != null && zd.acneLesionCount > 0 && (
                          <MetricRow label="Wykryte zmiany" value={String(zd.acneLesionCount)} />
                        )}
                        {zd.wrinkleCoverage != null && (
                          <MetricRow label="Zmarszczki" value={`${zd.wrinkleCoverage}%`} />
                        )}
                        {zd.anomalyCount != null && zd.anomalyCount > 0 && (
                          <MetricRow label="Anomalie" value={String(zd.anomalyCount)} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* FRONT zone grid (always shown if available) */}
        {frontImage && gridPath && hasZones && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-[#1A3828]">Siatka stref (zdjęcie frontalne)</h3>
            </div>
            <div className="mt-3">
              <GridOverlayImage basePath={frontImage.imagePath} overlayPath={gridPath} />
              <div className="mt-2 flex flex-wrap gap-2">
                {FRONT_ZONE_ORDER.map((zoneKey) => {
                  const zone = zones![zoneKey];
                  if (!zone) return null;
                  return (
                    <div key={zoneKey} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ZONE_COLORS[zoneKey] }} />
                      {zone.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const MetricRow = ({ label, value, severity }: { label: string; value: string; severity?: { text: string; className: string } }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">
      <span className="font-semibold text-[#1A3828]">{value}</span>
      {severity && (
        <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold ${severity.className}`}>
          {severity.text}
        </span>
      )}
    </div>
  </div>
);

const ZoneDetailView = ({
  angle,
  data,
  session,
  overlays,
  activeOverlay,
  onToggleOverlay,
}: {
  angle: SkinScanAngle;
  data: SkinScanZoneCloseup;
  session: SkinScanSession;
  overlays: Record<string, string>;
  activeOverlay: string | null;
  onToggleOverlay: (key: string) => void;
}) => {
  const pigSev = severityLabel(data.pigmentationCoverage);
  const redSev = severityLabel(data.rednessCoverage);
  const hasOverlays = Object.keys(overlays).length > 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Zone photo with overlay */}
      <ZonePhoto session={session} angle={angle} overlayPaths={overlays} showOverlay={activeOverlay} />

      {/* Overlay toggle buttons */}
      {hasOverlays && (
        <div className="flex flex-wrap gap-2">
          {OVERLAY_TYPES.map(({ key, label, color }) => {
            if (!overlays[key]) return null;
            const isActive = activeOverlay === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggleOverlay(key)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-[#1A3828] bg-[#1A3828] text-white'
                    : 'border-border bg-white text-[#30483A] hover:bg-[#FAF9F6]'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Zone metrics */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Pigmentation */}
        <div className="rounded-2xl border border-border/70 bg-[#FAF9F6] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Przebarwienia</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pigSev.className}`}>{pigSev.text}</span>
          </div>
          <p className="mt-1 text-xl font-semibold text-[#1A3828]">{data.pigmentationCoverage}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, data.pigmentationCoverage * 3)}%`, backgroundColor: '#B47832' }} />
          </div>
        </div>

        {/* Redness */}
        <div className="rounded-2xl border border-border/70 bg-[#FAF9F6] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Rumień / zaczerwienienie</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${redSev.className}`}>{redSev.text}</span>
          </div>
          <p className="mt-1 text-xl font-semibold text-[#1A3828]">{data.rednessCoverage}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, data.rednessCoverage * 3)}%`, backgroundColor: '#DC2626' }} />
          </div>
        </div>

        {/* Acne */}
        {data.acneGrade != null && (
          <div className="rounded-2xl border border-border/70 bg-[#FAF9F6] p-4">
            <span className="text-xs font-medium text-muted-foreground">Nasilenie trądziku</span>
            <p className="mt-1 text-xl font-semibold text-[#1A3828]">{data.acneGrade}/4</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{acneGradeLabel(data.acneGrade)}</p>
            {data.acneLesionCount != null && data.acneLesionCount > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span className="font-medium text-amber-800">Wykryto {data.acneLesionCount} zmian</span>
              </div>
            )}
          </div>
        )}

        {/* Wrinkles */}
        {data.wrinkleCoverage != null && (
          <div className="rounded-2xl border border-border/70 bg-[#FAF9F6] p-4">
            <span className="text-xs font-medium text-muted-foreground">Zmarszczki</span>
            <p className="mt-1 text-xl font-semibold text-[#1A3828]">{data.wrinkleCoverage}%</p>
            <p className="mt-0.5 text-xs text-muted-foreground">pokrycia obszaru skóry</p>
          </div>
        )}
      </div>
    </div>
  );
};

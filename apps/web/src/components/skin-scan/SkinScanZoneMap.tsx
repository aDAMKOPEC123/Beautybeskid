import { useState } from 'react';
import { ArrowLeft, Camera, Grid3X3, ZoomIn, AlertTriangle } from 'lucide-react';
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

const ZONE_LABELS: Record<string, string> = {
  FOREHEAD: 'Czoło',
  LEFT_CHEEK: 'L. policzek',
  RIGHT_CHEEK: 'P. policzek',
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

const severity = (value: number): { text: string; cls: string } => {
  if (value < 1.5) return { text: 'OK', cls: 'text-emerald-700 bg-emerald-50' };
  if (value < 4) return { text: 'Lekkie', cls: 'text-lime-800 bg-lime-50' };
  if (value < 8) return { text: 'Średnie', cls: 'text-amber-800 bg-amber-50' };
  if (value < 15) return { text: 'Widoczne', cls: 'text-orange-800 bg-orange-50' };
  return { text: 'Nasilone', cls: 'text-red-800 bg-red-50' };
};

const acneLabel = (grade: number): { text: string; cls: string } => {
  if (grade <= 1) return { text: 'OK', cls: 'text-emerald-700 bg-emerald-50' };
  if (grade === 2) return { text: 'Lekki', cls: 'text-amber-800 bg-amber-50' };
  if (grade === 3) return { text: 'Średni', cls: 'text-orange-800 bg-orange-50' };
  return { text: 'Nasilony', cls: 'text-red-800 bg-red-50' };
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

  if (session.imagesDeletedAt || !image.imagePath) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl bg-gray-50">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Camera className="h-5 w-5 opacity-40" />
          <span className="text-[10px]">Zdjęcie usunięte</span>
        </div>
      </div>
    );
  }

  const overlayPath = showOverlay ? overlayPaths[showOverlay] : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#102219]">
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

const OVERLAY_TYPES = [
  { key: 'acne', label: 'Trądzik', color: '#EAB308' },
  { key: 'pigmentation', label: 'Przebarw.', color: '#B47832' },
  { key: 'redness', label: 'Rumień', color: '#DC2626' },
  { key: 'wrinkles', label: 'Zmarszczki', color: '#9333EA' },
  { key: 'skinChanges', label: 'Zmiany', color: '#F97316' },
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

  // Collect overlays per angle
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

  const availableAngles = ZONE_CLOSEUP_ORDER.filter(
    (a) => zoneCloseups?.[a] && session.images.some((img) => img.angle === a),
  );

  return (
    <section className={`rounded-2xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#1A3828]">Analiza stref</h2>

        {hasCloseups && (
          <>
            {/* Zone detail view */}
            {selectedZone && zoneCloseups?.[selectedZone] ? (
              <div className="mt-3">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setSelectedZone(null); setActiveOverlay(null); }}
                  className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-[#1A3828]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Wszystkie strefy
                </button>

                <ZoneDetail
                  angle={selectedZone}
                  data={zoneCloseups[selectedZone]}
                  session={session}
                  overlays={overlaysByAngle[selectedZone] ?? {}}
                  activeOverlay={activeOverlay}
                  onToggleOverlay={(key) => setActiveOverlay(activeOverlay === key ? null : key)}
                />
              </div>
            ) : (
              /* Summary cards */
              <div className="mt-3 space-y-2">
                {availableAngles.map((angle) => {
                  const zd = zoneCloseups![angle]!;
                  return (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => { setSelectedZone(angle); setActiveOverlay(null); }}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-[#FAF9F6] p-3 text-left transition-all hover:border-border hover:shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-[#1A3828]">{ZONE_LABELS[angle]}</h3>
                          <ZoomIn className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          <Pill label="Przebarw." value={`${zd.pigmentationCoverage}%`} sev={severity(zd.pigmentationCoverage)} />
                          <Pill label="Rumień" value={`${zd.rednessCoverage}%`} sev={severity(zd.rednessCoverage)} />
                          {zd.acneGrade != null && (
                            <Pill label="Trądzik" value={`${zd.acneGrade}/4`} sev={acneLabel(zd.acneGrade)} />
                          )}
                          {zd.wrinkleCoverage != null && (
                            <Pill label="Zmarszcz." value={`${zd.wrinkleCoverage}%`} />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* FRONT zone grid */}
        {frontImage && gridPath && hasZones && !session.imagesDeletedAt && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-[#1A3828]">Siatka stref</h3>
            </div>
            <div className="mt-2 overflow-hidden rounded-xl bg-[#102219]">
              <GridOverlay basePath={frontImage.imagePath} overlayPath={gridPath} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {FRONT_ZONE_ORDER.map((zoneKey) => {
                const zone = zones![zoneKey];
                if (!zone) return null;
                return (
                  <div key={zoneKey} className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[zoneKey] }} />
                    {zone.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* ── Compact inline metric pill ────────────────────── */
const Pill = ({ label, value, sev }: { label: string; value: string; sev?: { text: string; cls: string } }) => (
  <span className="inline-flex items-center gap-1 text-muted-foreground">
    {label} <strong className="text-[#1A3828]">{value}</strong>
    {sev && <span className={`rounded px-1 py-px text-[9px] font-semibold ${sev.cls}`}>{sev.text}</span>}
  </span>
);

/* ── Grid overlay image ────────────────────── */
const GridOverlay = ({ basePath, overlayPath }: { basePath: string; overlayPath: string }) => {
  const baseSrc = usePrivateImage(basePath);
  const overlaySrc = usePrivateImage(overlayPath);
  if (!baseSrc) return null;
  return (
    <div className="relative">
      <img src={baseSrc} alt="Skan z siatką stref" className="block w-full" />
      {overlaySrc && (
        <img src={overlaySrc} alt="Siatka stref" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
};

/* ── Zone detail view (shown after selecting a zone) ────────────────────── */
const ZoneDetail = ({
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
  const hasOverlays = Object.keys(overlays).length > 0;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[#1A3828]">{ZONE_LABELS[angle]}</h3>

      <ZonePhoto session={session} angle={angle} overlayPaths={overlays} showOverlay={activeOverlay} />

      {/* Overlay toggles */}
      {hasOverlays && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {OVERLAY_TYPES.map(({ key, label, color }) => {
            if (!overlays[key]) return null;
            const isActive = activeOverlay === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggleOverlay(key)}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? 'border-[#1A3828] bg-[#1A3828] text-white'
                    : 'border-border bg-white text-[#30483A]'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Metrics — compact 2-col */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Przebarwienia" value={`${data.pigmentationCoverage}%`} sev={severity(data.pigmentationCoverage)} bar={data.pigmentationCoverage * 5} barColor="#B47832" />
        <MetricCard label="Rumień" value={`${data.rednessCoverage}%`} sev={severity(data.rednessCoverage)} bar={data.rednessCoverage * 5} barColor="#DC2626" />
        {data.acneGrade != null && (
          <MetricCard label="Trądzik" value={`${data.acneGrade}/4`} sev={acneLabel(data.acneGrade)} extra={
            data.acneLesionCount != null && data.acneLesionCount > 0
              ? <span className="flex items-center gap-0.5 text-[10px] text-amber-700"><AlertTriangle className="h-2.5 w-2.5" />{data.acneLesionCount} zmian</span>
              : undefined
          } />
        )}
        {data.wrinkleCoverage != null && (
          <MetricCard label="Zmarszczki" value={`${data.wrinkleCoverage}%`} />
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, sev, bar, barColor, extra }: {
  label: string;
  value: string;
  sev?: { text: string; cls: string };
  bar?: number;
  barColor?: string;
  extra?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border/60 bg-[#FAF9F6] p-2.5">
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {sev && <span className={`rounded px-1.5 py-px text-[9px] font-semibold ${sev.cls}`}>{sev.text}</span>}
    </div>
    <p className="mt-0.5 text-base font-bold text-[#1A3828]">{value}</p>
    {bar != null && barColor && (
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, bar)}%`, backgroundColor: barColor }} />
      </div>
    )}
    {extra}
  </div>
);

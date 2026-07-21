import { useState } from 'react';
import { Grid3X3, ZoomIn } from 'lucide-react';
import type { SkinScanAnalysis, SkinScanSession } from '@/api/skin-scans.api';
import { usePrivateImage } from '@/hooks/usePrivateImage';

const ZONE_ORDER = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'perioral', 'chin'] as const;

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

const ZoneCloseup = ({ path, label }: { path: string; label: string }) => {
  const src = usePrivateImage(path);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`Zbliżenie: ${label}`}
      className="h-20 w-20 rounded-xl border border-border/50 object-cover"
    />
  );
};

const GridOverlayImage = ({
  basePath,
  overlayPath,
}: {
  basePath: string;
  overlayPath: string;
}) => {
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

type Props = {
  analysis: SkinScanAnalysis;
  session: SkinScanSession;
  className?: string;
};

export const SkinScanZoneMap = ({ analysis, session, className }: Props) => {
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const zones = analysis.faceParsing?.zones;
  const gridOverlay = analysis.faceParsing?.zoneGridOverlay;

  if (!zones || Object.keys(zones).length === 0) return null;

  const frontImage = session.images.find((img) => img.angle === 'FRONT');
  const gridPath = gridOverlay?.FRONT;

  return (
    <section className={`rounded-3xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#2563EB]/10 p-3 text-[#1D4ED8]">
            <Grid3X3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#1A3828]">Siatka stref twarzy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Twarz podzielona na strefy z osobną analizą przebarwień i zaczerwienienia. Kliknij strefę, aby zobaczyć zbliżenie.
            </p>
          </div>
        </div>

        {frontImage && gridPath && (
          <div className="mt-5">
            <GridOverlayImage basePath={frontImage.imagePath} overlayPath={gridPath} />
            <div className="mt-2 flex flex-wrap gap-2">
              {ZONE_ORDER.map((zoneKey) => {
                const zone = zones[zoneKey];
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
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ZONE_ORDER.map((zoneKey) => {
            const zone = zones[zoneKey];
            if (!zone) return null;
            const color = ZONE_COLORS[zoneKey];
            const pigSev = severityLabel(zone.pigmentationCoverage);
            const redSev = severityLabel(zone.rednessCoverage);
            const isExpanded = expandedZone === zoneKey;
            return (
              <div
                key={zoneKey}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  isExpanded
                    ? 'border-[#1A3828] bg-white shadow-md'
                    : 'border-border/70 bg-[#FAF9F6] hover:border-border hover:shadow-sm'
                }`}
                onClick={() => setExpandedZone(isExpanded ? null : zoneKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className="text-sm font-semibold text-[#1A3828]">{zone.label}</h3>
                  </div>
                  {zone.closeup && (
                    <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {isExpanded && zone.closeup && (
                  <div className="mt-3 flex justify-center">
                    <ZoneCloseup path={zone.closeup} label={zone.label} />
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Przebarwienia</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1A3828]">
                        {zone.pigmentationCoverage}%
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pigSev.className}`}>
                        {pigSev.text}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, zone.pigmentationCoverage * 3)}%`,
                        backgroundColor: '#B47832',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Zaczerwienienie</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1A3828]">
                        {zone.rednessCoverage}%
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${redSev.className}`}>
                        {redSev.text}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, zone.rednessCoverage * 3)}%`,
                        backgroundColor: '#DC2626',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

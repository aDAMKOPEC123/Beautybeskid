import { useState } from 'react';
import { Camera } from 'lucide-react';
import type { SkinScanAngle, SkinScanComparison as ComparisonData } from '@/api/skin-scans.api';
import { usePrivateImage } from '@/hooks/usePrivateImage';

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Twarz', LEFT: 'Lewy profil', RIGHT: 'Prawy profil',
  FOREHEAD: 'Czoło', LEFT_CHEEK: 'L. policzek', RIGHT_CHEEK: 'P. policzek',
  CHIN: 'Broda', NECK: 'Szyja',
};

const SCORE_CLASSIFICATION = [
  { min: 85, label: 'Świetna', color: '#16a34a' },
  { min: 70, label: 'Dobra', color: '#65a30d' },
  { min: 50, label: 'Uwaga', color: '#d97706' },
  { min: 30, label: 'Problemy', color: '#ea580c' },
  { min: 0, label: 'Intensywna pielęgnacja', color: '#dc2626' },
] as const;

const getClass = (score: number) =>
  SCORE_CLASSIFICATION.find((c) => score >= c.min) ?? SCORE_CLASSIFICATION[SCORE_CLASSIFICATION.length - 1];

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(date));

const SessionPhoto = ({ path, alt }: { path: string; alt: string }) => {
  const src = usePrivateImage(path);
  if (!src) return null;
  return <img src={src} alt={alt} className="h-full w-full rounded-lg object-cover" />;
};

const PhotoPlaceholder = () => (
  <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg bg-gray-50">
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      <Camera className="h-6 w-6 opacity-40" />
      <span className="text-[10px]">Zdjęcie usunięte</span>
    </div>
  </div>
);

type Props = {
  comparison: ComparisonData;
  onClose: () => void;
};

export const SkinScanComparison = ({ comparison, onClose }: Props) => {
  const { first, latest } = comparison;
  if (!first || !latest) return null;

  const angles = latest.images
    .map((img) => img.angle)
    .filter((a): a is SkinScanAngle => a in ANGLE_LABELS);
  const [activeAngle, setActiveAngle] = useState<SkinScanAngle>(angles.includes('FRONT') ? 'FRONT' : angles[0]);

  const firstScore = first.analysis?.skinScore ?? null;
  const latestScore = latest.analysis?.skinScore ?? null;
  const delta = firstScore != null && latestScore != null ? latestScore - firstScore : null;

  const firstImage = first.images.find((img) => img.angle === activeAngle);
  const latestImage = latest.images.find((img) => img.angle === activeAngle);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1A3828]">Porównanie: pierwsza vs ostatnia</h2>
        <button type="button" onClick={onClose}
          className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-gray-100">
          Zamknij
        </button>
      </div>

      {delta !== null && (
        <div className="flex justify-center">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${
            delta > 0 ? 'bg-green-50 text-green-700' : delta < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {delta > 0 ? '+' : ''}{delta} pkt
          </span>
        </div>
      )}

      {angles.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {angles.map((angle) => (
            <button key={angle} type="button" onClick={() => setActiveAngle(angle)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                activeAngle === angle
                  ? 'bg-[#1A3828] text-white'
                  : 'bg-[#FAF9F6] text-muted-foreground hover:bg-[#F0EDE6]'
              }`}>
              {ANGLE_LABELS[angle]}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
          <div className="aspect-[3/4] overflow-hidden">
            {first.imagesDeletedAt || !firstImage?.imagePath ? (
              <PhotoPlaceholder />
            ) : (
              <SessionPhoto path={firstImage.imagePath} alt="Pierwsza analiza" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Pierwsza</p>
              <p className="text-xs text-[#1A3828]">{formatDate(first.createdAt)}</p>
            </div>
            {firstScore != null && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getClass(firstScore).color }} />
                <span className="text-sm font-bold text-[#1A3828]">{firstScore}</span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
          <div className="aspect-[3/4] overflow-hidden">
            {latest.imagesDeletedAt || !latestImage?.imagePath ? (
              <PhotoPlaceholder />
            ) : (
              <SessionPhoto path={latestImage.imagePath} alt="Ostatnia analiza" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ostatnia</p>
              <p className="text-xs text-[#1A3828]">{formatDate(latest.createdAt)}</p>
            </div>
            {latestScore != null && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getClass(latestScore).color }} />
                <span className="text-sm font-bold text-[#1A3828]">{latestScore}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

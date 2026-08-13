import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Check, Loader2, X } from 'lucide-react';
import { cropFileToBlob, type CropAreaPercent } from '@/lib/cropImage';

export type CropAspect = number | 'free';

const ASPECT_CHOICES: { label: string; value: CropAspect }[] = [
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  // Kadr w proporcjach wczytanego obrazu — ramka obejmuje wtedy całe zdjęcie.
  { label: 'Jak oryginał', value: 'free' },
];

interface ImageCropDialogProps {
  file: File;
  aspect: CropAspect;
  lockAspect?: boolean;
  onCancel: () => void;
  /** Zwraca komunikat błędu, jeśli zapis się nie udał, albo `null` przy
   *  powodzeniu — okno musi wiedzieć, czy ma odblokować przyciski. */
  onConfirm: (cropped: Blob) => Promise<string | null>;
}

export function ImageCropDialog({ file, aspect, lockAspect, onCancel, onConfirm }: ImageCropDialogProps) {
  const [src, setSrc] = useState('');
  const [naturalRatio, setNaturalRatio] = useState(1);
  const [ratio, setRatio] = useState<CropAspect>(aspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropAreaPercent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Proporcje wczytanego obrazu są potrzebne dla kadru „Dowolne": Cropper ma
    // w defaultProps `aspect: 4/3`, więc podanie `undefined` po cichu zamieniło
    // by wolny kadr na 4:3.
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
        setNaturalRatio(probe.naturalWidth / probe.naturalHeight);
      }
      setSrc(url);
    };
    probe.onerror = () => setSrc(url);
    probe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const onCropComplete = useCallback((percent: CropAreaPercent) => setArea(percent), []);

  const confirm = async () => {
    if (!area) return;
    setBusy(true);
    setError('');
    try {
      const blob = await cropFileToBlob(file, area);
      const failure = await onConfirm(blob);
      // Po udanym zapisie okno znika razem z plikiem; przy niepowodzeniu
      // zostaje otwarte z zachowanym kadrem i odblokowanym przyciskiem.
      if (failure) {
        setError(failure);
        setBusy(false);
      }
    } catch {
      setError('Nie udało się przyciąć tego pliku. Sprawdź, czy obraz nie jest uszkodzony.');
      setBusy(false);
    }
  };

  return (
    <div className="crop-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Kadrowanie zdjęcia">
      <div className="crop-dialog">
        <div className="crop-dialog-head">
          <strong>Ustaw kadr</strong>
          <button type="button" onClick={onCancel} aria-label="Zamknij kadrowanie"><X /></button>
        </div>

        <p className="crop-dialog-hint">
          Przeciągnij zdjęcie, żeby wybrać widoczny fragment. Suwakiem przybliżasz obraz.
        </p>

        <div className="crop-dialog-stage">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={ratio === 'free' ? naturalRatio : ratio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="crop-dialog-controls">
          <label className="crop-dialog-zoom">
            <span>Przybliżenie</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))} />
          </label>

          {!lockAspect && (
            <div className="crop-dialog-aspects" role="group" aria-label="Proporcje kadru">
              {ASPECT_CHOICES.map((choice) => (
                <button key={choice.label} type="button"
                  className={ratio === choice.value ? 'selected' : ''}
                  onClick={() => setRatio(choice.value)}>{choice.label}</button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="crop-dialog-error" role="alert">{error}</p>}

        <div className="crop-dialog-actions">
          <button type="button" className="ghost" onClick={onCancel} disabled={busy}>Anuluj</button>
          <button type="button" onClick={confirm} disabled={busy || !area}>
            {busy ? <><Loader2 className="spin" />Zapisywanie…</> : <><Check />Przytnij i wstaw</>}
          </button>
        </div>
      </div>
    </div>
  );
}

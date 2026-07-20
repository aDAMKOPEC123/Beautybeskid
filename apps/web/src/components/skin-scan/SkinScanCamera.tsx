import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkinScanAngle } from '@/api/skin-scans.api';

const ANGLE_COPY: Record<SkinScanAngle, { eyebrow: string; title: string; instruction: string }> = {
  FRONT: {
    eyebrow: 'Ujęcie 1 z 3',
    title: 'Twarz na wprost',
    instruction: 'Spójrz prosto w obiektyw. Trzymaj neutralny wyraz twarzy i schowaj włosy.',
  },
  LEFT: {
    eyebrow: 'Ujęcie 2 z 3',
    title: 'Lewy półprofil',
    instruction: 'Powoli obróć głowę około 30° w lewo. Oba oczy powinny pozostać widoczne.',
  },
  RIGHT: {
    eyebrow: 'Ujęcie 3 z 3',
    title: 'Prawy półprofil',
    instruction: 'Powoli obróć głowę około 30° w prawo. Oba oczy powinny pozostać widoczne.',
  },
};

type LiveQuality = {
  ok: boolean;
  message: string;
};

type Props = {
  angle: SkinScanAngle;
  previewUrl?: string;
  onCapture: (file: File) => void;
};

const inspectFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement): LiveQuality => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return { ok: false, message: 'Przygotowuję podgląd…' };
  }

  canvas.width = 96;
  canvas.height = 72;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let brightnessSum = 0;
  let brightnessSquaredSum = 0;
  const count = pixels.length / 4;
  for (let index = 0; index < pixels.length; index += 4) {
    const brightness = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    brightnessSum += brightness;
    brightnessSquaredSum += brightness * brightness;
  }
  const mean = brightnessSum / count;
  const contrast = Math.sqrt(Math.max(0, brightnessSquaredSum / count - mean * mean));

  if (mean < 55) return { ok: false, message: 'Za ciemno — ustaw twarz w stronę światła.' };
  if (mean > 210) return { ok: false, message: 'Za jasno — odsuń się od mocnego światła.' };
  if (contrast < 18) return { ok: false, message: 'Mało szczegółów — oczyść obiektyw i popraw światło.' };
  return { ok: true, message: 'Oświetlenie wygląda dobrze. Trzymaj telefon nieruchomo.' };
};

export const SkinScanCamera = ({ angle, previewUrl, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [liveQuality, setLiveQuality] = useState<LiveQuality>({ ok: false, message: 'Uruchamiam kamerę…' });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('ready');
      } catch {
        setCameraState('unavailable');
        setLiveQuality({ ok: false, message: 'Kamera jest niedostępna. Możesz wybrać zdjęcie z urządzenia.' });
      }
    };
    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (cameraState !== 'ready') return;
    const timer = window.setInterval(() => {
      if (videoRef.current && analysisCanvasRef.current) {
        setLiveQuality(inspectFrame(videoRef.current, analysisCanvasRef.current));
      }
    }, 700);
    return () => window.clearInterval(timer);
  }, [cameraState]);

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (blob) onCapture(new File([blob], `${angle.toLowerCase()}.jpg`, { type: 'image/jpeg' }));
  };

  const handleFile = (file?: File) => {
    if (file) onCapture(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copy = ANGLE_COPY[angle];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A6C32]">{copy.eyebrow}</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-[#1A3828]">{copy.title}</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{copy.instruction}</p>
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-3xl bg-[#102219] shadow-xl">
        {/* Keep the same video node mounted so its MediaStream survives angle changes. */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover [transform:scaleX(-1)] ${previewUrl ? 'opacity-0' : 'opacity-100'}`}
          aria-label="Podgląd z przedniej kamery"
          aria-hidden={Boolean(previewUrl)}
        />
        {previewUrl && (
          <img
            src={previewUrl}
            alt={`Podgląd: ${copy.title}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {!previewUrl && cameraState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/75">Uruchamiam kamerę…</div>
        )}

        {!previewUrl && cameraState === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
            <ShieldAlert className="h-8 w-8 text-[#D9B57B]" />
            <p className="text-sm">Nie udało się uruchomić kamery. Sprawdź uprawnienia lub wybierz zdjęcie z urządzenia.</p>
          </div>
        )}

        {!previewUrl && cameraState === 'ready' && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border-2 border-white/75 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]"
            aria-hidden="true"
          />
        )}

        <div className="absolute inset-x-3 bottom-3 flex justify-center">
          <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium backdrop-blur ${liveQuality.ok ? 'bg-emerald-950/70 text-emerald-50' : 'bg-black/65 text-white'}`}>
            <span className={`h-2 w-2 rounded-full ${liveQuality.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {previewUrl ? 'Zdjęcie zapisane — możesz przejść dalej lub powtórzyć.' : liveQuality.message}
          </div>
        </div>
      </div>

      <canvas ref={analysisCanvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="user"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
        {previewUrl ? (
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Powtórz ujęcie
          </Button>
        ) : (
          <Button type="button" onClick={() => void captureFrame()} disabled={cameraState !== 'ready'}>
            <Camera className="mr-2 h-4 w-4" /> Zrób zdjęcie
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
          {previewUrl ? <Check className="mr-2 h-4 w-4" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {previewUrl ? 'Wybierz inne zdjęcie' : 'Wybierz z urządzenia'}
        </Button>
      </div>
    </div>
  );
};

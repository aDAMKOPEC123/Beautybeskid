import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkinScanAngle } from '@/api/skin-scans.api';
import { useFaceMesh } from './useFaceMesh';
import { ANGLE_TARGETS, type FullAngleTarget } from './captureGuides';
import {
  checkLighting,
  checkFrameStability,
  computeHeadPose,
  validateCloseupMode,
  validateFullMode,
  type HeadPose,
  type ValidationResult,
} from './faceValidation';

const ANGLE_COPY: Record<SkinScanAngle, { eyebrow: string; title: string; instruction: string }> = {
  FRONT: {
    eyebrow: 'Zdjęcie 1 z 6',
    title: 'Twarz na wprost',
    instruction: 'Spójrz prosto w obiektyw. Trzymaj neutralny wyraz twarzy i schowaj włosy.',
  },
  LEFT: {
    eyebrow: 'Półprofil',
    title: 'Lewy półprofil',
    instruction: 'Powoli obróć głowę około 30° w lewo. Oba oczy powinny pozostać widoczne.',
  },
  RIGHT: {
    eyebrow: 'Półprofil',
    title: 'Prawy półprofil',
    instruction: 'Powoli obróć głowę około 30° w prawo. Oba oczy powinny pozostać widoczne.',
  },
  FOREHEAD: {
    eyebrow: 'Zbliżenie 1 z 5',
    title: 'Czoło — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do czoła. Odsuń włosy, aby czoło było widoczne.',
  },
  LEFT_CHEEK: {
    eyebrow: 'Zbliżenie 2 z 5',
    title: 'Lewy policzek — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do lewego policzka. Policzek powinien wypełnić kadr.',
  },
  RIGHT_CHEEK: {
    eyebrow: 'Zbliżenie 3 z 5',
    title: 'Prawy policzek — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do prawego policzka. Policzek powinien wypełnić kadr.',
  },
  CHIN: {
    eyebrow: 'Zbliżenie 4 z 5',
    title: 'Broda — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do brody i okolic ust.',
  },
  NECK: {
    eyebrow: 'Zbliżenie 5 z 5',
    title: 'Szyja — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do szyi. Odchyl lekko głowę do tyłu.',
  },
};

const ANALYSIS_W = 96;
const ANALYSIS_H = 72;
const DEBOUNCE_MS = 300;

type Props = {
  angle: SkinScanAngle;
  previewUrl?: string;
  onCapture: (file: File) => void;
};

export const SkinScanCamera = ({ angle, previewUrl, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  // Validation state
  const [validation, setValidation] = useState<ValidationResult>({
    ready: false, hint: 'Uruchamiam kamerę…', hintType: 'error',
  });
  const [buttonReady, setButtonReady] = useState(false);

  // Refs for validation
  const poseHistoryRef = useRef<HeadPose[]>([]);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target = ANGLE_TARGETS[angle];
  const isFullMode = target.mode === 'full';

  // Face mesh — only enabled for full mode
  const { landmarks, isLoading: meshLoading, error: meshError } = useFaceMesh(videoRef, isFullMode);
  const isFallback = isFullMode && meshError != null;

  // Reset state on angle change
  useEffect(() => {
    poseHistoryRef.current = [];
    prevFrameRef.current = null;
    setButtonReady(false);
    setValidation({ ready: false, hint: null, hintType: 'error' });
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [angle]);

  // Camera setup
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
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('ready');
      } catch {
        setCameraState('unavailable');
        setValidation({
          ready: false,
          hint: 'Kamera niedostępna. Wybierz zdjęcie z urządzenia.',
          hintType: 'error',
        });
      }
    };
    void startCamera();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera]);

  // Compute brightness/contrast from analysis canvas
  const computeLC = useCallback((): {
    brightness: number; contrast: number; frameData: Uint8ClampedArray;
  } | null => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    canvas.width = ANALYSIS_W;
    canvas.height = ANALYSIS_H;
    ctx.drawImage(video, 0, 0, ANALYSIS_W, ANALYSIS_H);
    const pixels = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H).data;
    let bSum = 0;
    let bSqSum = 0;
    const count = pixels.length / 4;
    for (let i = 0; i < pixels.length; i += 4) {
      const b = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      bSum += b;
      bSqSum += b * b;
    }
    const mean = bSum / count;
    const contrast = Math.sqrt(Math.max(0, bSqSum / count - mean * mean));
    return { brightness: mean, contrast, frameData: pixels };
  }, []);

  // Helper: apply debounce logic to a validation result
  const applyDebounce = useCallback((result: ValidationResult) => {
    setValidation(result);
    if (result.ready) {
      if (!debounceTimerRef.current) {
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          setButtonReady(true);
        }, DEBOUNCE_MS);
      }
    } else {
      setButtonReady(false);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
  }, []);

  // Fallback validation loop (no face mesh)
  useEffect(() => {
    if (cameraState !== 'ready' || previewUrl || !isFallback) return;
    const timer = setInterval(() => {
      const lc = computeLC();
      if (!lc) return;
      const result = checkLighting(lc.brightness, lc.contrast);
      setValidation({
        ready: result.ok,
        hint: result.ok ? 'Oświetlenie OK. Trzymaj nieruchomo.' : result.hint,
        hintType: result.ok ? 'success' : 'error',
      });
      setButtonReady(result.ok);
    }, 700);
    return () => clearInterval(timer);
  }, [cameraState, previewUrl, isFallback, computeLC]);

  // Full-mode validation (driven by landmarks updates from useFaceMesh)
  useEffect(() => {
    if (cameraState !== 'ready' || previewUrl || !isFullMode || isFallback || meshLoading) return;
    const lc = computeLC();
    if (!lc) return;

    if (landmarks) {
      const pose = computeHeadPose(landmarks);
      const h = poseHistoryRef.current;
      h.push(pose);
      if (h.length > 5) h.shift();
    }

    const result = validateFullMode(
      landmarks,
      target as FullAngleTarget,
      lc.brightness,
      lc.contrast,
      poseHistoryRef.current,
    );
    applyDebounce(result);
  }, [cameraState, previewUrl, isFullMode, isFallback, meshLoading, landmarks, target, computeLC, applyDebounce]);

  // Closeup-mode validation loop
  useEffect(() => {
    if (cameraState !== 'ready' || previewUrl || isFullMode) return;
    const timer = setInterval(() => {
      const lc = computeLC();
      if (!lc) return;
      const frameStable = prevFrameRef.current
        ? checkFrameStability(prevFrameRef.current, lc.frameData)
        : true;
      prevFrameRef.current = lc.frameData;
      const result = validateCloseupMode(lc.brightness, lc.contrast, frameStable);
      applyDebounce(result);
    }, 200);
    return () => clearInterval(timer);
  }, [cameraState, previewUrl, isFullMode, computeLC, applyDebounce]);

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
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (blob) onCapture(new File([blob], `${angle.toLowerCase()}.jpg`, { type: 'image/jpeg' }));
  };

  const handleFile = (file?: File) => {
    if (file) onCapture(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copy = ANGLE_COPY[angle];

  // Oval color (only for full mode with active face mesh)
  const ovalBorderClass = (() => {
    if (!isFullMode || isFallback) return 'border-white/75';
    if (validation.hintType === 'success') return 'border-emerald-400';
    if (validation.hintType === 'warning') return 'border-amber-400';
    return 'border-red-400';
  })();

  const canCapture = isFallback ? cameraState === 'ready' : buttonReady;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A6C32]">{copy.eyebrow}</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-[#1A3828]">{copy.title}</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{copy.instruction}</p>
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-3xl bg-[#102219] shadow-xl">
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
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/75">
            Uruchamiam kamerę…
          </div>
        )}

        {!previewUrl && cameraState === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
            <ShieldAlert className="h-8 w-8 text-[#D9B57B]" />
            <p className="text-sm">
              Nie udało się uruchomić kamery. Sprawdź uprawnienia lub wybierz zdjęcie z urządzenia.
            </p>
          </div>
        )}

        {!previewUrl && cameraState === 'ready' && (
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border-2 shadow-[0_0_0_999px_rgba(0,0,0,0.18)] transition-colors duration-300 ${ovalBorderClass}`}
            aria-hidden="true"
          />
        )}

        {/* Face mesh loading badge */}
        {!previewUrl && isFullMode && meshLoading && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] text-white backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" />
            Ładowanie detekcji…
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 flex justify-center">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium backdrop-blur ${
              validation.hintType === 'success'
                ? 'bg-emerald-950/70 text-emerald-50'
                : validation.hintType === 'warning'
                  ? 'bg-amber-950/70 text-amber-50'
                  : 'bg-black/65 text-white'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                validation.hintType === 'success'
                  ? 'bg-emerald-400'
                  : validation.hintType === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              }`}
            />
            {previewUrl
              ? 'Zdjęcie zapisane — możesz przejść dalej lub powtórzyć.'
              : validation.hint ?? 'Gotowe — zrób zdjęcie!'}
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
          <Button
            type="button"
            onClick={() => void captureFrame()}
            disabled={!canCapture}
            className={canCapture ? 'animate-pulse bg-emerald-600 hover:bg-emerald-700' : ''}
          >
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

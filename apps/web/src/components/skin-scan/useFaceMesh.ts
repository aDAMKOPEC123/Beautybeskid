import { useEffect, useRef, useState, type RefObject } from 'react';

type Landmark = { x: number; y: number; z: number };

type UseFaceMeshResult = {
  landmarks: Landmark[] | null;
  isLoading: boolean;
  error: string | null;
};

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const LOAD_TIMEOUT_MS = 10_000;
const THROTTLE_MS = 100;

export const useFaceMesh = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): UseFaceMeshResult => {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const landmarkerRef = useRef<unknown>(null);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      setLandmarks(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      if (landmarkerRef.current) {
        startLoop();
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await Promise.race([
          loadFaceLandmarker(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS),
          ),
        ]);

        if (cancelled || !mountedRef.current) return;

        landmarkerRef.current = result;
        setIsLoading(false);
        startLoop();
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setIsLoading(false);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować detekcji twarzy');
      }
    };

    const loadFaceLandmarker = async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
      );
      return FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: false,
        outputFaceBlendshapes: false,
      });
    };

    const startLoop = () => {
      const detect = () => {
        if (cancelled || !mountedRef.current) return;

        const now = performance.now();
        if (now - lastTimeRef.current >= THROTTLE_MS) {
          lastTimeRef.current = now;
          const video = videoRef.current;
          const fl = landmarkerRef.current as {
            detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: Array<Landmark[]> };
          } | null;
          if (video && fl && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              const result = fl.detectForVideo(video, now);
              const lm = result.faceLandmarks?.[0] ?? null;
              setLandmarks(lm);
            } catch {
              setLandmarks(null);
            }
          }
        }
        rafIdRef.current = requestAnimationFrame(detect);
      };
      rafIdRef.current = requestAnimationFrame(detect);
    };

    void init();

    return () => {
      cancelled = true;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
    };
  }, [enabled, videoRef]);

  useEffect(() => {
    return () => {
      const fl = landmarkerRef.current as { close?: () => void } | null;
      fl?.close?.();
      landmarkerRef.current = null;
    };
  }, []);

  return { landmarks, isLoading, error };
};

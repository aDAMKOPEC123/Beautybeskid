import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { TOUR_STEPS, type TourStep } from '@/tours/cosmo-tour';
import { TourOverlay } from '@/tours/TourOverlay';
import { waitForElement } from '@/tours/utils';
import '@/tours/tour.css';

interface TourContextValue {
  startTour: () => void;
  stopTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

function waitForStableLayout() {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    }, 360);
  });
}

async function prepareStep(step: TourStep) {
  if (step.path) {
    const { router } = await import('@/router');
    if (router.state.location.pathname !== step.path) await router.navigate(step.path);
  }

  if (!step.selector) return true;
  const element = await waitForElement(step.selector);
  if (!element) return false;

  element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  await waitForStableLayout();

  const stableElement = await waitForElement(step.selector, 1_500);
  stableElement?.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  return Boolean(stableElement);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const activeRef = useRef(false);
  const transitionRef = useRef(false);
  const sessionRef = useRef(0);

  const persistCompletion = useCallback(() => {
    api.patch('/users/me', { onboardingCompleted: true })
      .then(() => {
        queryClient.setQueryData(['users', 'me'], (user: any) => (
          user ? { ...user, onboardingCompleted: true } : user
        ));
      })
      .catch((error) => console.warn('[Tour] Nie udało się zapisać zakończenia przewodnika:', error));
  }, [queryClient]);

  const stopTour = useCallback(() => {
    if (!activeRef.current) return;
    sessionRef.current += 1;
    activeRef.current = false;
    transitionRef.current = false;
    setIsTransitioning(false);
    setIsActive(false);
    persistCompletion();
  }, [persistCompletion]);

  const startTour = useCallback(() => {
    if (activeRef.current) return;
    sessionRef.current += 1;
    activeRef.current = true;
    transitionRef.current = false;
    setStepIndex(0);
    setIsTransitioning(false);
    setIsActive(true);
  }, []);

  const moveToStep = useCallback(async (requestedIndex: number) => {
    if (!activeRef.current || transitionRef.current) return;
    if (requestedIndex < 0) return;
    if (requestedIndex >= TOUR_STEPS.length) {
      stopTour();
      return;
    }

    const session = sessionRef.current;
    const direction = requestedIndex >= stepIndex ? 1 : -1;
    let candidate = requestedIndex;
    transitionRef.current = true;
    setIsTransitioning(true);

    try {
      while (candidate >= 0 && candidate < TOUR_STEPS.length) {
        const isReady = await prepareStep(TOUR_STEPS[candidate]);
        if (!activeRef.current || session !== sessionRef.current) return;
        if (isReady) {
          setStepIndex(candidate);
          return;
        }
        console.warn(`[Tour] Pomijam niedostępny krok ${candidate + 1}.`);
        candidate += direction;
      }
      stopTour();
    } catch (error) {
      console.error('[Tour] Nie udało się zmienić kroku:', error);
    } finally {
      if (session === sessionRef.current) {
        transitionRef.current = false;
        setIsTransitioning(false);
      }
    }
  }, [stepIndex, stopTour]);

  const handleNext = useCallback(() => {
    if (stepIndex === TOUR_STEPS.length - 1) stopTour();
    else void moveToStep(stepIndex + 1);
  }, [moveToStep, stepIndex, stopTour]);

  const handlePrevious = useCallback(() => {
    if (stepIndex > 0) void moveToStep(stepIndex - 1);
  }, [moveToStep, stepIndex]);

  useEffect(() => {
    if (!isActive) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopTour();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isActive, stopTour]);

  return (
    <TourContext.Provider value={{ startTour, stopTour, isActive }}>
      {children}
      {isActive && (
        <TourOverlay
          step={TOUR_STEPS[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={TOUR_STEPS.length}
          isTransitioning={isTransitioning}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClose={stopTour}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTourContext must be used inside TourProvider');
  return context;
}

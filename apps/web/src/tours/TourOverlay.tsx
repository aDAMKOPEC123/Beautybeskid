import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TourSide, TourStep } from './cosmo-tour';
import { findVisibleElement } from './utils';

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };
type Placement = { left: number; top: number; side: TourSide | 'center' };

type TourOverlayProps = {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isTransitioning: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
};

const EDGE = 12;
const GAP = 14;
const HIGHLIGHT_PADDING = 8;

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5
    && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5
    && Math.abs(a.height - b.height) < 0.5;
}

function readRect(selector?: string): Rect | null {
  if (!selector) return null;
  const element = findVisibleElement(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calculatePlacement(target: Rect | null, card: DOMRect, preferred: TourSide = 'right'): Placement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!target) {
    return {
      left: (viewportWidth - card.width) / 2,
      top: (viewportHeight - card.height) / 2,
      side: 'center',
    };
  }

  const space = {
    right: viewportWidth - target.right,
    left: target.left,
    bottom: viewportHeight - target.bottom,
    top: target.top,
  };
  const needed = {
    right: card.width + GAP + EDGE,
    left: card.width + GAP + EDGE,
    bottom: card.height + GAP + EDGE,
    top: card.height + GAP + EDGE,
  };
  const orderedSides: TourSide[] = [preferred, 'right', 'left', 'bottom', 'top'];
  const candidates = orderedSides.filter((side, index, sides) => sides.indexOf(side) === index);
  const side = candidates.find((candidate) => space[candidate] >= needed[candidate]);

  if (!side) {
    return {
      left: (viewportWidth - card.width) / 2,
      top: viewportHeight - card.height - EDGE,
      side: 'center',
    };
  }

  const horizontal = side === 'right' || side === 'left';
  const rawLeft = horizontal
    ? (side === 'right' ? target.right + GAP : target.left - card.width - GAP)
    : target.left + (target.width - card.width) / 2;
  const rawTop = horizontal
    ? target.top + (target.height - card.height) / 2
    : (side === 'bottom' ? target.bottom + GAP : target.top - card.height - GAP);

  return {
    left: clamp(rawLeft, EDGE, viewportWidth - card.width - EDGE),
    top: clamp(rawTop, EDGE, viewportHeight - card.height - EDGE),
    side,
  };
}

export function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  isTransitioning,
  onNext,
  onPrevious,
  onClose,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(() => readRect(step.selector));
  const [placement, setPlacement] = useState<Placement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isTransitioning) return;

    let frameId = 0;
    let settleUntil = Date.now() + 700;
    const update = () => {
      const nextRect = readRect(step.selector);
      setTargetRect((current) => (sameRect(current, nextRect) ? current : nextRect));
    };
    const settle = () => {
      update();
      if (Date.now() < settleUntil) frameId = window.requestAnimationFrame(settle);
    };

    const target = step.selector ? findVisibleElement(step.selector) : null;
    const resizeObserver = target ? new ResizeObserver(update) : null;
    if (target) resizeObserver?.observe(target);

    const restartSettle = () => {
      settleUntil = Date.now() + 250;
      if (!frameId) frameId = window.requestAnimationFrame(settle);
    };

    update();
    frameId = window.requestAnimationFrame(settle);
    window.addEventListener('resize', restartSettle);
    window.addEventListener('scroll', restartSettle, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', restartSettle);
      window.removeEventListener('scroll', restartSettle, true);
    };
  }, [isTransitioning, step.selector]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const nextPlacement = calculatePlacement(targetRect, card.getBoundingClientRect(), step.side);
    setPlacement((current) => (
      current
      && Math.abs(current.left - nextPlacement.left) < 0.5
      && Math.abs(current.top - nextPlacement.top) < 0.5
      && current.side === nextPlacement.side
        ? current
        : nextPlacement
    ));
  }, [step.title, step.side, targetRect]);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cutout = targetRect ? {
    top: clamp(targetRect.top - HIGHLIGHT_PADDING, 0, viewportHeight),
    left: clamp(targetRect.left - HIGHLIGHT_PADDING, 0, viewportWidth),
    right: clamp(targetRect.right + HIGHLIGHT_PADDING, 0, viewportWidth),
    bottom: clamp(targetRect.bottom + HIGHLIGHT_PADDING, 0, viewportHeight),
  } : null;

  const content = (
    <div className="cosmo-tour-root" data-tour-step={stepIndex + 1}>
      {cutout ? (
        <>
          <div className="cosmo-tour-shade" style={{ inset: '0 0 auto 0', height: cutout.top }} />
          <div className="cosmo-tour-shade" style={{ top: cutout.top, left: 0, width: cutout.left, height: cutout.bottom - cutout.top }} />
          <div className="cosmo-tour-shade" style={{ top: cutout.top, left: cutout.right, right: 0, height: cutout.bottom - cutout.top }} />
          <div className="cosmo-tour-shade" style={{ top: cutout.bottom, right: 0, bottom: 0, left: 0 }} />
          <div
            className="cosmo-tour-highlight"
            style={{ top: cutout.top, left: cutout.left, width: cutout.right - cutout.left, height: cutout.bottom - cutout.top }}
          />
        </>
      ) : (
        <div className="cosmo-tour-shade" style={{ inset: 0 }} />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="cosmo-tour-card"
        data-side={placement?.side ?? 'center'}
        style={{
          left: placement?.left ?? '50%',
          top: placement?.top ?? '50%',
          opacity: placement ? 1 : 0,
          transform: placement ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <button type="button" className="cosmo-tour-close" onClick={onClose} aria-label="Zamknij przewodnik">×</button>
        <div className="cosmo-tour-brand">BESKIDSTUDIO ·</div>
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        <div className="cosmo-tour-footer">
          <span>{stepIndex + 1} z {totalSteps}</span>
          <div className="cosmo-tour-actions">
            <button type="button" className="cosmo-tour-previous" onClick={onPrevious} disabled={stepIndex === 0 || isTransitioning}>
              ← Wstecz
            </button>
            <button type="button" className="cosmo-tour-next" onClick={onNext} disabled={isTransitioning}>
              {isTransitioning ? 'Chwileczkę…' : (step.nextLabel ?? 'Dalej →')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

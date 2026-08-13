import { describe, expect, it } from 'vitest';
import { computeResizedWidth } from './RichTextEditor';

describe('computeResizedWidth', () => {
  it('grows the width when dragging right on a left/center/full-direction layout', () => {
    const next = computeResizedWidth({
      startWidth: 50, startX: 0, editorWidth: 1000, layout: 'center', clientX: 100,
    });
    // 100px / 1000px editor = 10 percentage points added
    expect(next).toBe(60);
  });

  it('shrinks the width when dragging left', () => {
    const next = computeResizedWidth({
      startWidth: 50, startX: 100, editorWidth: 1000, layout: 'center', clientX: 0,
    });
    expect(next).toBe(40);
  });

  it('inverts direction for a right-aligned figure, since its handle sits on the left edge visually', () => {
    const next = computeResizedWidth({
      startWidth: 50, startX: 0, editorWidth: 1000, layout: 'right', clientX: 100,
    });
    expect(next).toBe(40);
  });

  it('clamps the result to the 10-100 range', () => {
    expect(computeResizedWidth({
      startWidth: 50, startX: 0, editorWidth: 1000, layout: 'center', clientX: 5000,
    })).toBe(100);
    expect(computeResizedWidth({
      startWidth: 50, startX: 5000, editorWidth: 1000, layout: 'center', clientX: 0,
    })).toBe(10);
  });

  it('rounds to a whole percent', () => {
    const next = computeResizedWidth({
      startWidth: 50, startX: 0, editorWidth: 1000, layout: 'center', clientX: 13,
    });
    expect(Number.isInteger(next)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { buildOrderedSlides } from './service';

describe('buildOrderedSlides', () => {
  it('sorts slides by order ascending', () => {
    const slides = [
      { id: 'a', order: 2 },
      { id: 'b', order: 0 },
      { id: 'c', order: 1 },
    ] as any[];
    const result = buildOrderedSlides(slides);
    expect(result.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns empty array for no slides', () => {
    expect(buildOrderedSlides([])).toEqual([]);
  });
});

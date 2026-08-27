import { describe, it, expect } from 'vitest';
import { shouldDeleteStale } from './external-calendar.sync-rules';

describe('shouldDeleteStale', () => {
  it('nie kasuje, gdy sparsowano zero wydarzeń (może być uszkodzona odpowiedź)', () => {
    expect(shouldDeleteStale(0)).toBe(false);
  });

  it('kasuje, gdy sparsowano choć jedno wydarzenie', () => {
    expect(shouldDeleteStale(1)).toBe(true);
    expect(shouldDeleteStale(42)).toBe(true);
  });
});

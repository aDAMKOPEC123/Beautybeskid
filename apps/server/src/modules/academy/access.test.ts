import { describe, expect, it, vi } from 'vitest';
import { hasActiveCourseAccess } from './access';

describe('hasActiveCourseAccess', () => {
  it('keeps access without a time limit', () => {
    expect(hasActiveCourseAccess({ purchasedAt: new Date('2020-01-01') }, null)).toBe(true);
  });

  it('expires access after the configured number of days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T12:00:00Z'));
    expect(hasActiveCourseAccess({ purchasedAt: new Date('2026-07-13T13:00:00Z') }, 1)).toBe(true);
    expect(hasActiveCourseAccess({ purchasedAt: new Date('2026-07-12T12:00:00Z') }, 1)).toBe(false);
    vi.useRealTimers();
  });
});

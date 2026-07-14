import { describe, expect, it } from 'vitest';
import { shouldAttemptAcademySessionRefresh } from './academySession';

describe('Academy session bootstrap', () => {
  it('does not call refresh for a first-time anonymous visitor', () => {
    expect(shouldAttemptAcademySessionRefresh(null, false, false)).toBe(false);
  });

  it('refreshes a persisted session in the current tab', () => {
    expect(shouldAttemptAcademySessionRefresh('token', true, false)).toBe(true);
  });

  it('refreshes an HttpOnly-cookie session opened in a new tab', () => {
    expect(shouldAttemptAcademySessionRefresh(null, false, true)).toBe(true);
  });
});

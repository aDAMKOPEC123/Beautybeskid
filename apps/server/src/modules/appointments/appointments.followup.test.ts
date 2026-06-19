import { describe, it, expect } from 'vitest';
import { computeFollowUpReminders } from './appointments.service';

interface CompletedApt {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: Date;
  recommendedIntervalDays: number;
}

describe('computeFollowUpReminders', () => {
  const today = new Date('2026-04-07');

  it('returns reminder when past trigger date (85% of interval)', () => {
    // interval = 20 days, trigger at day 17 (floor(20*0.85))
    // lastVisit = 2026-03-21 → triggerDate = 2026-04-07 → today = trigger → included
    const apt: CompletedApt = {
      serviceId: 'svc1',
      serviceName: 'Manicure',
      serviceSlug: 'manicure',
      lastVisitDate: new Date('2026-03-21'),
      recommendedIntervalDays: 20,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results).toHaveLength(1);
    expect(results[0].serviceId).toBe('svc1');
  });

  it('does not return reminder when before trigger date', () => {
    // interval = 21 days, trigger at day 17 (floor(21*0.85) = 17)
    // lastVisit = 2026-03-25 → triggerDate = 2026-04-11 → today < trigger → not included
    const apt: CompletedApt = {
      serviceId: 'svc2',
      serviceName: 'Pedicure',
      serviceSlug: 'pedicure',
      lastVisitDate: new Date('2026-03-25'),
      recommendedIntervalDays: 21,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results).toHaveLength(0);
  });

  it('daysOverdue is negative when before recommended return date but past trigger', () => {
    // interval = 20, trigger at 17, recommendedReturnDate at 20
    // lastVisit = 2026-03-21, today = 2026-04-07 (17 days after) → daysOverdue = 17 - 20 = -3
    const apt: CompletedApt = {
      serviceId: 'svc3',
      serviceName: 'Zabieg',
      serviceSlug: 'zabieg',
      lastVisitDate: new Date('2026-03-21'),
      recommendedIntervalDays: 20,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results[0].daysOverdue).toBe(-3);
  });

  it('daysOverdue is positive when overdue', () => {
    // interval = 21, trigger at 17
    // lastVisit = 2026-03-01 → 37 days ago → daysOverdue = 37 - 21 = 16
    const apt: CompletedApt = {
      serviceId: 'svc4',
      serviceName: 'Laminowanie',
      serviceSlug: 'laminowanie',
      lastVisitDate: new Date('2026-03-01'),
      recommendedIntervalDays: 21,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results[0].daysOverdue).toBe(16);
  });

  it('sorts by daysOverdue descending (most overdue first)', () => {
    const apts: CompletedApt[] = [
      { serviceId: 'a', serviceName: 'A', serviceSlug: 'a', lastVisitDate: new Date('2026-03-10'), recommendedIntervalDays: 21 },
      { serviceId: 'b', serviceName: 'B', serviceSlug: 'b', lastVisitDate: new Date('2026-03-01'), recommendedIntervalDays: 21 },
    ];
    const results = computeFollowUpReminders(apts, today);
    expect(results[0].daysOverdue).toBeGreaterThanOrEqual(results[1].daysOverdue);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildSeriesStepStates,
  getNotificationTrigger,
  getReminderUrgency,
} from './treatment-series.helpers';

describe('treatment-series helpers', () => {
  it('builds step states for completed, due and locked steps', () => {
    const now = new Date('2026-03-24T10:00:00.000Z');
    const states = buildSeriesStepStates({
      totalVisits: 4,
      completedVisits: 1,
      nextStep: 2,
      nextDueDate: new Date('2026-03-23T09:00:00.000Z'),
      upcomingAppointment: null,
      completionDatesByStep: new Map([[1, new Date('2026-03-10T09:00:00.000Z')]]),
      appointmentIdsByStep: new Map([[1, 'apt-1']]),
      now,
    });

    expect(states).toEqual([
      {
        step: 1,
        status: 'completed',
        dueDate: null,
        completedAt: new Date('2026-03-10T09:00:00.000Z'),
        appointmentId: 'apt-1',
        appointmentDate: null,
      },
      {
        step: 2,
        status: 'due',
        dueDate: new Date('2026-03-23T09:00:00.000Z'),
        completedAt: null,
        appointmentId: null,
        appointmentDate: null,
      },
      {
        step: 3,
        status: 'locked',
        dueDate: null,
        completedAt: null,
        appointmentId: null,
        appointmentDate: null,
      },
      {
        step: 4,
        status: 'locked',
        dueDate: null,
        completedAt: null,
        appointmentId: null,
        appointmentDate: null,
      },
    ]);
  });

  it('marks the next step as scheduled when an appointment exists', () => {
    const states = buildSeriesStepStates({
      totalVisits: 3,
      completedVisits: 1,
      nextStep: 2,
      nextDueDate: new Date('2026-03-30T09:00:00.000Z'),
      upcomingAppointment: {
        id: 'apt-2',
        date: new Date('2026-03-29T09:00:00.000Z'),
        step: 2,
        status: 'CONFIRMED',
      },
      completionDatesByStep: new Map(),
      appointmentIdsByStep: new Map(),
      now: new Date('2026-03-24T10:00:00.000Z'),
    });

    expect(states[1]).toEqual({
      step: 2,
      status: 'scheduled',
      dueDate: new Date('2026-03-30T09:00:00.000Z'),
      completedAt: null,
      appointmentId: 'apt-2',
      appointmentDate: new Date('2026-03-29T09:00:00.000Z'),
    });
  });

  it('classifies reminder urgency and notification cadence', () => {
    expect(getReminderUrgency(-2)).toBe('overdue');
    expect(getReminderUrgency(2)).toBe('due_soon');
    expect(getReminderUrgency(8)).toBe('upcoming');

    expect(getNotificationTrigger(new Date('2026-03-27T09:00:00.000Z'), new Date('2026-03-24T08:00:00.000Z'))).toMatchObject({
      kind: 'BEFORE_DUE',
      bucketKey: 'before:2026-03-27',
    });
    expect(getNotificationTrigger(new Date('2026-03-24T09:00:00.000Z'), new Date('2026-03-24T08:00:00.000Z'))).toMatchObject({
      kind: 'DUE',
      bucketKey: 'due:2026-03-24',
    });
    expect(getNotificationTrigger(new Date('2026-03-17T09:00:00.000Z'), new Date('2026-03-24T08:00:00.000Z'))).toMatchObject({
      kind: 'OVERDUE',
      bucketKey: 'overdue:2026-03-17:7',
    });
    expect(getNotificationTrigger(new Date('2026-03-19T09:00:00.000Z'), new Date('2026-03-24T08:00:00.000Z'))).toBeNull();
  });
});

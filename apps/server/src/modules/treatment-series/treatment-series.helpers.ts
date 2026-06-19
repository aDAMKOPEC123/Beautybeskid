import { differenceInCalendarDays, format, startOfDay } from 'date-fns';

export type ReminderUrgency = 'overdue' | 'due_soon' | 'upcoming';
export type SeriesStepStatus = 'completed' | 'scheduled' | 'due' | 'locked';
export type NotificationTriggerKind = 'BEFORE_DUE' | 'DUE' | 'OVERDUE';

export interface SeriesUpcomingAppointment {
  id: string;
  date: Date;
  step: number;
  status: string;
}

export interface SeriesStepState {
  step: number;
  status: SeriesStepStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  appointmentId: string | null;
  appointmentDate: Date | null;
}

export interface NotificationTrigger {
  kind: NotificationTriggerKind;
  bucketKey: string;
  scheduledFor: Date;
}

export const getReminderUrgency = (daysUntilDue: number): ReminderUrgency => {
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 3) return 'due_soon';
  return 'upcoming';
};

export const buildSeriesStepStates = ({
  totalVisits,
  completedVisits,
  nextStep,
  nextDueDate,
  upcomingAppointment,
  completionDatesByStep,
  appointmentIdsByStep,
  now,
}: {
  totalVisits: number;
  completedVisits: number;
  nextStep: number | null;
  nextDueDate: Date | null;
  upcomingAppointment: SeriesUpcomingAppointment | null;
  completionDatesByStep: Map<number, Date>;
  appointmentIdsByStep: Map<number, string>;
  now: Date;
}): SeriesStepState[] => {
  const safeCompletedVisits = Math.max(0, Math.min(completedVisits, totalVisits));
  const dueDiff = nextDueDate ? differenceInCalendarDays(startOfDay(nextDueDate), startOfDay(now)) : null;

  return Array.from({ length: totalVisits }, (_, index) => {
    const step = index + 1;

    if (step <= safeCompletedVisits) {
      return {
        step,
        status: 'completed' as const,
        dueDate: step === nextStep ? nextDueDate : null,
        completedAt: completionDatesByStep.get(step) ?? null,
        appointmentId: appointmentIdsByStep.get(step) ?? null,
        appointmentDate: null,
      };
    }

    if (nextStep && step === nextStep) {
      if (upcomingAppointment && upcomingAppointment.step === step) {
        return {
          step,
          status: 'scheduled' as const,
          dueDate: nextDueDate,
          completedAt: null,
          appointmentId: upcomingAppointment.id,
          appointmentDate: upcomingAppointment.date,
        };
      }

      return {
        step,
        status: dueDiff !== null && dueDiff <= 0 ? 'due' : 'locked',
        dueDate: nextDueDate,
        completedAt: null,
        appointmentId: null,
        appointmentDate: null,
      };
    }

    return {
      step,
      status: 'locked' as const,
      dueDate: null,
      completedAt: null,
      appointmentId: null,
      appointmentDate: null,
    };
  });
};

export const getNotificationTrigger = (
  dueDate: Date,
  now: Date,
): NotificationTrigger | null => {
  const dueDay = startOfDay(dueDate);
  const today = startOfDay(now);
  const daysUntilDue = differenceInCalendarDays(dueDay, today);
  const dateKey = format(dueDay, 'yyyy-MM-dd');

  if (daysUntilDue === 3) {
    return {
      kind: 'BEFORE_DUE',
      bucketKey: `before:${dateKey}`,
      scheduledFor: today,
    };
  }

  if (daysUntilDue === 0) {
    return {
      kind: 'DUE',
      bucketKey: `due:${dateKey}`,
      scheduledFor: today,
    };
  }

  if (daysUntilDue < 0) {
    const daysLate = Math.abs(daysUntilDue);
    if (daysLate % 7 === 0) {
      return {
        kind: 'OVERDUE',
        bucketKey: `overdue:${dateKey}:${daysLate}`,
        scheduledFor: today,
      };
    }
  }

  return null;
};

// filepath: apps/web/src/api/reminders.api.ts
import { api } from '../lib/axios';

export type ReminderUrgency = 'overdue' | 'due_soon' | 'upcoming';
export type SeriesStepStatus = 'completed' | 'scheduled' | 'due' | 'locked';

export interface ReminderBookingTarget {
  serviceId: string;
  seriesId?: string;
}

export interface ReminderNextAppointment {
  id: string;
  date: string;
  status: string;
  step: number;
}

export interface SeriesReminderStep {
  step: number;
  status: SeriesStepStatus;
  dueDate: string | null;
  completedAt: string | null;
  appointmentId: string | null;
  appointmentDate: string | null;
}

export interface SeriesReminder {
  id: string;
  kind: 'series';
  serviceId: string;
  serviceName: string;
  seriesId: string;
  completedVisits: number;
  totalVisits: number;
  nextStep: number | null;
  dueDate: string | null;
  daysUntilDue: number | null;
  urgency: ReminderUrgency | null;
  lastVisitDate: string | null;
  nextAppointment: ReminderNextAppointment | null;
  bookingTarget: ReminderBookingTarget;
  steps: SeriesReminderStep[];
}

export interface IntervalReminder {
  id: string;
  kind: 'interval';
  serviceId: string;
  serviceName: string;
  lastVisitDate: string;
  recommendedIntervalDays: number;
  dueDate: string;
  daysUntilDue: number;
  urgency: ReminderUrgency;
  bookingTarget: ReminderBookingTarget;
}

export type Reminder = SeriesReminder | IntervalReminder;

export const remindersApi = {
  getMy: async (): Promise<Reminder[]> => {
    const res = await api.get('/reminders/me');
    return res.data.data.reminders;
  },
};

// filepath: packages/shared/src/types/appointment.types.ts
import { User } from './user.types';
import { Service } from './service.types';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export interface Appointment {
  id: string;
  userId: string;
  user?: User;
  serviceId: string;
  service?: Service;
  date: Date;
  status: AppointmentStatus;
  completedAt?: Date | null;
  treatmentSeriesId?: string | null;
  treatmentSeriesStep?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

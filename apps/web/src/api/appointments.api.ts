import { api } from '../lib/axios';
import type {
  Appointment,
  AppointmentHistoryPage,
  AppointmentHistoryStatus,
  AppointmentOverview,
} from '@cosmo/shared';

export interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;
  recommendedReturnDate: string;
  daysOverdue: number;
}

export const appointmentsApi = {
  getMy: async () => {
    const res = await api.get('/appointments/me');
    return res.data.data.appointments;
  },
  getMyOverview: async (): Promise<AppointmentOverview> => {
    const res = await api.get('/appointments/me/overview');
    return res.data.data;
  },
  getMyHistory: async (params: {
    status?: AppointmentHistoryStatus;
    page?: number;
    limit?: number;
  }): Promise<AppointmentHistoryPage> => {
    const res = await api.get('/appointments/me/history', { params });
    return res.data.data.history;
  },
  getAll: async (params?: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/appointments', { params });
    return res.data.data.data;
  },
  create: async (data: {
    serviceId: string;
    treatmentSeriesId?: string | null;
    date: string;
    employeeId?: string | null;
    notes?: string;
    allergies?: string;
    problemDescription?: string;
    couponId?: string | null;
    discountCodeId?: string | null;
    voucherId?: string | null;
    voucherUsedAmount?: number;
    happyHourId?: string | null;
  }) => {
    const res = await api.post('/appointments', data);
    return res.data.data.appointment;
  },
  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post(`/appointments/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.appointment;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await api.patch(`/appointments/${id}/status`, { status });
    return res.data.data.appointment;
  },
  createAdmin: async (data: {
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    serviceId: string;
    employeeId?: string;
    date: string;
    notes?: string;
  }) => {
    const res = await api.post('/appointments/admin', data);
    return res.data.data.appointment;
  },
  createExternal: async (data: {
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    serviceId: string;
    employeeId?: string;
    date: string;
    notes?: string;
    customDurationMinutes?: number;
  }) => {
    const res = await api.post('/appointments/admin/external', data);
    return res.data.data.appointment;
  },
  updateTime: async (id: string, data: { date?: string; customDurationMinutes?: number }) => {
    const res = await api.patch(`/appointments/${id}/time`, data);
    return res.data.data.appointment;
  },
  remove: async (id: string) => {
    await api.delete(`/appointments/${id}`);
  },
  getToday: async (employeeId?: string) => {
    const params = employeeId ? { employeeId } : {};
    const res = await api.get('/appointments/today', { params });
    return res.data.data.appointments;
  },
  updateStaffNote: async (id: string, staffNote: string) => {
    const res = await api.patch(`/appointments/${id}/staff-note`, { staffNote });
    return res.data.data.appointment;
  },
  requestReschedule: async (id: string, date: string) => {
    const res = await api.post(`/appointments/${id}/reschedule`, { date });
    return res.data.data.appointment;
  },
  withdrawReschedule: async (id: string): Promise<Appointment> => {
    const res = await api.delete(`/appointments/${id}/reschedule`);
    return res.data.data.appointment;
  },
  requestCancellation: async (id: string, reason?: string): Promise<Appointment> => {
    const res = await api.post(`/appointments/${id}/cancellation-request`, { reason });
    return res.data.data.appointment;
  },
  withdrawCancellation: async (id: string): Promise<Appointment> => {
    const res = await api.delete(`/appointments/${id}/cancellation-request`);
    return res.data.data.appointment;
  },
  approveCancellation: async (id: string, decisionNote?: string): Promise<Appointment> => {
    const res = await api.patch(`/appointments/${id}/cancellation-request/approve`, { decisionNote });
    return res.data.data.appointment;
  },
  rejectCancellation: async (id: string, decisionNote?: string): Promise<Appointment> => {
    const res = await api.patch(`/appointments/${id}/cancellation-request/reject`, { decisionNote });
    return res.data.data.appointment;
  },
  approveReschedule: async (id: string) => {
    const res = await api.patch(`/appointments/${id}/reschedule/approve`);
    return res.data.data.appointment;
  },
  rejectReschedule: async (id: string) => {
    const res = await api.patch(`/appointments/${id}/reschedule/reject`);
    return res.data.data.appointment;
  },
  getFollowUpReminders: async (): Promise<FollowUpReminder[]> => {
    const res = await api.get('/appointments/follow-up-reminders');
    return res.data.data.reminders;
  },
};

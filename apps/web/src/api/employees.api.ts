import { api } from '../lib/axios';

export interface TimeBlock {
  start: string; // "09:00"
  end: string;   // "13:00"
}

export interface WorkDay {
  id: string;
  employeeId: string;
  date: string;
  isWorking: boolean;
  timeBlocks: TimeBlock[] | null;
  note?: string | null;
}

export interface WeeklyScheduleEntry {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  isWorking: boolean;
  timeBlocks: TimeBlock[];
  updatedAt: string;
}

export interface WorkDayInput {
  date: string;
  isWorking?: boolean;
  timeBlocks?: TimeBlock[];
  note?: string;
}

export interface WeekDayInput {
  date: string;
  isWorking: boolean;
  timeBlocks?: TimeBlock[];
  note?: string;
}

export const employeesApi = {
  // ── Public ──────────────────────────────────────────────────────────────────
  getNextAvailable: async (): Promise<{ date: string; time: string } | null> => {
    const res = await api.get('/employees/next-available');
    return res.data.data.slot;
  },
  getAll: async () => {
    const res = await api.get('/employees');
    return res.data.data.employees;
  },
  getAvailability: async (date: string, serviceId: string, employeeId?: string | null) => {
    const params: Record<string, string> = { date, serviceId };
    if (employeeId) params.employeeId = employeeId;
    const res = await api.get('/employees/availability', { params });
    return res.data.data.slots as { time: string; available: boolean }[];
  },
  getMonthAvailability: async (
    year: number,
    month: number,
    serviceId: string,
    employeeId?: string | null,
  ): Promise<Record<string, 'off' | 'none' | 'partial' | 'available'>> => {
    const params: Record<string, string> = { year: String(year), month: String(month), serviceId };
    if (employeeId) params.employeeId = employeeId;
    const res = await api.get('/employees/availability/month', { params });
    return res.data.data.availability;
  },
  getWeekSlotsCount: async (): Promise<{ count: number; availableDays: number; weekStart: string; weekEnd: string }> => {
    const res = await api.get('/employees/week-slots-count');
    return res.data.data;
  },

  // ── Admin CRUD ───────────────────────────────────────────────────────────────
  create: async (formData: FormData) => {
    const res = await api.post('/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.employee;
  },
  update: async (id: string, formData: FormData) => {
    const res = await api.patch(`/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.employee;
  },
  remove: async (id: string) => {
    await api.delete(`/employees/${id}`);
  },

  // ── Account management (admin) ───────────────────────────────────────────────
  createAccount: async (employeeId: string, data: { email: string; password?: string }) => {
    const res = await api.post(`/employees/${employeeId}/create-account`, data);
    return res.data.data.employee;
  },
  revokeAccount: async (employeeId: string) => {
    const res = await api.delete(`/employees/${employeeId}/account`);
    return res.data.data.employee;
  },

  // ── Schedule (admin — for any employee) ─────────────────────────────────────
  getSchedule: async (employeeId: string, month?: string) => {
    const res = await api.get(`/employees/${employeeId}/schedule`, {
      params: month ? { month } : {},
    });
    return res.data.data.workDays as WorkDay[];
  },
  getWeeklySchedule: async (employeeId: string) => {
    const res = await api.get(`/employees/${employeeId}/weekly-schedule`);
    return res.data.data.schedule as WeeklyScheduleEntry[];
  },
  upsertWorkDay: async (employeeId: string, data: WorkDayInput) => {
    const res = await api.post(`/employees/${employeeId}/schedule`, data);
    return res.data.data.workDay as WorkDay;
  },
  deleteWorkDay: async (employeeId: string, dayId: string) => {
    await api.delete(`/employees/${employeeId}/schedule/${dayId}`);
  },

  upsertEmployeeWeeklyDay: async (employeeId: string, data: { dayOfWeek: number; isWorking: boolean; timeBlocks: TimeBlock[] }) => {
    const res = await api.put(`/employees/${employeeId}/weekly-schedule`, data);
    return res.data.data.entry as WeeklyScheduleEntry;
  },

  upsertWeekForEmployee: async (employeeId: string, days: WeekDayInput[]): Promise<void> => {
    await api.post(`/employees/${employeeId}/schedule/week`, { days });
  },
  blockMonthForEmployee: async (employeeId: string, year: number, month: number): Promise<void> => {
    await api.post(`/employees/${employeeId}/schedule/block-month`, { year, month });
  },

  // ── My schedule (employee self-service) ──────────────────────────────────────
  getMySchedule: async (month?: string) => {
    const res = await api.get('/employees/me/schedule', {
      params: month ? { month } : {},
    });
    return res.data.data as { employee: any; workDays: WorkDay[]; weeklySchedule: WeeklyScheduleEntry[] };
  },
  upsertMyWorkDay: async (data: WorkDayInput) => {
    const res = await api.post('/employees/me/schedule', data);
    return res.data.data.workDay as WorkDay;
  },
  deleteMyWorkDay: async (dayId: string) => {
    await api.delete(`/employees/me/schedule/${dayId}`);
  },
  upsertMyWeek: async (days: WeekDayInput[]): Promise<void> => {
    await api.post('/employees/me/schedule/week', { days });
  },
  blockMyMonth: async (year: number, month: number): Promise<void> => {
    await api.post('/employees/me/schedule/block-month', { year, month });
  },
  getMyAppointments: async () => {
    const res = await api.get('/employees/me/appointments');
    return res.data.data.appointments;
  },

  // ── Weekly schedule (employee self-service) ──────────────────────────────────
  getMyWeeklySchedule: async () => {
    const res = await api.get('/employees/me/weekly-schedule');
    return res.data.data.schedule as WeeklyScheduleEntry[];
  },
  upsertMyWeeklyDay: async (data: { dayOfWeek: number; isWorking: boolean; timeBlocks: TimeBlock[] }) => {
    const res = await api.put('/employees/me/weekly-schedule', data);
    return res.data.data.entry as WeeklyScheduleEntry;
  },
};

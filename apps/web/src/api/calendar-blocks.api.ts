import { api } from '@/lib/axios';

export interface CalendarBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  appliesToAll: boolean;
  employees: { id: string; name: string }[];
}

export interface CreateCalendarBlockInput {
  startsAt: string;
  endsAt: string;
  reason?: string;
  appliesToAll: boolean;
  employeeIds?: string[];
}

const calendarBlocksApi = {
  list: (from: string, to: string): Promise<CalendarBlock[]> =>
    api.get('/calendar-blocks', { params: { from, to } }).then((r: any) => r.data),
  create: (data: CreateCalendarBlockInput): Promise<CalendarBlock> =>
    api.post('/calendar-blocks', data).then((r: any) => r.data),
  remove: (id: string) =>
    api.delete(`/calendar-blocks/${id}`).then((r: any) => r.data),
};

export default calendarBlocksApi;

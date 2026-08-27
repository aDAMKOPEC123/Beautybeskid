import { api } from '@/lib/axios';

export interface ExternalCalendarSource {
  id: string;
  name: string;
  url: string;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  location: string | null;
}

const externalCalendarApi = {
  getSource: (): Promise<ExternalCalendarSource | null> =>
    api.get('/external-calendar/source').then((r: any) => r.data),
  saveSource: (data: { url: string; name?: string; isEnabled?: boolean }) =>
    api.put('/external-calendar/source', data).then((r: any) => r.data),
  deleteSource: () => api.delete('/external-calendar/source').then((r: any) => r.data),
  syncNow: (): Promise<{ imported: number }> =>
    api.post('/external-calendar/sync').then((r: any) => r.data),
  listEvents: (from: string, to: string): Promise<ExternalCalendarEvent[]> =>
    api.get('/external-calendar/events', { params: { from, to } }).then((r: any) => r.data),
};

export default externalCalendarApi;

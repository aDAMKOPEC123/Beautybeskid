// filepath: apps/web/src/api/timeline.api.ts
import { api } from '../lib/axios';

export interface TimelineItem {
  type: 'visit' | 'achievement' | 'loyalty';
  date: string;
  data: {
    serviceName?: string;
    employeeName?: string;
    rating?: number;
    pointsEarned?: number;
    name?: string;
    icon?: string;
    description?: string;
    pointsBonus?: number;
    points?: number;
  };
}

export interface TimelineResponse {
  items: TimelineItem[];
  stats: {
    totalVisits: number;
    uniqueServices: number;
    monthsInCosmo: number;
    tier: string;
  };
  nextCursor: string | null;
}

export const timelineApi = {
  get: async (cursor?: string): Promise<TimelineResponse> => {
    const res = await api.get('/users/me/timeline', { params: { cursor, limit: 20 } });
    return res.data.data.timeline;
  },
};

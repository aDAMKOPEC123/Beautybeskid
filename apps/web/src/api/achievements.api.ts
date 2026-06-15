// filepath: apps/web/src/api/achievements.api.ts
import { api } from '../lib/axios';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  pointsBonus: number;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
  progress?: { current: number; required: number };
}

export const achievementsApi = {
  getAll: async (): Promise<Achievement[]> => {
    const res = await api.get('/achievements');
    return res.data.data.achievements;
  },
  check: async (): Promise<Achievement[]> => {
    const res = await api.post('/achievements/check');
    return res.data.data.newAchievements;
  },
};

import { api } from '../lib/axios';
import { User } from '@cosmo/shared';

export type ReferralsData = {
  ambassadorCode: string | null;
  count: number;
  referrals: { id: string; registeredAt: string }[];
  milestones: { at: number; reward: string }[];
  nextMilestone: { at: number; reward: string } | null;
  progressToNext: number;
};

export const usersApi = {
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.patch('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.user;
  },
  updateMyCard: async (data: { cardAllergies?: string; cardConditions?: string; cardPreferences?: string }) => {
    const res = await api.patch('/users/me/card', data);
    return res.data.data.user;
  },
  updateMyFitzpatrick: async (fitzpatrickType: number | null) => {
    const res = await api.patch('/users/me/fitzpatrick', { fitzpatrickType });
    return res.data.data.user;
  },
  updateUserCard: async (userId: string, data: { cardAllergies?: string; cardConditions?: string; cardPreferences?: string; cardStaffNotes?: string }) => {
    const res = await api.patch(`/users/${userId}/card`, data);
    return res.data.data.user;
  },
  getReferrals: async (): Promise<ReferralsData> => {
    const res = await api.get('/users/me/referrals');
    return res.data.data;
  },
  updateOnboarding: async (completed: boolean): Promise<void> => {
    await api.patch('/users/me', { onboardingCompleted: completed });
  },
  updateMe: async (data: { name?: string; phone?: string | null }): Promise<User> => {
    const res = await api.patch('/users/me', data);
    return res.data.data.user;
  },
  getById: async (userId: string): Promise<User> => {
    const res = await api.get(`/users/${userId}`);
    return res.data.data.user;
  },

  search: async (query: string): Promise<Array<{ id: string; name: string; email: string }>> => {
    const res = await api.get('/users/search', { params: { q: query } });
    return res.data.data;
  },

  getPendingUsers: async () => {
    const res = await api.get('/users/pending');
    return res.data.data.users as Array<{ id: string; name: string; email: string; phone: string | null; createdAt: string }>;
  },

  approveUser: async (id: string) => {
    const res = await api.post(`/users/${id}/approve`);
    return res.data;
  },

  rejectUser: async (id: string) => {
    const res = await api.post(`/users/${id}/reject`);
    return res.data;
  },

  updateRole: async (id: string, role: 'USER' | 'ADMIN' | 'EMPLOYEE'): Promise<User> => {
    const res = await api.patch(`/users/${id}/role`, { role });
    return res.data.data.user;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await api.patch('/users/me/change-password', data);
    return res.data.data.user;
  },
  updateUserBasic: async (userId: string, data: { name?: string; phone?: string | null }) => {
    const res = await api.patch(`/users/${userId}`, data);
    return res.data.data.user;
  },
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

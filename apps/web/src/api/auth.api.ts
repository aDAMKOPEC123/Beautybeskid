// filepath: apps/web/src/api/auth.api.ts
import { api } from '../lib/axios';
import {
  type User,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@cosmo/shared';

type AuthResponseData = {
  user: User;
  accessToken: string;
};

type AuthResponseEnvelope = {
  status: 'success';
  data: AuthResponseData;
};

export const authApi = {
  login: async (data: LoginInput) => {
    const res = await api.post<AuthResponseEnvelope>('/auth/login', data);
    return res.data.data;
  },
  register: async (
    data: RegisterInput,
    avatar?: File,
    termsAccepted = false,
    marketingConsent = false,
    photoConsent = false,
  ) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.phone) formData.append('phone', data.phone);
    if (data.ambassadorCode) formData.append('ambassadorCode', data.ambassadorCode);
    if (avatar) formData.append('avatar', avatar);
    formData.append('termsAccepted', termsAccepted ? 'true' : 'false');
    formData.append('marketingConsent', marketingConsent ? 'true' : 'false');
    formData.append('photoConsent', photoConsent ? 'true' : 'false');
    const res = await api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  forgotPassword: async (data: ForgotPasswordInput) => {
    const res = await api.post('/auth/forgot-password', data);
    return res.data;
  },
  resetPassword: async (data: ResetPasswordInput) => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },

  adminCreateUser: async (data: { name: string; email: string; phone?: string; password: string }) => {
    const res = await api.post('/users/admin-create', data);
    return res.data.data.user;
  },

  loginWithGoogle: (credential: string) =>
    api.post<AuthResponseEnvelope>('/auth/google', { credential }).then((r) => r.data.data),

  getFacebookStatus: () =>
    api
      .get<{ status: 'success'; data: { enabled: boolean } }>('/auth/facebook/status')
      .then((r) => r.data.data),

  refreshSession: () =>
    api.post<AuthResponseEnvelope>('/auth/refresh').then((r) => r.data.data),
};

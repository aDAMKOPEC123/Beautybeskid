// filepath: apps/web/src/api/auth.api.ts
import { api } from '../lib/axios';
import {
  type User,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@cosmo/shared';
import type {
  PasskeyAuthenticationOptions,
  PasskeyRegistrationOptions,
} from '@/lib/passkeys';

type AuthResponseData = {
  user: User;
  accessToken: string;
};

type AuthResponseEnvelope = {
  status: 'success';
  data: AuthResponseData;
};

type GoogleAuthResponseEnvelope = {
  status: string;
  data:
    | AuthResponseData
    | { requiresCompletion: true };
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

  loginWithGoogle: (data: {
    credential: string;
    mode: 'login' | 'register';
    marketingConsent?: boolean;
    photoConsent?: boolean;
    ambassadorCode?: string;
  }) => api.post<GoogleAuthResponseEnvelope>('/auth/google', data).then((r) => r.data.data),

  getFacebookStatus: () =>
    api
      .get<{ status: 'success'; data: { enabled: boolean } }>('/auth/facebook/status')
      .then((r) => r.data.data),

  refreshSession: () =>
    api.post<AuthResponseEnvelope>('/auth/refresh').then((r) => r.data.data),

  getPasskeyStatus: () =>
    api
      .get<{ status: 'success'; data: { enabled: boolean } }>('/auth/passkeys/status')
      .then((r) => r.data.data),

  getPasskeyRegistrationOptions: () =>
    api
      .post<{ status: 'success'; data: PasskeyRegistrationOptions }>('/auth/passkeys/register/options')
      .then((r) => r.data.data),

  verifyPasskeyRegistration: (credential: unknown) =>
    api
      .post<{ status: 'success'; data: { enabled: boolean } }>('/auth/passkeys/register/verify', credential)
      .then((r) => r.data.data),

  getPasskeyLoginOptions: (userId: string) =>
    api
      .post<{ status: 'success'; data: PasskeyAuthenticationOptions }>('/auth/passkeys/login/options', { userId })
      .then((r) => r.data.data),

  verifyPasskeyLogin: (userId: string, credential: unknown) =>
    api
      .post<AuthResponseEnvelope>('/auth/passkeys/login/verify', { userId, ...(credential as object) })
      .then((r) => r.data.data),

  getFacebookRegistration: () =>
    api
      .get<{ status: 'success'; data: { name: string; email: string } }>(
        '/auth/facebook/registration',
      )
      .then((r) => r.data.data),

  completeFacebookRegistration: (data: { name: string; phone: string }) =>
    api
      .post<AuthResponseEnvelope>('/auth/facebook/registration', data)
      .then((r) => r.data.data),

  getGoogleRegistration: () =>
    api
      .get<{ status: 'success'; data: { name: string; email: string } }>(
        '/auth/google/registration',
      )
      .then((r) => r.data.data),

  completeGoogleRegistration: (data: { name: string; phone: string }) =>
    api
      .post<AuthResponseEnvelope>('/auth/google/registration', data)
      .then((r) => r.data.data),
};

import { api } from '../lib/axios';

export type VoucherType = 'SERVICE' | 'CASH';

export type CreateVoucherPayload = {
  type: VoucherType;
  serviceId?: string;
  amount?: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
  validUntil?: string;
};

export type Voucher = {
  id: string;
  type: VoucherType;
  code: string;
  recipientName: string | null;
  senderName: string | null;
  message: string | null;
  validUntil: string;
  amount: string | null;
  remainingAmount: string | null;
  pdfPath: string | null;
  createdAt: string;
  service: { name: string } | null;
};

export const vouchersApi = {
  create: async (payload: CreateVoucherPayload): Promise<Voucher> => {
    const res = await api.post('/vouchers', payload);
    return res.data;
  },

  list: async (page = 1, limit = 20): Promise<{ data: Voucher[]; totalPages: number; total: number }> => {
    const res = await api.get('/vouchers', { params: { page, limit } });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vouchers/${id}`);
  },

  getPdfUrl: (id: string): string => `/api/vouchers/${id}/pdf`,

  adjust: async (id: string, action: 'realize' | 'deduct', amount?: number): Promise<Voucher> => {
    const res = await api.patch(`/vouchers/${id}/adjust`, { action, amount });
    return res.data.data.voucher;
  },

  lookup: async (code: string): Promise<Voucher> => {
    const res = await api.get('/vouchers/lookup', { params: { code } });
    return res.data.data.voucher;
  },
};

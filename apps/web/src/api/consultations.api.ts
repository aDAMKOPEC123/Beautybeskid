import { api } from '../lib/axios';

export interface ConsultationLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  consentContact: boolean;
  consentData: boolean;
  contacted: boolean;
  archived: boolean;
  contactedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export const consultationsApi = {
  submit: (data: { name: string; email: string; phone: string; consentContact: boolean; consentData: boolean }) =>
    api.post('/consultations', data).then((r) => r.data),
  getActive: (): Promise<ConsultationLead[]> =>
    api.get('/consultations').then((r) => r.data.data.leads),
  getArchived: (): Promise<ConsultationLead[]> =>
    api.get('/consultations/archived').then((r) => r.data.data.leads),
  markContacted: (id: string) =>
    api.patch(`/consultations/${id}/contact`).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/consultations/${id}`).then((r) => r.data),
};

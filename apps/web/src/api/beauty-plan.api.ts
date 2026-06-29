import { api } from '../lib/axios';

export type PlanSection = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  externalLinks?: Array<{ label: string; url: string }>;
};

export type PlanExternalLink = { label: string; url: string };

export type BeautyPlan = {
  id: string;
  userId: string;
  createdById: string;
  title: string;
  intro?: string | null;
  sections?: PlanSection[] | null;
  externalLinks?: PlanExternalLink[] | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; avatarPath?: string | null };
  createdBy?: { id: string; name: string };
};

export const beautyPlanApi = {
  // User
  getMy: (): Promise<BeautyPlan | null> =>
    api.get('/beauty-plans/my').then((r) => r.data.data.plan),

  // Admin
  getAll: (): Promise<BeautyPlan[]> =>
    api.get('/beauty-plans').then((r) => r.data.data.plans),

  getByUser: (userId: string): Promise<BeautyPlan | null> =>
    api.get(`/beauty-plans/user/${userId}`).then((r) => r.data.data.plan),

  create: (
    userId: string,
    data: { title: string; intro?: string; sections?: PlanSection[]; externalLinks?: PlanExternalLink[] },
  ): Promise<BeautyPlan> =>
    api.post(`/beauty-plans/user/${userId}`, data).then((r) => r.data.data.plan),

  update: (
    id: string,
    data: {
      title?: string;
      intro?: string;
      sections?: PlanSection[];
      externalLinks?: PlanExternalLink[];
      isPublished?: boolean;
    },
  ): Promise<BeautyPlan> =>
    api.patch(`/beauty-plans/${id}`, data).then((r) => r.data.data.plan),

  delete: (id: string): Promise<void> =>
    api.delete(`/beauty-plans/${id}`).then(() => undefined),

  uploadSectionImage: (id: string, sectionId: string, file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    return api
      .post(`/beauty-plans/${id}/section/${sectionId}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data.imagePath);
  },
};

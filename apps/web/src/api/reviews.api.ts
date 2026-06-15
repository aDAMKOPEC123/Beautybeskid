// filepath: apps/web/src/api/reviews.api.ts
import { api } from '../lib/axios';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  userId: string;
  user: { name: string; avatarPath: string | null };
  serviceId: string;
  service?: { name: string };
  appointmentId: string;
  createdAt: string;
}

export interface ServiceReviewsResponse {
  reviews: Review[];
  aggregate: { avgRating: number; count: number };
  totalPages: number;
}

export interface PendingReview {
  id: string;
  date: string;
  service: { id: string; name: string };
  employee: { name: string } | null;
}

export const reviewsApi = {
  getServiceReviews: async (serviceId: string, page = 1, limit = 10): Promise<ServiceReviewsResponse> => {
    const res = await api.get(`/reviews/service/${serviceId}`, { params: { page, limit } });
    const d = res.data.data;
    return {
      reviews: d.reviews,
      aggregate: { avgRating: d.avgRating ?? 0, count: d.reviewCount ?? 0 },
      totalPages: d.totalPages,
    };
  },
  getPending: async (): Promise<PendingReview[]> => {
    const res = await api.get('/reviews/pending');
    return res.data.data.appointments;
  },
  create: async (data: { appointmentId: string; rating: number; comment?: string }): Promise<Review> => {
    const res = await api.post('/reviews', data);
    return res.data.data.review;
  },
  toggleVisibility: async (id: string): Promise<void> => {
    await api.patch(`/reviews/${id}/visibility`);
  },
  getAll: async (page = 1, limit = 20): Promise<{ reviews: Review[]; totalPages: number }> => {
    const res = await api.get('/reviews/admin', { params: { page, limit } });
    return res.data.data;
  },
};

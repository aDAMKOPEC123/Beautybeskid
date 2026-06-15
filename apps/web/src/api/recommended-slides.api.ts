import { api } from '../lib/axios';

export interface RecommendedSlideService {
  id: string;
  name: string;
  slug: string;
  price: string;
  category: string;
}

export interface RecommendedSlide {
  id: string;
  serviceId: string;
  service: RecommendedSlideService;
  description: string;
  imagePath: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export const recommendedSlidesApi = {
  getSlides: async (): Promise<RecommendedSlide[]> => {
    const res = await api.get('/recommended-slides');
    return res.data.data.slides;
  },
  getAllSlides: async (): Promise<RecommendedSlide[]> => {
    const res = await api.get('/recommended-slides/all');
    return res.data.data.slides;
  },
  createSlide: async (formData: FormData): Promise<RecommendedSlide> => {
    const res = await api.post('/recommended-slides', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.slide;
  },
  updateSlide: async (
    id: string,
    data: Partial<Pick<RecommendedSlide, 'description' | 'isActive' | 'order'>>
  ): Promise<RecommendedSlide> => {
    const res = await api.patch(`/recommended-slides/${id}`, data);
    return res.data.data.slide;
  },
  deleteSlide: async (id: string): Promise<void> => {
    await api.delete(`/recommended-slides/${id}`);
  },
};

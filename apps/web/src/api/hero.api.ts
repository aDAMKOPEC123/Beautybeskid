import { api } from '../lib/axios';

export interface SlideButton {
  label: string;
  href: string;
  variant: 'default' | 'outline';
}

export interface HeroSlide {
  id: string;
  imagePath: string;
  title?: string | null;
  heading?: string | null;
  subtitle?: string | null;
  textPosition?: string | null;
  fontStyle?: string | null;
  buttons?: SlideButton[] | null;
  order: number;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
}

export const heroApi = {
  getSlides: async () => {
    const res = await api.get('/hero');
    return res.data.data.slides as HeroSlide[];
  },
  getAllSlides: async () => {
    const res = await api.get('/hero/all');
    return res.data.data.slides as HeroSlide[];
  },
  createSlide: async (formData: FormData) => {
    const res = await api.post('/hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.slide as HeroSlide;
  },
  setMain: async (id: string) => {
    const res = await api.patch(`/hero/${id}/main`);
    return res.data.data.slide as HeroSlide;
  },
  updateSlide: async (id: string, data: Partial<Pick<HeroSlide, 'title' | 'heading' | 'subtitle' | 'textPosition' | 'fontStyle' | 'isActive' | 'order'> & { buttons: string | SlideButton[] | null }>) => {
    const payload: Record<string, unknown> = { ...data };
    if (data.buttons !== undefined && typeof data.buttons !== 'string') {
      payload.buttons = data.buttons !== null ? JSON.stringify(data.buttons) : null;
    }
    const res = await api.patch(`/hero/${id}`, payload);
    return res.data.data.slide as HeroSlide;
  },
  deleteSlide: async (id: string) => {
    await api.delete(`/hero/${id}`);
  },
};

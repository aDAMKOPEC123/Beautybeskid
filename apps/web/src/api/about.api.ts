import { api } from '../lib/axios';

export interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface AboutPageData {
  id: string;
  salonTagline: string;
  salonDescription: string;
  salonCoverImage: string | null;
  ownerName: string;
  ownerTitle: string;
  ownerBio: string;
  ownerPhoto: string | null;
  featuresTitle: string;
  features: FeatureCard[];
  appDescription: string;
  updatedAt: string;
}

export const aboutApi = {
  get: (): Promise<AboutPageData> =>
    api.get('/about').then((r) => r.data.data.about),
  update: (fd: FormData): Promise<AboutPageData> =>
    api.put('/about', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data.about),
};

import { api } from '@/lib/axios';

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
  profile_photo_url: string;
}

export interface GoogleReviewsData {
  rating: number;
  user_ratings_total: number;
  place_url: string;
  reviews: GoogleReview[];
}

export const googleReviewsApi = {
  get: async (): Promise<GoogleReviewsData> => {
    const res = await api.get<GoogleReviewsData>('/google-reviews');
    return res.data;
  },
};

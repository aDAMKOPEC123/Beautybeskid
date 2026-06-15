import { api } from '@/lib/axios';
import type {
  ContentPost,
  RolkaIdea,
  CreatePostDto,
  CreateIdeaDto,
  KaruzelaIdea,
  CreateKaruzelaDto,
  Trend,
  CreateTrendDto,
  OpisPost,
  CreateOpisDto,
  NagranieItem,
  CreateNagranieDto,
  Kampania,
  CreateKampaniaDto,
  WynikPost,
  CreateWynikDto,
  SocialPlatform,
  ContentStatus,
  IdeaCategory,
  IdeaType,
  IdeaStatus,
  TrendStatus,
  NagranieStatus,
  Priority,
} from '@/types/marketing.types';

export interface PostFilters {
  platform?: SocialPlatform;
  status?: ContentStatus;
  from?: string;
  to?: string;
}

export interface IdeaFilters {
  category?: IdeaCategory;
  type?: IdeaType;
  status?: IdeaStatus;
}

export const marketingApi = {
  getPosts: async (filters: PostFilters = {}): Promise<ContentPost[]> => {
    const res = await api.get('/marketing/posts', { params: filters });
    return res.data;
  },
  createPost: async (data: CreatePostDto): Promise<ContentPost> => {
    const res = await api.post('/marketing/posts', data);
    return res.data;
  },
  updatePost: async (id: string, data: Partial<CreatePostDto>): Promise<ContentPost> => {
    const res = await api.patch(`/marketing/posts/${id}`, data);
    return res.data;
  },
  deletePost: async (id: string): Promise<void> => {
    await api.delete(`/marketing/posts/${id}`);
  },
  getIdeas: async (filters: IdeaFilters = {}): Promise<RolkaIdea[]> => {
    const res = await api.get('/marketing/ideas', { params: filters });
    return res.data;
  },
  createIdea: async (data: CreateIdeaDto): Promise<RolkaIdea> => {
    const res = await api.post('/marketing/ideas', data);
    return res.data;
  },
  updateIdea: async (id: string, data: Partial<CreateIdeaDto>): Promise<RolkaIdea> => {
    const res = await api.patch(`/marketing/ideas/${id}`, data);
    return res.data;
  },
  deleteIdea: async (id: string): Promise<void> => {
    await api.delete(`/marketing/ideas/${id}`);
  },
  scheduleIdea: async (ideaId: string, data: CreatePostDto): Promise<ContentPost> => {
    const res = await api.post(`/marketing/ideas/${ideaId}/schedule`, data);
    return res.data;
  },
  duplicateIdea: async (ideaId: string): Promise<RolkaIdea> => {
    const res = await api.post(`/marketing/ideas/${ideaId}/duplicate`);
    return res.data;
  },

  // Karuzele
  getKaruzele: async (filters: { category?: IdeaCategory; status?: IdeaStatus } = {}): Promise<KaruzelaIdea[]> => {
    const res = await api.get('/marketing/karuzele', { params: filters });
    return res.data;
  },
  createKaruzela: async (data: CreateKaruzelaDto): Promise<KaruzelaIdea> => {
    const res = await api.post('/marketing/karuzele', data);
    return res.data;
  },
  updateKaruzela: async (id: string, data: Partial<CreateKaruzelaDto>): Promise<KaruzelaIdea> => {
    const res = await api.patch(`/marketing/karuzele/${id}`, data);
    return res.data;
  },
  deleteKaruzela: async (id: string): Promise<void> => {
    await api.delete(`/marketing/karuzele/${id}`);
  },
  scheduleKaruzela: async (id: string, data: CreatePostDto): Promise<ContentPost> => {
    const res = await api.post(`/marketing/karuzele/${id}/schedule`, data);
    return res.data;
  },

  // Trendy
  getTrendy: async (filters: { platform?: SocialPlatform; status?: TrendStatus } = {}): Promise<Trend[]> => {
    const res = await api.get('/marketing/trendy', { params: filters });
    return res.data;
  },
  createTrend: async (data: CreateTrendDto): Promise<Trend> => {
    const res = await api.post('/marketing/trendy', data);
    return res.data;
  },
  updateTrend: async (id: string, data: Partial<CreateTrendDto>): Promise<Trend> => {
    const res = await api.patch(`/marketing/trendy/${id}`, data);
    return res.data;
  },
  deleteTrend: async (id: string): Promise<void> => {
    await api.delete(`/marketing/trendy/${id}`);
  },

  // Opisy
  getOpisy: async (filters: { category?: IdeaCategory } = {}): Promise<OpisPost[]> => {
    const res = await api.get('/marketing/opisy', { params: filters });
    return res.data;
  },
  createOpis: async (data: CreateOpisDto): Promise<OpisPost> => {
    const res = await api.post('/marketing/opisy', data);
    return res.data;
  },
  updateOpis: async (id: string, data: Partial<CreateOpisDto>): Promise<OpisPost> => {
    const res = await api.patch(`/marketing/opisy/${id}`, data);
    return res.data;
  },
  deleteOpis: async (id: string): Promise<void> => {
    await api.delete(`/marketing/opisy/${id}`);
  },

  // Nagrania
  getNagrania: async (filters: { status?: NagranieStatus; priority?: Priority } = {}): Promise<NagranieItem[]> => {
    const res = await api.get('/marketing/nagrania', { params: filters });
    return res.data;
  },
  createNagranie: async (data: CreateNagranieDto): Promise<NagranieItem> => {
    const res = await api.post('/marketing/nagrania', data);
    return res.data;
  },
  updateNagranie: async (id: string, data: Partial<CreateNagranieDto>): Promise<NagranieItem> => {
    const res = await api.patch(`/marketing/nagrania/${id}`, data);
    return res.data;
  },
  deleteNagranie: async (id: string): Promise<void> => {
    await api.delete(`/marketing/nagrania/${id}`);
  },

  // Kampanie
  getKampanie: async (): Promise<Kampania[]> => {
    const res = await api.get('/marketing/kampanie');
    return res.data;
  },
  createKampania: async (data: CreateKampaniaDto): Promise<Kampania> => {
    const res = await api.post('/marketing/kampanie', data);
    return res.data;
  },
  updateKampania: async (id: string, data: Partial<CreateKampaniaDto>): Promise<Kampania> => {
    const res = await api.patch(`/marketing/kampanie/${id}`, data);
    return res.data;
  },
  deleteKampania: async (id: string): Promise<void> => {
    await api.delete(`/marketing/kampanie/${id}`);
  },

  // Wyniki
  getWyniki: async (filters: { platform?: SocialPlatform } = {}): Promise<WynikPost[]> => {
    const res = await api.get('/marketing/wyniki', { params: filters });
    return res.data;
  },
  createWynik: async (data: CreateWynikDto): Promise<WynikPost> => {
    const res = await api.post('/marketing/wyniki', data);
    return res.data;
  },
  updateWynik: async (id: string, data: Partial<CreateWynikDto>): Promise<WynikPost> => {
    const res = await api.patch(`/marketing/wyniki/${id}`, data);
    return res.data;
  },
  deleteWynik: async (id: string): Promise<void> => {
    await api.delete(`/marketing/wyniki/${id}`);
  },
};

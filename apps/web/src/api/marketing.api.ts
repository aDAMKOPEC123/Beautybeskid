import { api } from '@/lib/axios';
import type {
  ContentPost,
  RolkaIdea,
  CreatePostDto,
  CreateIdeaDto,
  SocialPlatform,
  ContentStatus,
  IdeaCategory,
  IdeaType,
  IdeaStatus,
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
};

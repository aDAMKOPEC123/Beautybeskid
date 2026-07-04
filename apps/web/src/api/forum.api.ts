import { api } from '@/lib/axios';

export interface ForumAuthor {
  id: string | null;
  name: string;
  avatarPath: string | null;
  createdAt?: string;
  _count?: { forumPosts: number };
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  _count?: { threads: number };
  postCount?: number;
  lastThread?: { title: string; createdAt: string } | null;
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  isPinned: boolean;
  isLocked: boolean;
  isDeleted: boolean;
  tags: string[];
  viewCount: number;
  mentionsAdmin?: boolean;
  author: ForumAuthor;
  category: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
  lastPost?: { author: { name: string }; createdAt: string } | null;
}

export interface ReactionCounts {
  LIKE: { count: number; reacted: boolean };
  HEART: { count: number; reacted: boolean };
  HELPFUL: { count: number; reacted: boolean };
}

export interface ForumPost {
  id: string;
  content: string;
  isAnonymous: boolean;
  isDeleted: boolean;
  mentionsAdmin: boolean;
  quotedPostId: string | null;
  quotedContent: string | null;
  author: ForumAuthor;
  threadId: string;
  createdAt: string;
  updatedAt: string;
  reactions: ReactionCounts;
}

export interface ForumTag {
  tag: string;
  count: number;
}

export interface ForumStats {
  threadCount: number;
  postCount: number;
  userCount: number;
}

export interface ForumUserProfile {
  user: { id: string; name: string; avatarPath: string | null; createdAt: string };
  postCount: number;
  data: ForumThread[];
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalPages: number;
}

export interface ThreadDetailResponse {
  thread: ForumThread;
  posts: PaginatedResponse<ForumPost>;
}

export const forumApi = {
  // Categories
  getCategories: async (): Promise<ForumCategory[]> => {
    const res = await api.get('/forum/categories');
    return res.data;
  },

  createCategory: async (data: {
    name: string;
    slug: string;
    description?: string;
    order?: number;
  }): Promise<ForumCategory> => {
    const res = await api.post('/forum/categories', data);
    return res.data;
  },

  updateCategory: async (
    id: string,
    data: Partial<{ name: string; slug: string; description: string; order: number; icon: string; color: string }>,
  ): Promise<ForumCategory> => {
    const res = await api.patch(`/forum/categories/${id}`, data);
    return res.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/forum/categories/${id}`);
  },

  // Threads
  getThreadsByCategory: async (
    slug: string,
    params?: { page?: number; limit?: number; sort?: 'newest' | 'active' | 'popular' },
  ): Promise<PaginatedResponse<ForumThread>> => {
    const res = await api.get(`/forum/categories/${slug}/threads`, { params });
    return res.data;
  },

  getThread: async (
    id: string,
    params?: { page?: number; limit?: number },
  ): Promise<ThreadDetailResponse> => {
    const res = await api.get(`/forum/threads/${id}`, { params });
    return res.data;
  },

  createThread: async (data: {
    title: string;
    content: string;
    categoryId: string;
    isAnonymous?: boolean;
    tags?: string[];
  }): Promise<ForumThread> => {
    const res = await api.post('/forum/threads', data);
    return res.data;
  },

  deleteThread: async (id: string): Promise<void> => {
    await api.delete(`/forum/threads/${id}`);
  },

  pinThread: async (id: string): Promise<ForumThread> => {
    const res = await api.patch(`/forum/threads/${id}/pin`);
    return res.data;
  },

  lockThread: async (id: string): Promise<ForumThread> => {
    const res = await api.patch(`/forum/threads/${id}/lock`);
    return res.data;
  },

  moveThread: async (id: string, categoryId: string): Promise<ForumThread> => {
    const res = await api.patch(`/forum/threads/${id}/move`, { categoryId });
    return res.data;
  },

  // Posts
  createPost: async (
    threadId: string,
    data: { content: string; isAnonymous?: boolean; quotedPostId?: string; quotedContent?: string },
  ): Promise<ForumPost> => {
    const res = await api.post(`/forum/threads/${threadId}/posts`, data);
    return res.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await api.delete(`/forum/posts/${id}`);
  },

  // Reactions
  reactToPost: async (
    postId: string,
    type: 'LIKE' | 'HEART' | 'HELPFUL',
  ): Promise<{ reacted: boolean; type: string; counts: Record<string, number> }> => {
    const res = await api.post(`/forum/posts/${postId}/react`, { type });
    return res.data;
  },

  // Watch
  toggleWatch: async (threadId: string): Promise<{ watching: boolean }> => {
    const res = await api.post(`/forum/threads/${threadId}/watch`);
    return res.data;
  },

  getWatchStatus: async (threadId: string): Promise<{ watching: boolean }> => {
    const res = await api.get(`/forum/threads/${threadId}/watch`);
    return res.data;
  },

  // Search
  search: async (params: {
    q: string;
    tags?: string[];
    categoryId?: string;
    page?: number;
  }): Promise<PaginatedResponse<ForumThread> & { total: number }> => {
    const res = await api.get('/forum/search', {
      params: { ...params, tags: params.tags?.join(',') },
    });
    return res.data;
  },

  // Tags
  getPopularTags: async (): Promise<ForumTag[]> => {
    const res = await api.get('/forum/tags');
    return res.data;
  },

  // Stats
  getStats: async (): Promise<ForumStats> => {
    const res = await api.get('/forum/stats');
    return res.data;
  },

  // User profile
  getUserThreads: async (
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<ForumUserProfile> => {
    const res = await api.get(`/forum/users/${userId}/threads`, { params });
    return res.data;
  },

  // Admin
  getAdminThreads: async (params?: {
    page?: number;
    limit?: number;
    filter?: 'all' | 'admin-mention' | 'deleted' | 'pinned';
  }): Promise<PaginatedResponse<ForumThread>> => {
    const res = await api.get('/forum/admin/threads', { params });
    return res.data;
  },

  adminDeleteThread: async (id: string): Promise<void> => {
    await api.delete(`/forum/admin/threads/${id}`);
  },

  adminDeletePost: async (id: string): Promise<void> => {
    await api.delete(`/forum/admin/posts/${id}`);
  },
};

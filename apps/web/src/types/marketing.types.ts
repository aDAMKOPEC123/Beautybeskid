export type SocialPlatform = 'IG' | 'TIKTOK' | 'FB';
export type ContentFormat = 'ROLKA' | 'KARUZELA' | 'STORY' | 'POST';
export type ContentStatus = 'POMYSL' | 'SCENARIUSZ' | 'NAGRANE' | 'ZMONTOWANE' | 'OPUBLIKOWANE';
export type IdeaCategory = 'LAMINACJA' | 'PEDICURE' | 'PODOLOGIA' | 'TWARZ' | 'BRWI' | 'INNE';
export type IdeaType = 'POV' | 'COMEDY' | 'EDUKACYJNA' | 'BEFORE_AFTER' | 'BLIND_REACTION' | 'LOOP';
export type IdeaStatus = 'POMYSL' | 'SCENARIUSZ' | 'GOTOWA' | 'WYKORZYSTANA';

export interface ContentPost {
  id: string;
  title: string;
  platform: SocialPlatform;
  format: ContentFormat;
  scheduledAt: string;
  status: ContentStatus;
  thumbnailUrl?: string | null;
  notes?: string | null;
  ideaId?: string | null;
  idea?: { title: string; category: IdeaCategory } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolkaIdea {
  id: string;
  title: string;
  hook?: string | null;
  sceneDesc?: string | null;
  category: IdeaCategory;
  type: IdeaType;
  audioName?: string | null;
  audioUrl?: string | null;
  props?: string | null;
  status: IdeaStatus;
  plannedDate?: string | null;
  post?: { id: string; scheduledAt: string; status: ContentStatus } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  title: string;
  platform: SocialPlatform;
  format: ContentFormat;
  scheduledAt: string;
  status: ContentStatus;
  thumbnailUrl?: string;
  notes?: string;
}

export interface CreateIdeaDto {
  title: string;
  hook?: string;
  sceneDesc?: string;
  category: IdeaCategory;
  type: IdeaType;
  audioName?: string;
  audioUrl?: string;
  props?: string;
  status: IdeaStatus;
  plannedDate?: string;
}

export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  IG: '#E1306C',
  TIKTOK: '#010101',
  FB: '#4267B2',
};

export const STATUS_COLORS: Record<ContentStatus, string> = {
  POMYSL: '#94a3b8',
  SCENARIUSZ: '#f59e0b',
  NAGRANE: '#3b82f6',
  ZMONTOWANE: '#8b5cf6',
  OPUBLIKOWANE: '#10b981',
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  POMYSL: 'Pomysl',
  SCENARIUSZ: 'Scenariusz',
  NAGRANE: 'Nagrane',
  ZMONTOWANE: 'Zmontowane',
  OPUBLIKOWANE: 'Opublikowane',
};

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  POMYSL: 'Pomysl',
  SCENARIUSZ: 'Scenariusz',
  GOTOWA: 'Gotowa',
  WYKORZYSTANA: 'Wykorzystana',
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  IG: 'Instagram',
  TIKTOK: 'TikTok',
  FB: 'Facebook',
};

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  ROLKA: 'Rolka',
  KARUZELA: 'Karuzela',
  STORY: 'Story',
  POST: 'Post',
};

export const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  LAMINACJA: 'Laminacja',
  PEDICURE: 'Pedicure',
  PODOLOGIA: 'Podologia',
  TWARZ: 'Twarz',
  BRWI: 'Brwi',
  INNE: 'Inne',
};

export const TYPE_LABELS: Record<IdeaType, string> = {
  POV: 'POV',
  COMEDY: 'Comedy',
  EDUKACYJNA: 'Edukacyjna',
  BEFORE_AFTER: 'Before/After',
  BLIND_REACTION: 'Blind Reaction',
  LOOP: 'Loop',
};

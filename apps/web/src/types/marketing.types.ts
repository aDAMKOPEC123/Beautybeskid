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

// ============ Karuzele ============

export interface KaruzelaIdea {
  id: string;
  title: string;
  slideDesc?: string | null;
  category: IdeaCategory;
  status: IdeaStatus;
  plannedDate?: string | null;
  post?: { id: string; scheduledAt: string; status: ContentStatus } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKaruzelaDto {
  title: string;
  slideDesc?: string;
  category: IdeaCategory;
  status: IdeaStatus;
  plannedDate?: string;
}

// ============ Trendy ============

export type TrendStatus = 'AKTYWNY' | 'PRZETERMINOWANY';

export interface Trend {
  id: string;
  name: string;
  platform: SocialPlatform;
  link?: string | null;
  status: TrendStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrendDto {
  name: string;
  platform: SocialPlatform;
  link?: string;
  status: TrendStatus;
  notes?: string;
}

export const TREND_STATUS_LABELS: Record<TrendStatus, string> = {
  AKTYWNY: 'Aktywny',
  PRZETERMINOWANY: 'Przeterminowany',
};

// ============ Opisy ============

export interface OpisPost {
  id: string;
  title: string;
  content: string;
  hashtags?: string | null;
  category: IdeaCategory;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpisDto {
  title: string;
  content: string;
  hashtags?: string;
  category: IdeaCategory;
}

// ============ Nagrania ============

export type NagranieStatus = 'DO_NAGRANIA' | 'NAGRANE';
export type Priority = 'NISKI' | 'SREDNI' | 'WYSOKI';

export interface NagranieItem {
  id: string;
  title: string;
  rolkaId?: string | null;
  rolka?: { id: string; title: string } | null;
  karuzelaId?: string | null;
  karuzela?: { id: string; title: string } | null;
  status: NagranieStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNagranieDto {
  title: string;
  rolkaId?: string;
  karuzelaId?: string;
  status: NagranieStatus;
  priority: Priority;
}

export const NAGRANIE_STATUS_LABELS: Record<NagranieStatus, string> = {
  DO_NAGRANIA: 'Do nagrania',
  NAGRANE: 'Nagrane',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  NISKI: 'Niski',
  SREDNI: 'Sredni',
  WYSOKI: 'Wysoki',
};

// ============ Kampanie ============

export interface Kampania {
  id: string;
  name: string;
  goal?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  platform: SocialPlatform;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKampaniaDto {
  name: string;
  goal?: string;
  dateFrom?: string;
  dateTo?: string;
  platform: SocialPlatform;
  notes?: string;
}

// ============ Wyniki ============

export interface WynikPost {
  id: string;
  postId?: string | null;
  post?: { id: string; title: string } | null;
  title: string;
  platform: SocialPlatform;
  publishedAt: string;
  reach?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWynikDto {
  postId?: string;
  title: string;
  platform: SocialPlatform;
  publishedAt: string;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
}

// filepath: packages/shared/src/types/blog.types.ts
import { User } from './user.types';

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string | null;
  isPublished: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  views: number;
  authorId: string;
  author?: User;
  tags?: Tag[];
  createdAt: Date;
  updatedAt: Date;
}

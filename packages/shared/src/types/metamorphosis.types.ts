// filepath: packages/shared/src/types/metamorphosis.types.ts
import { Service } from './service.types';

export interface Metamorphosis {
  id: string;
  title: string;
  description?: string | null;
  beforeImage: string;
  afterImage: string;
  serviceId?: string | null;
  service?: Service;
  isPublished: boolean;
  createdAt: Date;
}

// filepath: packages/shared/src/types/service.types.ts
export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER',
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  imagePath?: string | null;
  isActive: boolean;
  detailedContent?: string | null;
  routineFirst48h?: string | null;
  routineFollowingDays?: string | null;
  routineProducts?: string | null;
  recommendedIntervalDays?: number | null;
  isMultiVisit: boolean;
  seriesIntervalsDays: number[];
  seasons: Season[];
  createdAt: Date;
  updatedAt: Date;
}

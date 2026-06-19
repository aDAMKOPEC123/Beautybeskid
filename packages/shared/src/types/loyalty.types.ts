// filepath: packages/shared/src/types/loyalty.types.ts
import { User } from './user.types';

export enum TransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  MANUAL_ADJUST = 'MANUAL_ADJUST'
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  isActive: boolean;
  createdAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  user?: User;
  points: number;
  type: TransactionType;
  description: string;
  rewardId?: string | null;
  reward?: LoyaltyReward;
  createdAt: Date;
}

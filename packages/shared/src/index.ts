// filepath: packages/shared/src/index.ts
export { AccountStatus, LoyaltyTier, Role } from './types/user.types';
export type { User } from './types/user.types';
export { Season } from './types/service.types';
export type { Service } from './types/service.types';
export * from './types/blog.types';
export * from './types/metamorphosis.types';
export { TransactionType } from './types/loyalty.types';
export type { LoyaltyReward, LoyaltyTransaction } from './types/loyalty.types';
export * from './types/chat.types';
export { AppointmentStatus } from './types/appointment.types';
export type {
  Appointment,
  AppointmentCancellationRequest,
  AppointmentDiscountSnapshot,
  AppointmentHistoryPage,
  AppointmentHistoryStatus,
  AppointmentOverview,
  AppointmentPostVisit,
} from './types/appointment.types';

export * from './schemas/auth.schema';
export * from './schemas/service.schema';
export * from './schemas/blog.schema';
export * from './schemas/loyalty.schema';
export * from './types/discount-codes.types';
export * from './schemas/discount-codes.schema';
export * from './types/store-promotions.types';
export * from './schemas/store-promotions.schema';

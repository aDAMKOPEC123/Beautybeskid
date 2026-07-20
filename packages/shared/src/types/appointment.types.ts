// filepath: packages/shared/src/types/appointment.types.ts

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export type AppointmentHistoryStatus = 'ALL' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type AppointmentDiscountSnapshot = {
  source: 'SERVICE_PROMOTION' | 'HAPPY_HOUR' | 'COUPON' | 'DISCOUNT_CODE' | 'VOUCHER' | 'LEGACY';
  label: string;
  amount: number;
};

export type AppointmentCancellationRequest = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  reason: string | null;
  policyNoticeHours: number;
  policyVersion: string;
  createdAt: string;
};

export type AppointmentPostVisit = {
  recommendationsCount: number;
  hasHomecareRoutine: boolean;
  journalPhotoCount: number;
  hasAppointmentPhoto: boolean;
  hasPublishedBeautyPlan: boolean;
};

export interface Appointment {
  id: string;
  userId: string | null;
  serviceId: string;
  employeeId: string | null;
  date: string;
  status: AppointmentStatus;
  priceAtBooking: number | string;
  finalPrice: number | string;
  discountTotal: number | string;
  discountBreakdown: AppointmentDiscountSnapshot[];
  loyaltyPointsAwarded: number | null;
  customDurationMinutes: number | null;
  durationMinutes: number;
  rescheduleDate: string | null;
  rescheduleStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  activeCancellationRequest: AppointmentCancellationRequest | null;
  locationNameAtBooking: string | null;
  locationAddressAtBooking: string | null;
  locationLatitudeAtBooking: number | string | null;
  locationLongitudeAtBooking: number | string | null;
  salonPhoneAtBooking: string | null;
  notes: string | null;
  allergies: string | null;
  problemDescription: string | null;
  staffNote: string | null;
  photoPath: string | null;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number | string;
    slug: string;
    category: string;
  };
  employee: { id: string; name: string; avatarPath: string | null } | null;
  postVisit: AppointmentPostVisit;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentOverview = {
  nextAppointment: Appointment | null;
  otherUpcoming: Appointment[];
  cancellationPolicy: { noticeHours: number; version: string };
  salonContact: {
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    phone: string;
    email: string;
  };
};

export type AppointmentHistoryPage = {
  items: Appointment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

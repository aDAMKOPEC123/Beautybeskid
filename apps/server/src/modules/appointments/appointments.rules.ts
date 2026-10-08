// Czyste reguły kolizji wizyt — bez Prismy, bez sieci. Testowalne jednostkowo.

export interface BookedAppointmentLike {
  date: Date;
  customDurationMinutes: number | null;
  service: { durationMinutes: number } | null;
}

const DEFAULT_DURATION_MINUTES = 60;

// Najdłuższa wizyta, jaką bierzemy pod uwagę przy szukaniu kandydatów do kolizji.
export const MAX_APPOINTMENT_LOOKBACK_MS = 24 * 60 * 60_000;

export function hasAppointmentConflict(
  start: Date,
  end: Date,
  booked: BookedAppointmentLike[],
): boolean {
  return booked.some((apt) => {
    const duration = apt.customDurationMinutes ?? apt.service?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const aptStart = new Date(apt.date);
    const aptEnd = new Date(aptStart.getTime() + duration * 60_000);
    return start < aptEnd && end > aptStart;
  });
}

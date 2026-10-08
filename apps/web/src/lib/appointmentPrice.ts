type PriceValue = number | string | null | undefined;

interface PricedAppointment {
  priceAtBooking?: PriceValue;
  finalPrice?: PriceValue;
  service?: { price?: PriceValue } | null;
}

const toNumber = (value: PriceValue): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Cena wizyty do pokazania w panelu.
 *
 * Źródłem prawdy są kwoty zapisane przy rezerwacji (po promocji usługi,
 * Happy Hours, kuponie, kodzie i voucherze), a nie aktualny cennik usługi —
 * inaczej przeceniona wizyta wygląda na pełnopłatną.
 */
export function appointmentPrice(appointment: PricedAppointment) {
  const servicePrice = toNumber(appointment.service?.price);
  const base = toNumber(appointment.priceAtBooking) ?? servicePrice;
  const final = toNumber(appointment.finalPrice) ?? base;
  if (base == null || final == null) return null;
  return { base, final, hasDiscount: final < base };
}

export const formatPrice = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export type CardDensity = 'compact' | 'medium' | 'full';

const MEDIUM_FROM_MINUTES = 45;
const FULL_FROM_MINUTES = 90;

/**
 * Ile treści zmieści się w kaflu wizyty.
 *
 * Liczone z długości wizyty, nie z pikseli: FullCalendar v6 nie podaje
 * wiarygodnej wysokości elementu w eventContent podczas pierwszego renderu
 * (patrz komentarz w AppointmentCard.tsx). Długość jest stabilnym
 * przybliżeniem i daje się przetestować bez renderowania.
 *
 * Wartość bezsensowna (NaN, zero, ujemna) daje compact — najmniej treści,
 * czyli wybór, który nigdy nie przepełni kafla.
 */
export function cardDensity(durationMinutes: number): CardDensity {
  if (Number.isNaN(durationMinutes)) return 'compact';
  if (durationMinutes >= FULL_FROM_MINUTES) return 'full';
  if (durationMinutes >= MEDIUM_FROM_MINUTES) return 'medium';
  return 'compact';
}

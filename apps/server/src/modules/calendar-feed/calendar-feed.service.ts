import { randomBytes } from 'crypto';
import { prisma } from '../../config/prisma';
import { buildIcs, type IcsEvent } from './ics';

const WINDOW_DAYS_BACK = 30;
const WINDOW_DAYS_FORWARD = 180;
const UID_DOMAIN = 'kosmetologwiktoriacwik.pl';
const CALENDAR_NAME = 'COSMO — wizyty';

export interface FeedAppointment {
  id: string;
  date: Date;
  status: string;
  customDurationMinutes: number | null;
  finalPrice: unknown;
  clientName: string | null;
  clientPhone: string | null;
  locationAddressAtBooking: string | null;
  updatedAt: Date;
  service: { name: string; durationMinutes: number };
  employee: { name: string } | null;
  user: { name: string; phone: string | null } | null;
}

/** Inicjały pracownicy do tytułu wydarzenia, np. „Anna Kowal" → „AK". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Odwołana wizyta znika z kalendarza przy najbliższym odświeżeniu. */
export function isExportableStatus(status: string): boolean {
  return status !== 'CANCELLED';
}

export function appointmentToIcsEvent(a: FeedAppointment): IcsEvent {
  const clientName = a.user?.name ?? a.clientName ?? 'Klientka';
  const phone = a.user?.phone ?? a.clientPhone ?? null;
  const minutes = a.customDurationMinutes ?? a.service.durationMinutes;
  const suffix = a.employee ? ` (${initialsOf(a.employee.name)})` : '';

  const descriptionParts: string[] = [];
  if (phone) descriptionParts.push(`Telefon: ${phone}`);
  descriptionParts.push(`Cena: ${String(a.finalPrice)} zł`);
  descriptionParts.push(`Status: ${a.status}`);

  return {
    uid: `appointment-${a.id}@${UID_DOMAIN}`,
    start: new Date(a.date),
    end: new Date(a.date.getTime() + minutes * 60_000),
    summary: `${clientName} — ${a.service.name}${suffix}`,
    description: descriptionParts.join('\n'),
    location: a.locationAddressAtBooking ?? undefined,
    lastModified: a.updatedAt,
  };
}

const newToken = () => randomBytes(32).toString('base64url');

// Stały identyfikator wymusza jednowierszowość tabeli: dwa równoczesne pierwsze
// wejścia (dwie karty, React StrictMode w dev) trafiają w ten sam `upsert` zamiast
// wstawiać dwa wiersze z różnymi tokenami. Bez tego `regenerateToken` rotowałby
// tylko najstarszy wiersz, a drugi token nigdy nie zostałby unieważniony — link
// wyciekłby na stałe, mimo że UI oznajmiłby sukces. Pole `id` w modelu ma
// `@default(cuid())`, ale skoro zawsze podajemy `id` jawnie, ten default po
// prostu nie jest używany — migracja nie wymaga zmian.
const FEED_ID = 'default';

export const getOrCreateFeed = async () => {
  return await prisma.calendarFeed.upsert({
    where: { id: FEED_ID },
    update: {},
    create: { id: FEED_ID, token: newToken() },
  });
};

export const regenerateToken = async () => {
  // Upewnij się, że wiersz istnieje (na wypadek pierwszego wywołania), a potem
  // nadpisz jego token — zawsze pod tym samym stałym id, nigdy „najstarszy z...".
  await getOrCreateFeed();
  // Nadpisanie tokenu unieważnia stary adres natychmiast; historia dostępu
  // zeruje się razem z nim, bo dotyczyła poprzedniego linku.
  return await prisma.calendarFeed.update({
    where: { id: FEED_ID },
    data: { token: newToken(), lastAccessedAt: null, accessCount: 0 },
  });
};

/** Zwraca treść pliku ICS albo null, gdy token jest nieznany. */
export const buildFeedForToken = async (token: string): Promise<string | null> => {
  const feed = await prisma.calendarFeed.findUnique({ where: { token } });
  if (!feed) return null;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - WINDOW_DAYS_BACK);
  const to = new Date(now);
  to.setDate(to.getDate() + WINDOW_DAYS_FORWARD);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: from, lte: to },
      status: { not: 'CANCELLED' },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true, date: true, status: true, customDurationMinutes: true,
      finalPrice: true, clientName: true, clientPhone: true,
      locationAddressAtBooking: true, updatedAt: true,
      service: { select: { name: true, durationMinutes: true } },
      employee: { select: { name: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  await prisma.calendarFeed.update({
    where: { id: feed.id },
    data: { lastAccessedAt: new Date(), accessCount: { increment: 1 } },
  });

  const events = (appointments as unknown as FeedAppointment[])
    .filter((a) => isExportableStatus(a.status))
    .map(appointmentToIcsEvent);

  return buildIcs(events, CALENDAR_NAME);
};

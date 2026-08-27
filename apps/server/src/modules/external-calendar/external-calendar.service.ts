import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { parseIcs } from './external-calendar.parser';
import { shouldDeleteStale } from './external-calendar.sync-rules';

const WINDOW_DAYS_BACK = 30;
const WINDOW_DAYS_FORWARD = 120;
const FETCH_TIMEOUT_MS = 15_000;

const windowRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - WINDOW_DAYS_BACK);
  const end = new Date(now);
  end.setDate(end.getDate() + WINDOW_DAYS_FORWARD);
  return { start, end };
};

export const getSource = async () => {
  return await prisma.externalCalendarSource.findFirst({ orderBy: { createdAt: 'asc' } });
};

export const upsertSource = async (data: { url: string; name?: string; isEnabled?: boolean }) => {
  const url = data.url?.trim();
  if (!url || !/^(webcal|https?):\/\//i.test(url)) {
    throw new AppError('Podaj poprawny link do kalendarza (webcal:// lub https://)', 400);
  }
  const existing = await getSource();
  if (existing) {
    return await prisma.externalCalendarSource.update({
      where: { id: existing.id },
      data: {
        url,
        name: data.name ?? existing.name,
        isEnabled: data.isEnabled ?? existing.isEnabled,
        lastSyncError: null,
      },
    });
  }
  return await prisma.externalCalendarSource.create({
    data: { url, name: data.name ?? 'Kalendarz Apple', isEnabled: data.isEnabled ?? true },
  });
};

export const deleteSource = async () => {
  const existing = await getSource();
  if (!existing) throw new AppError('Nie skonfigurowano kalendarza', 404);
  await prisma.externalCalendarSource.delete({ where: { id: existing.id } }); // kaskada usuwa wydarzenia
  return { success: true };
};

export const listEvents = async (from: string, to: string) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new AppError('Nieprawidłowy zakres dat', 400);
  }
  return await prisma.externalCalendarEvent.findMany({
    where: { startsAt: { lt: toDate }, endsAt: { gt: fromDate } },
    orderBy: { startsAt: 'asc' },
  });
};

const fetchIcs = async (url: string): Promise<string> => {
  const httpUrl = url.replace(/^webcal:\/\//i, 'https://');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(httpUrl, { signal: controller.signal });
    if (!res.ok) throw new AppError(`Kalendarz zwrócił status ${res.status}`, 502);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

export const syncNow = async (): Promise<{ imported: number }> => {
  const source = await getSource();
  if (!source) throw new AppError('Nie skonfigurowano kalendarza', 404);
  if (!source.isEnabled) return { imported: 0 };

  const { start, end } = windowRange();

  try {
    const text = await fetchIcs(source.url);
    const events = parseIcs(text, start, end);

    const keptIds: string[] = [];
    for (const ev of events) {
      const saved = await prisma.externalCalendarEvent.upsert({
        where: {
          sourceId_uid_startsAt: { sourceId: source.id, uid: ev.uid, startsAt: ev.startsAt },
        },
        create: {
          sourceId: source.id,
          uid: ev.uid,
          title: ev.title,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          isAllDay: ev.isAllDay,
          location: ev.location,
        },
        update: {
          title: ev.title,
          endsAt: ev.endsAt,
          isAllDay: ev.isAllDay,
          location: ev.location,
        },
      });
      keptIds.push(saved.id);
    }

    if (shouldDeleteStale(events.length)) {
      // Skasuj z okna wystąpienia, których nie ma już w pliku.
      await prisma.externalCalendarEvent.deleteMany({
        where: {
          sourceId: source.id,
          startsAt: { gte: start, lt: end },
          id: { notIn: keptIds },
        },
      });

      await prisma.externalCalendarSource.update({
        where: { id: source.id },
        data: { lastSyncedAt: new Date(), lastSyncError: null },
      });
    } else {
      // Zero wydarzeń jest niejednoznaczne (może to być uszkodzona odpowiedź) —
      // nie kasujemy poprzednich danych, tylko zostawiamy o tym informację.
      await prisma.externalCalendarSource.update({
        where: { id: source.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncError: 'Kalendarz zwrócił zero wydarzeń — zachowano poprzednie dane',
        },
      });
      return { imported: 0 };
    }

    try {
      getIO().to('admin:global').emit('external-calendar:updated');
    } catch {
      // Socket.IO może nie być zainicjalizowany (np. w skryptach) — synchronizacja i tak się powiodła.
    }

    return { imported: events.length };
  } catch (err: any) {
    // Błąd nie kasuje wcześniej pobranych wydarzeń — zostają ostatnie znane dane.
    await prisma.externalCalendarSource.update({
      where: { id: source.id },
      data: { lastSyncError: err?.message ?? 'Nieznany błąd synchronizacji' },
    });
    throw err instanceof AppError ? err : new AppError('Nie udało się pobrać kalendarza', 502);
  }
};

export const initializeExternalCalendarSync = (): void => {
  const tick = async () => {
    try {
      const source = await getSource();
      if (!source || !source.isEnabled) return;
      const { imported } = await syncNow();
      console.log(`[external-calendar] zsynchronizowano ${imported} wydarzeń`);
    } catch (err: any) {
      console.error('[external-calendar] błąd synchronizacji:', err?.message ?? err);
    }
  };

  void tick();
  setInterval(tick, 15 * 60 * 1000);
};

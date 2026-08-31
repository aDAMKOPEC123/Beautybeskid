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

// Dolna granica chroni iCloud przed odpytywaniem częstszym, niż ma sens dla
// kalendarza aktualizowanego ręcznie przez człowieka; górna zabezpiecza przed
// wartością, która praktycznie wyłączyłaby synchronizację.
const MIN_SYNC_MINUTES = 2;
const MAX_SYNC_MINUTES = 60;
const TICK_MS = 60_000;
// Górny pułap odstępu przy narastającym backoffie po nieudanych synchronizacjach.
const MAX_BACKOFF_MINUTES = 30;

export const initializeExternalCalendarSync = (): void => {
  // Chroni przed nakładającymi się synchronizacjami: syncNow() (pobranie ICS +
  // sekwencyjne upserty) może trwać dłużej niż jeden tick (60 s), a przy
  // minutowym ticku lastSyncedAt z poprzedniej, wciąż trwającej synchronizacji
  // jeszcze nie jest zapisane — bez tej flagi kolejny tick uznałby zadanie za
  // "spóźnione" i uruchomiłby drugie syncNow() równolegle. Dwie równoległe
  // synchronizacje ścigałyby się na deleteMany({ id: { notIn: keptIds } }),
  // każda z inną migawką keptIds, co kasowałoby świeżo zapisane wydarzenia
  // drugiej synchronizacji (efekt: znikanie i wracanie wydarzeń w kalendarzu).
  let syncInProgress = false;

  // Licznik kolejnych nieudanych synchronizacji — zerowany po sukcesie,
  // zwiększany w catch. Chroni iCloud (i log) przed zalewem prób, gdy link
  // wygasł, Apple odpowiada 502 albo requesty timeoutują: bez tego dueAt
  // liczone tylko z lastSyncedAt w ogóle by się nie przesuwało (błąd nie
  // rusza lastSyncedAt — patrz komentarz w syncNow), więc przy minutowym
  // ticku każdy kolejny tick uznawałby zadanie za spóźnione i próbowałby
  // ponownie — 1440 prób/dobę zamiast rozsądnych ~96 dla stanu, w którym
  // najbardziej opłaca się wycofać.
  let consecutiveFailures = 0;

  // Tick co minutę sprawdza, czy minął interwał zapisany przy źródle. Dzięki
  // temu zmiana interwału w bazie działa bez restartu serwera — inaczej niż
  // przy interwale zaszytym w setInterval.
  const tick = async () => {
    if (syncInProgress) return;
    try {
      const source = await getSource();
      if (!source || !source.isEnabled) return;

      const intervalMinutes = Math.min(
        MAX_SYNC_MINUTES,
        Math.max(MIN_SYNC_MINUTES, source.syncIntervalMinutes),
      );
      // Wykładniczy backoff po nieudanych próbach: odstęp = interwał + licznik
      // × interwał, czyli rośnie od normalnego interwału do maksymalnie ok.
      // pół godziny (MAX_BACKOFF_MINUTES), a potem się zatrzymuje —
      // Math.min ogranicza go od góry (chyba że sam skonfigurowany interwał
      // jest już większy niż pół godziny, wtedy pułapem jest ten interwał).
      // lastSyncedAt pozostaje "ostatnią udaną synchronizacją" — backoff to
      // dodatkowy narzut na normalny interwał, a nie zmiana znaczenia kolumny.
      const backoffCeilingMinutes = Math.max(intervalMinutes, MAX_BACKOFF_MINUTES);
      const effectiveIntervalMinutes = Math.min(
        intervalMinutes * (1 + consecutiveFailures),
        backoffCeilingMinutes,
      );
      const dueAt = source.lastSyncedAt
        ? source.lastSyncedAt.getTime() + effectiveIntervalMinutes * 60_000
        : 0;
      if (Date.now() < dueAt) return;

      syncInProgress = true;
      try {
        const { imported } = await syncNow();
        consecutiveFailures = 0;
        console.log(`[external-calendar] zsynchronizowano ${imported} wydarzeń`);
      } catch (err) {
        consecutiveFailures += 1;
        throw err;
      } finally {
        // finally gwarantuje zdjęcie flagi także przy wyjątku — inaczej jeden
        // błąd synchronizacji zablokowałby wszystkie kolejne na zawsze.
        syncInProgress = false;
      }
    } catch (err: any) {
      console.error('[external-calendar] błąd synchronizacji:', err?.message ?? err);
    }
  };

  void tick();
  setInterval(tick, TICK_MS);
};

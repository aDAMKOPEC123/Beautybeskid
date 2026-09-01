import ical from 'node-ical';

export interface ParsedEvent {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  location: string | null;
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

// node-ical zwraca dla właściwości z parametrami (np. `SUMMARY;LANGUAGE=pl:Tekst`)
// obiekt `{ val, params }` zamiast zwykłego stringa. Ta funkcja wyciąga samą wartość
// tekstową niezależnie od tego, w jakiej postaci przyszła z parsera.
function textValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as any).val === 'string') {
    return (value as any).val;
  }
  return undefined;
}

// Czysta funkcja: tekst .ics → lista wystąpień w oknie [windowStart, windowEnd).
// Wydarzenia cykliczne rozwijamy na pojedyncze wystąpienia, z pominięciem EXDATE.
export function parseIcs(icsText: string, windowStart: Date, windowEnd: Date): ParsedEvent[] {
  if (!icsText.includes('BEGIN:VCALENDAR')) {
    throw new Error('Nieprawidłowy plik .ics: brak nagłówka BEGIN:VCALENDAR');
  }
  if (!icsText.includes('END:VCALENDAR')) {
    throw new Error('Nieprawidłowy plik .ics: plik wygląda na urwany w połowie (brak END:VCALENDAR)');
  }

  const parsed = ical.sync.parseICS(icsText);
  const out: ParsedEvent[] = [];

  for (const entry of Object.values(parsed) as any[]) {
    if (!entry || entry.type !== 'VEVENT' || !entry.start) continue;

    const title: string = textValue(entry.summary) ?? '(bez tytułu)';
    const location: string | null = textValue(entry.location) ?? null;
    const isAllDay = entry.start?.dateOnly === true;
    const rawDurationMs =
      entry.end && entry.start
        ? new Date(entry.end).getTime() - new Date(entry.start).getTime()
        : 0;
    const durationMs = rawDurationMs > 0 ? rawDurationMs : DEFAULT_DURATION_MS;

    const buildUid = (startsAt: Date): string =>
      entry.uid ? entry.uid : `bez-uid-${title}-${startsAt.toISOString()}`;

    // Wydarzenie całodniowe (VALUE=DATE) node-ical zwraca jako północ w strefie
    // procesu. Zapisujemy je jako północ UTC tego samego dnia kalendarzowego, żeby
    // zapisana data przestała zależeć od strefy serwera — inaczej ta sama subskrypcja
    // po zmianie strefy maszyny dawałaby inny dzień. Frontend odczytuje z tego dzień
    // przez getUTC* i buduje kafel w czasie lokalnym przeglądarki.
    const normalizeStart = (d: Date): Date =>
      isAllDay ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : d;

    // Dla całodniowych długość liczymy w pełnych dobach. Różnica dwóch lokalnych
    // północy potrafi wynieść 23 albo 25 godzin przy zmianie czasu, co ucięłoby
    // albo wydłużyło ostatni dzień.
    const endFor = (start: Date): Date =>
      isAllDay
        ? new Date(start.getTime() + Math.max(1, Math.round(durationMs / 86_400_000)) * 86_400_000)
        : new Date(start.getTime() + durationMs);

    if (entry.rrule) {
      const excluded = new Set<number>(
        Object.values(entry.exdate ?? {}).map((d: any) => new Date(d).getTime()),
      );
      for (const occurrence of entry.rrule.between(windowStart, windowEnd, true)) {
        const startsAt = normalizeStart(new Date(occurrence));
        if (excluded.has(startsAt.getTime())) continue;
        out.push({
          uid: buildUid(startsAt),
          title,
          startsAt,
          endsAt: endFor(startsAt),
          isAllDay,
          location,
        });
      }
      continue;
    }

    const startsAt = normalizeStart(new Date(entry.start));
    if (startsAt < windowStart || startsAt >= windowEnd) continue;
    out.push({
      uid: buildUid(startsAt),
      title,
      startsAt,
      endsAt: endFor(startsAt),
      isAllDay,
      location,
    });
  }

  return out;
}

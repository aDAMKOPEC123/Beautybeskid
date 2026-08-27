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

    if (entry.rrule) {
      const excluded = new Set<number>(
        Object.values(entry.exdate ?? {}).map((d: any) => new Date(d).getTime()),
      );
      for (const occurrence of entry.rrule.between(windowStart, windowEnd, true)) {
        const startsAt = new Date(occurrence);
        if (excluded.has(startsAt.getTime())) continue;
        out.push({
          uid: buildUid(startsAt),
          title,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMs),
          isAllDay,
          location,
        });
      }
      continue;
    }

    const startsAt = new Date(entry.start);
    if (startsAt < windowStart || startsAt >= windowEnd) continue;
    out.push({
      uid: buildUid(startsAt),
      title,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMs),
      isAllDay,
      location,
    });
  }

  return out;
}

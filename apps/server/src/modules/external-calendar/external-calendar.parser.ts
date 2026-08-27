import ical from 'node-ical';

export interface ParsedEvent {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  location: string | null;
}

// Czysta funkcja: tekst .ics → lista wystąpień w oknie [windowStart, windowEnd).
// Wydarzenia cykliczne rozwijamy na pojedyncze wystąpienia, z pominięciem EXDATE.
export function parseIcs(icsText: string, windowStart: Date, windowEnd: Date): ParsedEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const out: ParsedEvent[] = [];

  for (const entry of Object.values(parsed) as any[]) {
    if (!entry || entry.type !== 'VEVENT' || !entry.start) continue;

    const uid: string = entry.uid ?? '';
    const title: string = entry.summary ?? '(bez tytułu)';
    const location: string | null = entry.location ?? null;
    const isAllDay = entry.start?.dateOnly === true;
    const durationMs =
      entry.end && entry.start
        ? new Date(entry.end).getTime() - new Date(entry.start).getTime()
        : 60 * 60 * 1000;

    if (entry.rrule) {
      const excluded = new Set<number>(
        Object.values(entry.exdate ?? {}).map((d: any) => new Date(d).getTime()),
      );
      for (const occurrence of entry.rrule.between(windowStart, windowEnd, true)) {
        const startsAt = new Date(occurrence);
        if (excluded.has(startsAt.getTime())) continue;
        out.push({
          uid,
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
      uid,
      title,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMs),
      isAllDay,
      location,
    });
  }

  return out;
}

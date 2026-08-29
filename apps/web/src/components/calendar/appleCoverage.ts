import type { CalendarBlock } from '@/api/calendar-blocks.api';

export interface DayChunk {
  start: Date;
  end: Date;
}

// Zabezpieczenie przed pętlą bez końca przy absurdalnie długim wydarzeniu —
// okno synchronizacji to −30/+120 dni, więc rok z zapasem wystarczy.
const MAX_CHUNKS = 400;

/**
 * Tnie wydarzenie na kawałki nieprzechodzące przez północ.
 *
 * Kawałek kończy się o 23:59, bo BlockHoursModal operuje na jednej dacie
 * i nie obsługuje blokad przez północ. Dzięki temu wydarzenie całodniowe
 * z iCloud (00:00 → 00:00 dnia następnego) daje dokładnie jeden kawałek
 * 00:00–23:59, a nie dwa, z których drugi byłby pusty.
 */
export function splitByDay(start: Date, end: Date): DayChunk[] {
  const chunks: DayChunk[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return chunks;
  if (end.getTime() <= start.getTime()) return chunks;

  let cursor = new Date(start);
  while (cursor.getTime() < end.getTime() && chunks.length < MAX_CHUNKS) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);

    let chunkEnd: Date;
    if (end.getTime() < nextMidnight.getTime()) {
      chunkEnd = new Date(end);
    } else {
      chunkEnd = new Date(cursor);
      chunkEnd.setHours(23, 59, 0, 0);
    }

    if (chunkEnd.getTime() > cursor.getTime()) {
      chunks.push({ start: new Date(cursor), end: chunkEnd });
    }
    cursor = nextMidnight;
  }

  return chunks;
}

/**
 * Czy kawałek jest w pełni pokryty blokadą obejmującą cały salon.
 *
 * Pokrycie częściowe i blokady dotyczące wybranych pracownic nie liczą się —
 * wydarzenie Apple jest prywatnym wydarzeniem właścicielki, więc
 * "zabezpieczone" znaczy: cały salon nie przyjmuje zapisów w tych godzinach.
 */
export function isCoveredByBlock(chunk: DayChunk, blocks: CalendarBlock[]): boolean {
  const s = chunk.start.getTime();
  const e = chunk.end.getTime();
  return blocks.some((b) => {
    if (!b.appliesToAll) return false;
    const bs = new Date(b.startsAt).getTime();
    const be = new Date(b.endsAt).getTime();
    if (Number.isNaN(bs) || Number.isNaN(be)) return false;
    return bs <= s && be >= e;
  });
}

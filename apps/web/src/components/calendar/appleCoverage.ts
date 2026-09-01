import type { CalendarBlock } from '@/api/calendar-blocks.api';

export interface DayChunk {
  start: Date;
  end: Date;
}

// Zabezpieczenie przed pętlą bez końca przy absurdalnie długim wydarzeniu —
// okno synchronizacji to −30/+120 dni, więc rok z zapasem wystarczy.
const MAX_CHUNKS = 400;

/**
 * Zaokrągla datę w górę do pełnej minuty. Data już wyrównana do pełnej
 * minuty wraca bez zmian (backend potrafi wyliczyć endsAt z niezerowymi
 * sekundami, dodając surowy durationMs do startsAt — bez tego zaokrąglenia
 * badge prefillowałby "HH:mm" niezgodne z rzeczywistym końcem kawałka,
 * a warunek pokrycia w isCoveredByBlock nigdy by się nie domknął).
 */
function ceilToMinute(date: Date): Date {
  const ms = date.getTime();
  const remainder = ms % 60000;
  if (remainder === 0) return new Date(ms);
  return new Date(ms - remainder + 60000);
}

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

    const dayCap = new Date(cursor);
    dayCap.setHours(23, 59, 0, 0);

    let chunkEnd: Date;
    if (end.getTime() < nextMidnight.getTime()) {
      // Koniec kawałka mieści się w tej dobie — zaokrąglij w górę do pełnej
      // minuty, ale nie przekraczaj 23:59 tej doby (zaokrąglenie 23:59:45
      // nie może "przelać się" na dobę następną).
      const rounded = ceilToMinute(end);
      chunkEnd = rounded.getTime() > dayCap.getTime() ? dayCap : rounded;
    } else {
      chunkEnd = dayCap;
    }

    if (chunkEnd.getTime() > cursor.getTime()) {
      chunks.push({ start: new Date(cursor), end: chunkEnd });
    }
    cursor = nextMidnight;
  }

  return chunks;
}

/**
 * Kawałki dobowe wydarzenia całodniowego.
 *
 * Backend zapisuje takie wydarzenia jako północ UTC dnia kalendarzowego, więc dzień
 * odczytujemy przez `getUTC*`, a kafel budujemy w czasie lokalnym przeglądarki.
 * Dzięki temu „cały 3 września" jest całym 3 września niezależnie od tego, w jakiej
 * strefie pracuje serwer i w jakiej użytkowniczka — a nie pasem 02:00–02:00
 * rozłażącym się na dwa dni, jak przy potraktowaniu tej daty jak zwykłej godziny.
 */
export function splitAllDayByDay(start: Date, end: Date): DayChunk[] {
  const chunks: DayChunk[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return chunks;
  if (end.getTime() <= start.getTime()) return chunks;

  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());

  while (cursor < end.getTime() && chunks.length < MAX_CHUNKS) {
    const day = new Date(cursor);
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth();
    const d = day.getUTCDate();

    chunks.push({
      start: new Date(y, m, d, 0, 0, 0, 0),
      end: new Date(y, m, d, 23, 59, 0, 0),
    });

    cursor = Date.UTC(y, m, d + 1);
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

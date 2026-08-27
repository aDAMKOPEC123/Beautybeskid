import type { TimeBlock } from './employees.service';

// Czyste operacje na przedziałach godzin pracy — bez Prismy, bez sieci.
// Przedziały stykające się krańcami traktujemy jako ciągłe: 09:00-13:00 + 13:00-15:00 = 09:00-15:00.

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number): string => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

export function mergeTimeBlocks(blocks: TimeBlock[], added: TimeBlock): TimeBlock[] {
  const ranges = [...blocks, added]
    .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged.map((r) => ({ start: toTime(r.start), end: toTime(r.end) }));
}

export function subtractTimeBlock(blocks: TimeBlock[], removed: TimeBlock): TimeBlock[] {
  const cut = { start: toMinutes(removed.start), end: toMinutes(removed.end) };
  const out: TimeBlock[] = [];

  for (const block of blocks) {
    const start = toMinutes(block.start);
    const end = toMinutes(block.end);

    // Brak nachodzenia — blok zostaje bez zmian.
    if (cut.end <= start || cut.start >= end) {
      out.push(block);
      continue;
    }
    // Fragment przed wycinanym zakresem.
    if (cut.start > start) out.push({ start: toTime(start), end: toTime(Math.min(cut.start, end)) });
    // Fragment po wycinanym zakresie.
    if (cut.end < end) out.push({ start: toTime(Math.max(cut.end, start)), end: toTime(end) });
  }

  return out;
}

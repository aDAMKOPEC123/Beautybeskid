import { format, addDays } from 'date-fns';
import { EventInput } from '@fullcalendar/core';
import type { WeeklyScheduleEntry, WorkDay } from '@/api/employees.api';

// Okno doby widoczne w siatce. Jedno źródło prawdy: FullCalendar dostaje
// slotMinTime/slotMaxTime z tych samych stałych, więc przygaszenie nigdy nie
// rozjedzie się z zakresem godzin rysowanym przez kalendarz.
export const DAY_WINDOW_START = '07:00';
export const DAY_WINDOW_END = '21:00';

export interface TimeRange {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHmm = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/**
 * Przycina zakresy do okna, odrzuca puste, sortuje i scala nachodzące
 * oraz stykające się krawędziami. Wynik jest rozłączny i rosnący.
 */
export function mergeRanges(
  ranges: TimeRange[],
  windowStart: string,
  windowEnd: string,
): TimeRange[] {
  const ws = toMinutes(windowStart);
  const we = toMinutes(windowEnd);
  if (we <= ws) return [];

  const clipped = ranges
    .map((r) => ({ start: Math.max(ws, toMinutes(r.start)), end: Math.min(we, toMinutes(r.end)) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const r of clipped) {
    const last = merged[merged.length - 1];
    // `<=` scala też zakresy stykające się krawędzią — inaczej powstałaby
    // między nimi luka zerowej długości.
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  return merged.map((r) => ({ start: toHHmm(r.start), end: toHHmm(r.end) }));
}

/** Dopełnienie zakresów w oknie doby — czyli czas poza pracą. */
export function invertRanges(
  ranges: TimeRange[],
  windowStart: string,
  windowEnd: string,
): TimeRange[] {
  const ws = toMinutes(windowStart);
  const we = toMinutes(windowEnd);
  if (we <= ws) return [];

  const merged = mergeRanges(ranges, windowStart, windowEnd);
  const gaps: TimeRange[] = [];
  let cursor = ws;
  for (const r of merged) {
    const rs = toMinutes(r.start);
    if (rs > cursor) gaps.push({ start: toHHmm(cursor), end: toHHmm(rs) });
    cursor = toMinutes(r.end);
  }
  if (cursor < we) gaps.push({ start: toHHmm(cursor), end: toHHmm(we) });
  return gaps;
}

/** Zakresy pracy jednej osoby w danym dniu, z uwzględnieniem override'u dnia. */
function workRangesFor(
  employeeId: string,
  dateStr: string,
  apiDow: number,
  weeklySchedules: Map<string, WeeklyScheduleEntry[]>,
  workDayOverrides: Map<string, WorkDay[]>,
): TimeRange[] {
  const override = (workDayOverrides.get(employeeId) ?? []).find((w) => w.date.startsWith(dateStr));
  if (override !== undefined) {
    if (!override.isWorking) return [];
    return (override.timeBlocks ?? []).map((b) => ({ start: b.start, end: b.end }));
  }
  const weekly = (weeklySchedules.get(employeeId) ?? []).find((e) => e.dayOfWeek === apiDow);
  if (!weekly?.isWorking) return [];
  return (weekly.timeBlocks ?? []).map((b) => ({ start: b.start, end: b.end }));
}

/**
 * Dwie warstwy tła: godziny pracy (bez wypełnienia, z akcentem w kolorze
 * pracownicy) oraz czas poza pracą (przygaszenie).
 *
 * Poza widokiem zasobów kolumna reprezentuje cały salon, nie pojedynczą osobę —
 * warstwy są wtedy liczone ze scalonych zakresów wszystkich widocznych
 * pracownic i emitowane raz, bez resourceId. Bez tego przygaszenia nakładałyby
 * się na siebie po jednym na osobę i kolumna zrobiłaby się czarna.
 */
export function buildWorkingHourLayer(
  employees: any[],
  weeklySchedules: Map<string, WeeklyScheduleEntry[]>,
  workDayOverrides: Map<string, WorkDay[]>,
  rangeStart: Date,
  rangeEnd: Date,
  zoomedEmployeeId: string | null,
  isResourceView: boolean,
  colorFor: (employeeId: string) => string,
): EventInput[] {
  const events: EventInput[] = [];
  const visible = zoomedEmployeeId
    ? employees.filter((e: any) => e.id === zoomedEmployeeId)
    : employees;

  let d = new Date(rangeStart);
  while (d < rangeEnd) {
    const dateStr = format(d, 'yyyy-MM-dd');
    const apiDow = (d.getDay() + 6) % 7; // JS Sun=0 → Mon=0

    const pushWork = (r: TimeRange, key: string, resourceId?: string, accentColor?: string) => {
      events.push({
        id: `work-${key}-${dateStr}-${r.start}`,
        ...(resourceId ? { resourceId } : {}),
        start: `${dateStr}T${r.start}:00`,
        end: `${dateStr}T${r.end}:00`,
        display: 'background',
        classNames: ['cosmo-work-hours'],
        // FullCalendar przekłada borderColor eventu na border-color elementu tła,
        // więc kolor pracownicy trafia na lewą krawędź pasa bez custom property.
        borderColor: accentColor ?? 'transparent',
        extendedProps: {
          isWorkingHours: true,
          rangeLabel: `${r.start}–${r.end}`,
          accentColor: accentColor ?? 'transparent',
        },
      });
    };

    const pushOff = (r: TimeRange, key: string, resourceId?: string) => {
      events.push({
        id: `off-${key}-${dateStr}-${r.start}`,
        ...(resourceId ? { resourceId } : {}),
        start: `${dateStr}T${r.start}:00`,
        end: `${dateStr}T${r.end}:00`,
        display: 'background',
        classNames: ['cosmo-off-hours'],
        extendedProps: { isOffHours: true },
      });
    };

    if (isResourceView) {
      for (const emp of visible) {
        const ranges = workRangesFor(emp.id, dateStr, apiDow, weeklySchedules, workDayOverrides);
        for (const r of mergeRanges(ranges, DAY_WINDOW_START, DAY_WINDOW_END)) {
          pushWork(r, emp.id, emp.id, colorFor(emp.id));
        }
        for (const gap of invertRanges(ranges, DAY_WINDOW_START, DAY_WINDOW_END)) {
          pushOff(gap, emp.id, emp.id);
        }
      }
    } else {
      const all = visible.flatMap((emp: any) =>
        workRangesFor(emp.id, dateStr, apiDow, weeklySchedules, workDayOverrides),
      );
      const accent = visible.length === 1 ? colorFor(visible[0].id) : undefined;
      for (const r of mergeRanges(all, DAY_WINDOW_START, DAY_WINDOW_END)) {
        pushWork(r, 'salon', undefined, accent);
      }
      for (const gap of invertRanges(all, DAY_WINDOW_START, DAY_WINDOW_END)) {
        pushOff(gap, 'salon');
      }
    }

    d = addDays(d, 1);
  }

  return events;
}

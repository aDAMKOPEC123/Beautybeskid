export interface MonthWeek {
  start: Date; // poniedziałek
  end: Date;   // niedziela
  label: string;
}

/** Ta sama data o północy. Zwraca nowy obiekt — nie modyfikuje argumentu. */
export function toDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/** Poniedziałek tygodnia zawierającego podaną datę. */
export function startOfWeek(date: Date): Date {
  const d = toDay(date);
  const dow = (d.getDay() + 6) % 7; // JS nd=0 → pn=0
  return addDays(d, -dow);
}

/** Siedem dni tygodnia zawierającego kotwicę, od poniedziałku. */
export function weekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Wszystkie tygodnie mające choć jeden dzień w miesiącu kotwicy.
 *
 * Etykieta pokazuje wyłącznie dni należące do tego miesiąca, więc tydzień
 * na przełomie miesięcy pojawia się w obu, ale w każdym opisany swoim
 * wycinkiem — dzięki temu pasek tygodni czyta się jak spis dni miesiąca,
 * a nie jak lista zakresów wychodzących poza niego.
 */
export function weeksOfMonth(anchor: Date): MonthWeek[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const lastDay = lastOfMonth.getDate();

  const weeks: MonthWeek[] = [];
  let cursor = startOfWeek(firstOfMonth);

  while (cursor.getTime() <= lastOfMonth.getTime()) {
    const start = new Date(cursor);
    const end = addDays(cursor, 6);

    const from = start.getMonth() === month ? start.getDate() : 1;
    const to = end.getMonth() === month ? end.getDate() : lastDay;
    weeks.push({ start, end, label: from === to ? `${from}` : `${from}–${to}` });

    cursor = addDays(cursor, 7);
  }

  return weeks;
}

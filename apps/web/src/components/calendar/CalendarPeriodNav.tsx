import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { weeksOfMonth, weekDays } from './calendarWeeks';

interface Props {
  anchor: Date;
  showDayRow: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onPickDate: (date: Date) => void;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function CalendarPeriodNav({
  anchor, showDayRow, onPrevWeek, onNextWeek, onToday, onPickDate,
}: Props) {
  const weeks = weeksOfMonth(anchor);
  const days = weekDays(anchor);
  const monthLabel = format(anchor, 'LLLL yyyy', { locale: pl });
  const today = new Date();

  return (
    <div className="border-b bg-white px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Poprzedni tydzień"
          className="min-h-11 min-w-11 rounded-lg bg-secondary text-base text-secondary-foreground hover:bg-accent md:min-h-0 md:min-w-0 md:px-3 md:py-1.5"
        >
          ←
        </button>
        <span className="min-w-[9rem] text-center text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Następny tydzień"
          className="min-h-11 min-w-11 rounded-lg bg-secondary text-base text-secondary-foreground hover:bg-accent md:min-h-0 md:min-w-0 md:px-3 md:py-1.5"
        >
          →
        </button>
        <button
          type="button"
          onClick={onToday}
          className="ml-auto min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 md:min-h-0 md:py-1.5"
        >
          Dziś
        </button>
      </div>

      {/* Zakładki tygodni — na wąskim ekranie przewijalne w poziomie. */}
      <div className="mt-1.5 flex gap-1 overflow-x-auto">
        {weeks.map((w) => {
          const active = anchor.getTime() >= w.start.getTime() && anchor.getTime() <= w.end.getTime();
          return (
            <button
              key={w.start.toISOString()}
              type="button"
              onClick={() => onPickDate(w.start)}
              aria-pressed={active}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium ${
                active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      {showDayRow && (
        <div className="mt-1.5 flex gap-1 overflow-x-auto">
          {days.map((day) => {
            const active = sameDay(day, anchor);
            const weekend = isWeekend(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onPickDate(day)}
                aria-pressed={active}
                className={`flex min-h-11 shrink-0 flex-col items-center rounded-lg px-3 py-1 leading-tight md:min-h-0 ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : weekend
                      ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80">
                  {format(day, 'EEEEEE', { locale: pl })}
                </span>
                <span className={`text-sm ${sameDay(day, today) ? 'font-bold underline' : 'font-medium'}`}>
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

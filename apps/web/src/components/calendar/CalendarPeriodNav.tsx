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

// Jedna wysokość dla wszystkich kontrolek paska: 44 px pod palec na telefonie,
// 32 px na desktopie. Wcześniej każdy rząd miał własny sposób na wysokość
// (min-h-11 tu, py-1 tam, text-base obok text-sm), przez co przyciski w jednym
// rzędzie wychodziły różnej wielkości i pasek wyglądał na poprzesuwany.
const CONTROL = 'h-11 shrink-0 rounded-lg font-medium md:h-8';

export function CalendarPeriodNav({
  anchor, showDayRow, onPrevWeek, onNextWeek, onToday, onPickDate,
}: Props) {
  // `anchor` bywa realnym „teraz" z niezerową godziną (np. świeży `useState(new Date())`
  // w CalendarView, zanim pierwszy `datesSet` FullCalendara go ujednolici), a `w.end`
  // z `weeksOfMonth` to północ ostatniego dnia tygodnia — porównanie surowych `getTime()`
  // gubiłoby niedzielę z godziną spoza północy. Normalizujemy raz, na wejściu, żeby
  // porównanie tygodni i `sameDay` w rzędzie dni korzystały z tej samej, spójnej wartości.
  const anchorDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const weeks = weeksOfMonth(anchorDay);
  const days = weekDays(anchorDay);
  const monthLabel = format(anchorDay, 'LLLL yyyy', { locale: pl });
  const today = new Date();

  return (
    <div className="border-b bg-white px-2 py-1">
      {/* Na desktopie miesiąc i zakładki tygodni mieszczą się w jednym rzędzie —
          obok zakładek zostaje mnóstwo wolnego miejsca, a każdy rząd mniej to
          kilkadziesiąt pikseli więcej dla siatki. Na telefonie zostają jeden pod drugim. */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Poprzedni tydzień"
          className={`${CONTROL} w-11 bg-secondary text-base text-secondary-foreground hover:bg-accent md:w-8`}
        >
          ←
        </button>
        <span className="min-w-[8rem] text-center text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Następny tydzień"
          className={`${CONTROL} w-11 bg-secondary text-base text-secondary-foreground hover:bg-accent md:w-8`}
        >
          →
        </button>
        <button
          type="button"
          onClick={onToday}
          className={`${CONTROL} ml-auto bg-primary px-4 text-sm text-primary-foreground hover:opacity-90`}
        >
          Dziś
        </button>
      </div>

      {/* Zakładki tygodni — na wąskim ekranie przewijalne w poziomie. */}
      <div className="flex gap-1 overflow-x-auto md:flex-1">
        {weeks.map((w) => {
          const active = anchorDay.getTime() >= w.start.getTime() && anchorDay.getTime() <= w.end.getTime();
          return (
            <button
              key={w.start.toISOString()}
              type="button"
              onClick={() => onPickDate(w.start)}
              aria-pressed={active}
              className={`${CONTROL} px-3 text-xs ${
                active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>
      </div>

      {showDayRow && (
        <div className="mt-1 flex gap-1 overflow-x-auto">
          {days.map((day) => {
            const active = sameDay(day, anchorDay);
            const weekend = isWeekend(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onPickDate(day)}
                aria-pressed={active}
                className={`${CONTROL} flex flex-col items-center justify-center px-3 leading-tight ${
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

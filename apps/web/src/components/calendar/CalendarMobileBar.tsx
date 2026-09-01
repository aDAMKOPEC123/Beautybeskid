import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronDown, Info } from 'lucide-react';
import { weekDays, toDay } from './calendarWeeks';
import { shouldShowTodayButton } from './calendarMobile';

interface Props {
  anchor: Date;
  employees: any[];
  zoomedEmployeeId: string | null;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onPickDate: (date: Date) => void;
  onOpenWeekPicker: () => void;
  onToggleLegend: () => void;
  onPickEmployee: (employeeId: string) => void;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

const CONTROL = 'h-11 shrink-0 rounded-lg font-medium';

/**
 * Górna belka kalendarza na telefonie: jeden rząd sterowania i jeden rząd dni.
 *
 * Zastępuje cztery rzędy, które zajmowały około 260 px z ekranu — pasek widoków,
 * rząd miesiąca, zakładki tygodni i wysoki nagłówek z awatarem pracownicy.
 * Nazwa miesiąca czytana jest z daty, zakładki tygodni przeniosły się do arkusza
 * otwieranego tą datą, a tożsamość pracownicy stoi tutaj zamiast nad siatką.
 */
export function CalendarMobileBar({
  anchor, employees, zoomedEmployeeId,
  onPrevWeek, onNextWeek, onToday, onPickDate, onOpenWeekPicker, onToggleLegend, onPickEmployee,
}: Props) {
  const anchorDay = toDay(anchor);
  const days = weekDays(anchorDay);
  const today = new Date();
  const showToday = shouldShowTodayButton(anchorDay, today);

  return (
    <div className="border-b bg-white px-2 py-1 md:hidden">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Poprzedni tydzień"
          className={`${CONTROL} w-11 bg-secondary text-base text-secondary-foreground`}
        >
          ←
        </button>

        <button
          type="button"
          onClick={onOpenWeekPicker}
          className={`${CONTROL} flex min-w-0 flex-1 items-center justify-center gap-1 bg-secondary px-2 text-sm text-secondary-foreground`}
        >
          <span className="truncate">{format(anchorDay, 'EEE, d MMM', { locale: pl })}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>

        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Następny tydzień"
          className={`${CONTROL} w-11 bg-secondary text-base text-secondary-foreground`}
        >
          →
        </button>

        {/* „Dziś" pojawia się tylko poza dzisiejszym dniem — inaczej zabierałby
            szerokość dokładnie wtedy, gdy jest niepotrzebny. */}
        {showToday && (
          <button
            type="button"
            onClick={onToday}
            className={`${CONTROL} bg-primary px-3 text-sm text-primary-foreground`}
          >
            Dziś
          </button>
        )}

        <button
          type="button"
          onClick={onToggleLegend}
          aria-label="Legenda"
          className={`${CONTROL} w-11 bg-secondary text-secondary-foreground`}
        >
          <Info size={16} className="mx-auto" />
        </button>
      </div>

      {/* Wybór pracownicy. Przy jednej osobie sama nazwa — lista rozwijana
          udawałaby wybór, którego nie ma. Przy wielu natywny <select>, bo na
          telefonie otwiera systemowy wybierak i działa lepiej niż własne menu. */}
      {employees.length === 1 && (
        <p className="mt-1 truncate px-1 text-xs font-medium text-muted-foreground">
          {employees[0].name}
        </p>
      )}
      {employees.length > 1 && (
        <select
          value={zoomedEmployeeId ?? ''}
          onChange={(e) => onPickEmployee(e.target.value)}
          aria-label="Pracownica"
          className="mt-1 h-11 w-full rounded-lg border border-border bg-secondary px-2 text-sm font-medium text-secondary-foreground"
        >
          {employees.map((emp: any) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      )}

      <div className="mt-1 flex gap-1">
        {days.map((day) => {
          const active = sameDay(day, anchorDay);
          const weekend = isWeekend(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPickDate(day)}
              aria-pressed={active}
              className={`flex h-11 flex-1 flex-col items-center justify-center rounded-lg leading-tight ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : weekend
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-secondary text-secondary-foreground'
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
    </div>
  );
}

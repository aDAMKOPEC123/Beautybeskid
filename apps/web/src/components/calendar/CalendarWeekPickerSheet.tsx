import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MobileSheet } from './MobileSheet';
import { weeksOfMonth, toDay } from './calendarWeeks';

interface Props {
  open: boolean;
  anchor: Date;
  onClose: () => void;
  onPickDate: (date: Date) => void;
}

/**
 * Zakładki tygodni miesiąca, przeniesione z górnej belki do arkusza.
 *
 * Na telefonie ten rząd kosztował 52 px stale, a używa się go rzadko — skok
 * o tydzień robią strzałki. W arkuszu jest o jedno tapnięcie i nie zabiera
 * miejsca siatce.
 */
export function CalendarWeekPickerSheet({ open, anchor, onClose, onPickDate }: Props) {
  if (!open) return null;

  const anchorDay = toDay(anchor);
  const weeks = weeksOfMonth(anchorDay);

  return (
    <MobileSheet open={open} onClose={onClose} title={format(anchorDay, 'LLLL yyyy', { locale: pl })}>
      <div className="grid grid-cols-2 gap-2">
        {weeks.map((w) => {
          const active =
            anchorDay.getTime() >= w.start.getTime() && anchorDay.getTime() <= w.end.getTime();
          return (
            <button
              key={w.start.toISOString()}
              type="button"
              onClick={() => { onPickDate(w.start); onClose(); }}
              aria-pressed={active}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>
    </MobileSheet>
  );
}

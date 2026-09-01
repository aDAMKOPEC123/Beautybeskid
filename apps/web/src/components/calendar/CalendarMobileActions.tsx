import { CalendarPlus, List, LayoutGrid, MoreHorizontal } from 'lucide-react';

interface Props {
  isListView: boolean;
  onGrid: () => void;
  onList: () => void;
  onAdd: () => void;
  onMore: () => void;
}

/**
 * Pasek akcji przy dolnej krawędzi.
 *
 * Na telefonie górna część ekranu jest najtrudniejsza do dosięgnięcia kciukiem
 * jedną ręką, a dotąd leżały tam wszystkie główne akcje. Dolna krawędź to strefa
 * naturalnego zasięgu. Odstęp dolny uwzględnia wskaźnik gestu na iPhonie — bez
 * tego przyciski wchodziłyby pod niego w trybie PWA.
 */
export function CalendarMobileActions({ isListView, onGrid, onList, onAdd, onMore }: Props) {
  const item = 'flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t bg-white px-2 pt-1 md:hidden"
      style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onGrid}
        aria-pressed={!isListView}
        className={`${item} ${!isListView ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <LayoutGrid size={18} />
        Siatka
      </button>
      <button
        type="button"
        onClick={onList}
        aria-pressed={isListView}
        className={`${item} ${isListView ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <List size={18} />
        Lista
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Dodaj wizytę"
        className={`${item} bg-primary text-primary-foreground`}
      >
        <CalendarPlus size={18} />
        Wizyta
      </button>
      <button
        type="button"
        onClick={onMore}
        aria-label="Więcej akcji"
        className={`${item} bg-secondary text-secondary-foreground`}
      >
        <MoreHorizontal size={18} />
        Więcej
      </button>
    </div>
  );
}

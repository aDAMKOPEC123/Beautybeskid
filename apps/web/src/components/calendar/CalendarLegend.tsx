import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { storageKeyFor } from './calendarMobile';

interface Props {
  showWorkingHours: boolean;
  onToggleWorkingHours: () => void;
  showApple: boolean;
  onToggleApple: () => void;
  showHappyHours: boolean;
  onToggleHappyHours: () => void;
  /** Zmiana wartości przełącza rozwinięcie — sygnał z górnej belki telefonu. */
  toggleSignal?: number;
}

function Swatch({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-3.5 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border">
      {children}
    </span>
  );
}

/** Pozycja informacyjna — nie jest przyciskiem, żeby nie sugerować interakcji, której nie ma. */
function Item({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Swatch>{swatch}</Swatch>
      {label}
    </span>
  );
}

function ToggleItem({
  swatch, label, active, onClick, hint,
}: {
  swatch: React.ReactNode; label: string; active: boolean; onClick: () => void; hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] transition-opacity hover:bg-accent ${
        active ? 'text-foreground' : 'text-muted-foreground opacity-50'
      }`}
    >
      <Swatch>{swatch}</Swatch>
      {label}
    </button>
  );
}

export function CalendarLegend({
  showWorkingHours, onToggleWorkingHours,
  showApple, onToggleApple,
  showHappyHours, onToggleHappyHours,
  toggleSignal,
}: Props) {
  const isMobile = useIsMobile();
  // Na telefonie domyślnie zwinięta — tam każdy piksel wysokości siatki jest cenny.
  const [open, setOpen] = useState(!isMobile);

  // Osobny klucz dla telefonu: legenda rozwinięta na komputerze zabierała tam
  // 90 px z około 200 px, które w ogóle zostawały na siatkę.
  const storageKey = storageKeyFor(isMobile);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) setOpen(saved === '1');
  }, [storageKey]);

  const toggleOpen = () => {
    setOpen((prev) => {
      localStorage.setItem(storageKey, prev ? '0' : '1');
      return !prev;
    });
  };

  // Sygnał z górnej belki telefonu: przełącz rozwinięcie, ale nie przy montowaniu.
  const firstSignal = useRef(true);
  useEffect(() => {
    if (firstSignal.current) { firstSignal.current = false; return; }
    setOpen((prev) => {
      localStorage.setItem(storageKey, prev ? '0' : '1');
      return !prev;
    });
  }, [toggleSignal, storageKey]);

  // Przełącznik i pozycje w jednym rzędzie — legenda zajmowała dwa rzędy, choć
  // mieści się w jednym, a każdy odzyskany rząd to więcej wysokości dla siatki.
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-white px-3 py-1">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
      >
        Legenda
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ToggleItem
            label="Godziny pracy"
            active={showWorkingHours}
            onClick={onToggleWorkingHours}
            hint="Pokaż lub ukryj przygaszenie czasu poza godzinami pracy"
            swatch={<span className="h-full w-full border-l-[3px] border-l-primary bg-white" />}
          />
          <Item label="Oczekująca" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-pending)' }} />} />
          <Item label="Potwierdzona" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-confirmed)' }} />} />
          <Item label="Zrealizowana" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-completed)' }} />} />
          <Item label="Anulowana" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-cancelled-bg)' }} />} />
          <Item
            label="Blokada — zapisy wstrzymane"
            swatch={<span className="flex h-full w-full items-center justify-center bg-gray-700 text-white"><Lock size={8} /></span>}
          />
          <ToggleItem
            label="Kalendarz Apple (❗ blokuje godziny)"
            active={showApple}
            onClick={onToggleApple}
            hint="Pokaż lub ukryj wydarzenia z kalendarza Apple"
            swatch={
              <span
                className="h-full w-full"
                style={{
                  backgroundColor: 'var(--cal-apple-bg)',
                  backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 3px, var(--cal-apple-stripe) 3px, var(--cal-apple-stripe) 6px)`,
                  borderLeft: '3px solid var(--cal-apple-border)',
                }}
              />
            }
          />
          <ToggleItem
            label="Happy Hour"
            active={showHappyHours}
            onClick={onToggleHappyHours}
            hint="Pokaż lub ukryj promocje Happy Hours"
            swatch={<span className="h-full w-full border-t-[3px] border-t-amber-500 bg-amber-50" />}
          />
        </div>
      )}
    </div>
  );
}

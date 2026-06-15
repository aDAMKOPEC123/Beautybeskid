import { Plus, X } from 'lucide-react';
import { TimeBlock } from '@/api/employees.api';

const INPUT_CLS =
  'rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

export function TimeBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: TimeBlock[];
  onChange: (blocks: TimeBlock[]) => void;
}) {
  const update = (i: number, field: 'start' | 'end', val: string) => {
    const next = blocks.map((b, idx) => (idx === i ? { ...b, [field]: val } : b));
    onChange(next);
  };
  const add = () => onChange([...blocks, { start: '09:00', end: '17:00' }]);
  const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="time"
            value={block.start}
            onChange={(e) => update(i, 'start', e.target.value)}
            className={INPUT_CLS}
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            type="time"
            value={block.end}
            onChange={(e) => update(i, 'end', e.target.value)}
            className={INPUT_CLS}
          />
          {blocks.length > 1 && (
            <button
              onClick={() => remove(i)}
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={14} /> Dodaj blok godzin
      </button>
    </div>
  );
}

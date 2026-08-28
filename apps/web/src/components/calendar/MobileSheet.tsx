import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Arkusz wysuwany od dołu — na telefonie zastępuje popovery pozycjonowane
// względem punktu kliknięcia, które uciekały poza dolną krawędź ekranu.
export function MobileSheet({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center gap-2 px-4 pb-1 pt-2">
          {title && <p className="text-sm font-semibold">{title}</p>}
          <button
            className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-accent"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-2 pb-3">{children}</div>
      </div>
    </div>
  );
}

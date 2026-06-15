interface Tab {
  id: string;
  label: string;
  available: boolean;
}

const TABS: Tab[] = [
  { id: 'kalendarz', label: 'Kalendarz', available: true },
  { id: 'rolki', label: 'Rolki', available: true },
  { id: 'karuzele', label: 'Karuzele', available: true },
  { id: 'trendy', label: 'Trendy', available: true },
  { id: 'opisy', label: 'Opisy', available: true },
  { id: 'nagrania', label: 'Lista nagran', available: true },
  { id: 'kampanie', label: 'Kampanie', available: true },
  { id: 'wyniki', label: 'Wyniki', available: true },
];

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export const MarketingTabs = ({ active, onChange }: Props) => (
  <nav
    className="overflow-x-auto flex gap-1 border-b pb-0 mb-6"
    style={{ scrollbarWidth: 'none' }}
  >
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => tab.available && onChange(tab.id)}
        disabled={!tab.available}
        className={[
          'shrink-0 px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap',
          active === tab.id
            ? 'border-primary text-primary bg-primary/5'
            : tab.available
            ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            : 'border-transparent text-muted-foreground/40 cursor-not-allowed',
        ].join(' ')}
      >
        {tab.label}
        {!tab.available && (
          <span className="ml-1.5 text-[10px] text-muted-foreground/50">wkrotce</span>
        )}
      </button>
    ))}
  </nav>
);

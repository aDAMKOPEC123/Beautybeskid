import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { AdminCourseList } from './AdminCourseList';
import { AdminStandaloneQuizEditor } from './AdminStandaloneQuizEditor';
import { AdminInstructors } from './AdminInstructors';

const ACADEMY_URL = import.meta.env.VITE_ACADEMY_URL || 'https://akademia.kosmetologwiktoriacwik.pl';

const TABS = [
  { key: 'kursy', label: 'Kursy' },
  { key: 'prowadzace', label: 'Prowadzące' },
  { key: 'quizy', label: 'Quizy Standalone' },
  { key: 'dostepy', label: 'Dostępy użytkowników' },
];

/**
 * Konta Akademii są niezależne od kont salonu (AcademyUser vs User), więc dostępów
 * nie da się nadawać z tego panelu — robi się to w panelu Akademii, gdzie widać
 * realne zakupy i zapisy na kursy.
 */
function AccessManagedElsewhere() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <h2 className="font-semibold">Dostępami zarządzasz w panelu Akademii</h2>
      <p className="text-sm text-muted-foreground">
        Akademia ma osobny system kont — konto kursantki nie jest powiązane z kontem klientki salonu.
        Dostęp do kursów nadajesz i cofasz w panelu Akademii, w zakładce „Sprzedaż i klienci”, gdzie
        widzisz też historię zamówień i zapisów.
      </p>
      <a
        href={`${ACADEMY_URL}/admin/statystyki`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Otwórz panel Akademii
      </a>
    </div>
  );
}

export function AdminAkademia() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'kursy';

  const setTab = (key: string) => {
    setSearchParams({ tab: key });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Akademia</h1>
        <p className="text-muted-foreground text-sm">Zarządzaj kursami, quizami i dostępami do Akademii</p>
      </div>

      <div className="border-b flex gap-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'kursy' && <AdminCourseList />}
      {tab === 'prowadzace' && <AdminInstructors />}
      {tab === 'quizy' && <AdminStandaloneQuizEditor />}
      {tab === 'dostepy' && <AccessManagedElsewhere />}
    </div>
  );
}

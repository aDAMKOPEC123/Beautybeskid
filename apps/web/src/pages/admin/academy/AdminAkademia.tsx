import { useSearchParams } from 'react-router-dom';
import { AdminCourseList } from './AdminCourseList';
import { AdminStandaloneQuizEditor } from './AdminStandaloneQuizEditor';
import { AdminAccessManager } from './AdminAccessManager';

const TABS = [
  { key: 'kursy', label: 'Kursy' },
  { key: 'quizy', label: 'Quizy Standalone' },
  { key: 'dostepy', label: 'Dostępy użytkowników' },
];

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
      {tab === 'quizy' && <AdminStandaloneQuizEditor />}
      {tab === 'dostepy' && <AdminAccessManager />}
    </div>
  );
}

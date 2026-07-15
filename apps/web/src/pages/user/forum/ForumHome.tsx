import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forumApi, ForumCategory, ForumStats } from '@/api/forum.api';

export function getRankLabel(postCount: number): string {
  if (postCount >= 200) return 'Kosmetolog-Entuzjastka';
  if (postCount >= 50) return 'Ekspert';
  if (postCount >= 10) return 'Bywalec';
  return 'Nowicjusz';
}

export function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min. temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
}

export function ForumHome() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([forumApi.getCategories(), forumApi.getStats()])
      .then(([cats, s]) => {
        setCategories(cats);
        setStats(s);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/user/forum/szukaj?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;

  if (loadError) return (
    <div className="p-6 text-center" role="alert">
      <h1 className="text-xl font-bold text-gray-800">Forum jest chwilowo niedostępne</h1>
      <p className="mt-2 text-sm text-gray-500">Nie udało się pobrać danych. Spróbuj ponownie za chwilę.</p>
      <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white">
        Spróbuj ponownie
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 pb-8">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Forum Kosmetyczne</h1>
        <p className="text-sm text-gray-500 mt-1">Zadaj pytanie, podziel się doświadczeniem</p>
        <form onSubmit={handleSearch} className="flex flex-col gap-2 mt-4 sm:flex-row">
          <label htmlFor="forum-home-search" className="sr-only">Szukaj na forum</label>
          <input
            id="forum-home-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj na forum..."
            className="min-w-0 flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            type="submit"
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors sm:w-auto"
          >
            Szukaj
          </button>
          <Link
            to="/user/forum/nowy"
            className="w-full bg-white border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-center text-sm font-medium hover:bg-purple-50 transition-colors sm:w-auto"
          >
            + Nowy wątek
          </Link>
        </form>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/user/forum/${cat.slug}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: cat.color ?? '#f3e8ff' }}
              >
                {cat.icon ?? '💬'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                {cat.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                )}
                {cat.lastThread && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    Ostatni: {cat.lastThread.title} · {getRelativeTime(cat.lastThread.createdAt)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-semibold text-purple-600">{cat._count?.threads ?? 0}</p>
                <p className="text-xs text-gray-400">wątków</p>
                <p className="text-sm font-semibold text-gray-600 mt-1">{cat.postCount ?? 0}</p>
                <p className="text-xs text-gray-400">postów</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="mt-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Razem:{' '}
            <span className="text-gray-600 font-medium">{stats.threadCount.toLocaleString('pl-PL')} wątków</span>
            {' · '}
            <span className="text-gray-600 font-medium">{stats.postCount.toLocaleString('pl-PL')} postów</span>
            {' · '}
            <span className="text-gray-600 font-medium">{stats.userCount.toLocaleString('pl-PL')} użytkowników</span>
          </p>
        </div>
      )}
    </div>
  );
}

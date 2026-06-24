import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forumApi, ForumCategory, ForumThread } from '@/api/forum.api';

type FilterType = 'all' | 'admin-mention' | 'deleted' | 'pinned';

export function AdminForum() {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [moveThreadId, setMoveThreadId] = useState<string | null>(null);
  const [moveCategoryId, setMoveCategoryId] = useState('');

  useEffect(() => {
    forumApi.getCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0) setMoveCategoryId(cats[0].id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    forumApi.getAdminThreads({ page, limit: 20, filter })
      .then(res => {
        setThreads(res.data);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  const handlePin = async (id: string) => {
    const updated = await forumApi.pinThread(id);
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isPinned: updated.isPinned } : t));
  };

  const handleLock = async (id: string) => {
    const updated = await forumApi.lockThread(id);
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isLocked: updated.isLocked } : t));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Usunąć ten wątek?')) return;
    await forumApi.adminDeleteThread(id);
    setThreads(prev => prev.filter(t => t.id !== id));
  };

  const handleMove = async () => {
    if (!moveThreadId || !moveCategoryId) return;
    await forumApi.moveThread(moveThreadId, moveCategoryId);
    setMoveThreadId(null);
    const res = await forumApi.getAdminThreads({ page, limit: 20, filter });
    setThreads(res.data);
  };

  const filterLabels: Record<FilterType, string> = {
    all: 'Wszystkie',
    'admin-mention': 'Z @admin',
    deleted: 'Usunięte',
    pinned: 'Przypięte',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Moderacja forum</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(Object.keys(filterLabels) as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Ładowanie...</div>
      ) : threads.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Brak wątków.</div>
      ) : (
        <div className="space-y-2">
          {threads.map(thread => {
            const hasMention = (thread as unknown as { mentionsAdmin?: boolean }).mentionsAdmin;
            return (
              <div
                key={thread.id}
                className={`bg-white rounded-xl border p-4 ${hasMention ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {hasMention && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">@admin</span>
                      )}
                      {thread.isPinned && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Przypięty</span>
                      )}
                      {thread.isLocked && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Zamknięty</span>
                      )}
                      {thread.isDeleted && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Usunięty</span>
                      )}
                      <span className="text-xs text-gray-400">{thread.category.name}</span>
                    </div>
                    <Link
                      to={`/user/forum/watek/${thread.id}`}
                      className="font-medium text-gray-800 hover:text-purple-700"
                    >
                      {thread.title}
                    </Link>
                    <div className="text-xs text-gray-400 mt-1">
                      {thread.author.name} · {new Date(thread.createdAt).toLocaleDateString('pl-PL')} · {thread._count?.posts ?? 0} odpowiedzi
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    <button onClick={() => handlePin(thread.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                      {thread.isPinned ? 'Odepnij' : 'Przypnij'}
                    </button>
                    <button onClick={() => handleLock(thread.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                      {thread.isLocked ? 'Odblokuj' : 'Zablokuj'}
                    </button>
                    <button onClick={() => setMoveThreadId(thread.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                      Przenieś
                    </button>
                    <Link to={`/user/forum/watek/${thread.id}`}
                      className="text-xs px-2 py-1 rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
                      Odpowiedz
                    </Link>
                    <button onClick={() => handleDelete(thread.id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">← Poprzednia</button>
          <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">Następna →</button>
        </div>
      )}

      {moveThreadId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Przenieś wątek</h3>
            <select
              value={moveCategoryId}
              onChange={e => setMoveCategoryId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setMoveThreadId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Anuluj</button>
              <button onClick={handleMove}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Przenieś</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

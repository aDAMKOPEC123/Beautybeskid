import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { forumApi, ForumThread, ForumTag } from '@/api/forum.api';
import { getRelativeTime } from './ForumHome';

function highlight(text: string, q: string): React.ReactNode {
  if (!q || q.length < 2) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-yellow-100 rounded">{part}</mark>
    ) : (
      part
    )
  );
}

export function ForumSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const activeTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [popularTags, setPopularTags] = useState<ForumTag[]>([]);
  const [inputValue, setInputValue] = useState(q);

  useEffect(() => {
    forumApi.getPopularTags().then(setPopularTags);
  }, []);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (q.length < 2) { setThreads([]); setTotal(0); return; }
    setLoading(true);
    forumApi
      .search({ q, tags: activeTags.length > 0 ? activeTags : undefined, page })
      .then((res) => {
        setThreads(res.data);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [q, searchParams.toString(), page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', inputValue);
    newParams.delete('tags');
    setSearchParams(newParams);
    setPage(1);
  };

  const toggleTag = (tag: string) => {
    const current = searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    const newParams = new URLSearchParams(searchParams);
    if (next.length > 0) newParams.set('tags', next.join(','));
    else newParams.delete('tags');
    setSearchParams(newParams);
    setPage(1);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">Wyszukiwarka</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Szukaj na forum..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <button
          type="submit"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Szukaj
        </button>
      </form>

      {popularTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {popularTags.slice(0, 12).map((t) => (
            <button
              key={t.tag}
              onClick={() => toggleTag(t.tag)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeTags.includes(t.tag)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300'
              }`}
            >
              #{t.tag}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-center text-gray-500 py-8">Szukam...</div>}

      {!loading && q.length >= 2 && threads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">Nic nie znaleziono dla „{q}"</p>
          <Link to="/user/forum/nowy" className="text-purple-600 text-sm hover:underline">
            Może założysz nowy wątek?
          </Link>
        </div>
      )}

      {!loading && threads.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">Znaleziono {total} wyników</p>
          <div className="space-y-3">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to={`/user/forum/watek/${thread.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-medium text-gray-800 mb-1">{highlight(thread.title, q)}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {highlight(thread.content.slice(0, 200), q)}
                </p>
                {thread.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {thread.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{thread.category.name}</span>
                  <span>·</span>
                  <span>{thread.author.name}</span>
                  <span>·</span>
                  <span>{getRelativeTime(thread.createdAt)}</span>
                  <span>·</span>
                  <span>{thread._count?.posts ?? 0} odpowiedzi</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50"
              >
                ← Poprzednia
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50"
              >
                Następna →
              </button>
            </div>
          )}
        </>
      )}

      {q.length < 2 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>Wpisz co najmniej 2 znaki, żeby wyszukać</p>
        </div>
      )}
    </div>
  );
}

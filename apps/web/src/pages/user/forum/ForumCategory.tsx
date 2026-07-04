import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forumApi, ForumThread } from '@/api/forum.api';
import { getRelativeTime } from './ForumHome';

type SortType = 'newest' | 'active' | 'popular';

function isHot(thread: ForumThread): boolean {
  const posts = thread._count?.posts ?? 0;
  const updatedRecently = Date.now() - new Date(thread.updatedAt).getTime() < 24 * 60 * 60 * 1000;
  return posts > 20 || updatedRecently;
}

function ForumThreadCard({ thread }: { thread: ForumThread }) {
  const navigate = useNavigate();
  return (
    <Link
      to={`/user/forum/watek/${thread.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isHot(thread) && <span className="text-xs">🔥</span>}
            {thread.isPinned && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Przypięty</span>
            )}
            {thread.isLocked && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Zamknięty</span>
            )}
          </div>
          <h3 className="font-medium text-gray-800 leading-snug">{thread.title}</h3>

          {thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {thread.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/user/forum/szukaj?tags=${encodeURIComponent(tag)}`);
                  }}
                  className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
            <span>{thread.author.name}</span>
            <span>·</span>
            <span>{new Date(thread.createdAt).toLocaleDateString('pl-PL')}</span>
            <span>·</span>
            <span>{thread._count?.posts ?? 0} odpowiedzi</span>
            <span>·</span>
            <span>👁 {thread.viewCount}</span>
          </div>

          {thread.lastPost ? (
            <p className="text-xs text-gray-400 mt-1">
              Ostatnia odpowiedź: <span className="text-gray-600">{thread.lastPost.author.name}</span>
              {' · '}{getRelativeTime(thread.lastPost.createdAt)}
            </p>
          ) : (
            thread._count?.posts === 0 && (
              <p className="text-xs text-gray-300 mt-1">Brak odpowiedzi</p>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

export function ForumCategory() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [sort, setSort] = useState<SortType>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    forumApi.getThreadsByCategory(categorySlug, { page, limit: 20, sort })
      .then((res) => {
        setThreads(res.data);
        setTotalPages(res.totalPages);
        if (res.data.length > 0) setCategoryName(res.data[0].category.name);
      })
      .finally(() => setLoading(false));
  }, [categorySlug, page, sort]);

  const sortLabels: Record<SortType, string> = {
    newest: 'Najnowsze',
    active: 'Aktywne',
    popular: 'Popularne',
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">{categoryName || categorySlug}</span>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2">
          {(['newest', 'active', 'popular'] as SortType[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1); }}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                sort === s ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>
        <Link
          to="/user/forum/nowy"
          className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + Nowy wątek
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Ładowanie...</div>
      ) : threads.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Brak wątków w tej kategorii.</div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => <ForumThreadCard key={t.id} thread={t} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">
            ← Poprzednia
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">
            Następna →
          </button>
        </div>
      )}
    </div>
  );
}

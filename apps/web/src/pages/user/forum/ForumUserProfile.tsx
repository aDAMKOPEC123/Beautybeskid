import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { forumApi, ForumUserProfile as ForumUserProfileType } from '@/api/forum.api';
import { getRankLabel, getRelativeTime } from './ForumHome';

export function ForumUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<ForumUserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    forumApi
      .getUserThreads(userId)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;
  if (notFound || !data) return <div className="p-6 text-center text-gray-400">Nie znaleziono użytkownika.</div>;

  const { user, postCount, data: threads } = data;
  const rankLabel = getRankLabel(postCount);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">Profil użytkownika</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
          <span className="inline-block text-sm text-purple-600 font-medium mt-0.5">{rankLabel}</span>
          <div className="flex gap-4 mt-2 text-sm text-gray-500 flex-wrap">
            <span>💬 {postCount} postów</span>
            <span>
              📅 dołączył/a{' '}
              {new Date(user.createdAt).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Ostatnie wątki</h2>
      {threads.length === 0 ? (
        <p className="text-gray-400 text-sm">Brak publicznych wątków.</p>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/user/forum/watek/${thread.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-800 text-sm">{thread.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{thread.category.name}</span>
                <span>·</span>
                <span>{getRelativeTime(thread.createdAt)}</span>
                <span>·</span>
                <span>{thread._count?.posts ?? 0} odpowiedzi</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forumApi, ForumPost, ForumThread as ForumThreadType } from '@/api/forum.api';
import { useAuthStore } from '@/store/auth.store';

function ForumPostItem({
  post,
  currentUserId,
  isAdmin,
  onDelete,
}: {
  post: ForumPost;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const canDelete = isAdmin || post.author.id === currentUserId;

  return (
    <div className={`bg-white rounded-xl border p-4 ${post.mentionsAdmin ? 'border-l-4 border-l-purple-400 border-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium text-xs shrink-0">
            {post.author.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{post.author.name}</span>
              {post.mentionsAdmin && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Kosmetolog
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {new Date(post.createdAt).toLocaleString('pl-PL')}
            </span>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-xs text-red-400 hover:text-red-600 shrink-0"
          >
            Usuń
          </button>
        )}
      </div>
      <p className="mt-3 text-gray-700 text-sm whitespace-pre-wrap">{post.content}</p>
    </div>
  );
}

export function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [thread, setThread] = useState<ForumThreadType | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    Promise.all([
      forumApi.getThread(id, { page, limit: 20 }),
      forumApi.getWatchStatus(id),
    ]).then(([threadRes, watchRes]) => {
      setThread(threadRes.thread);
      setPosts(threadRes.posts.data);
      setTotalPages(threadRes.posts.totalPages);
      setWatching(watchRes.watching);
    }).finally(() => setLoading(false));
  }, [id, page]);

  const handleToggleWatch = async () => {
    if (!id) return;
    const res = await forumApi.toggleWatch(id);
    setWatching(res.watching);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Usunąć tę odpowiedź?')) return;
    if (isAdmin) {
      await forumApi.adminDeletePost(postId);
    } else {
      await forumApi.deletePost(postId);
    }
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!window.confirm('Usunąć ten wątek?')) return;
    if (isAdmin) {
      await forumApi.adminDeleteThread(thread.id);
    } else {
      await forumApi.deleteThread(thread.id);
    }
    navigate('/user/forum');
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      const post = await forumApi.createPost(id, { content: replyContent, isAnonymous: replyAnon });
      setPosts(prev => [...prev, post]);
      setReplyContent('');
      setReplyAnon(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;
  if (!thread) return <div className="p-6 text-center text-gray-400">Nie znaleziono wątku.</div>;

  const canDeleteThread = isAdmin || thread.author.id === user?.id;

  return (
    <div className="max-w-3xl mx-auto p-4 pb-32">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <Link to={`/user/forum/${thread.category.slug}`} className="hover:text-purple-600">
          {thread.category.name}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex gap-2 flex-wrap">
            {thread.isPinned && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Przypięty</span>
            )}
            {thread.isLocked && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Zamknięty</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleWatch}
              className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
                watching
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'border-gray-200 text-gray-500 hover:border-purple-200'
              }`}
            >
              {watching ? '🔔 Obserwujesz' : '🔕 Obserwuj'}
            </button>
            {canDeleteThread && (
              <button onClick={handleDeleteThread} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                Usuń wątek
              </button>
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-3">{thread.title}</h1>
        <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">{thread.content}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{thread.author.name}</span>
          <span>·</span>
          <span>{new Date(thread.createdAt).toLocaleDateString('pl-PL')}</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {posts.map(post => (
          <ForumPostItem
            key={post.id}
            post={post}
            currentUserId={user?.id ?? ''}
            isAdmin={isAdmin}
            onDelete={handleDeletePost}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mb-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">← Poprzednia</button>
          <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">Następna →</button>
        </div>
      )}

      {!thread.isLocked && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:border md:rounded-xl md:p-5">
          <form onSubmit={handleSubmitReply}>
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Napisz odpowiedź..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={replyAnon} onChange={e => setReplyAnon(e.target.checked)} className="rounded" />
                Anonimowo
              </label>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
              >
                {submitting ? 'Wysyłanie...' : 'Odpowiedz'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

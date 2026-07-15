import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forumApi, ForumPost, ForumThread as ForumThreadType } from '@/api/forum.api';
import { useAuthStore } from '@/store/auth.store';
import { getRankLabel } from './ForumHome';

interface QuoteState {
  postId: string;
  content: string;
  authorName: string;
}

function ReactionButton({
  emoji,
  count,
  reacted,
  onClick,
}: {
  emoji: string;
  count: number;
  reacted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
        reacted ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'
      }`}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

function ForumPostItem({
  post,
  currentUserId,
  isAdmin,
  onDelete,
  onQuote,
  onReact,
}: {
  post: ForumPost;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onQuote: (state: QuoteState) => void;
  onReact: (postId: string, type: 'LIKE' | 'HEART' | 'HELPFUL') => void;
}) {
  const canDelete = isAdmin || post.author.id === currentUserId;
  const postCount = post.author._count?.forumPosts ?? 0;
  const rankLabel = getRankLabel(postCount);
  const canClickProfile = !post.isAnonymous && post.author.id;

  return (
    <div
      className={`bg-white rounded-xl border p-4 ${
        post.mentionsAdmin ? 'border-l-4 border-l-purple-400 border-gray-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Author column — desktop */}
        <div className="shrink-0 w-24 text-center hidden sm:block">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium text-sm mx-auto mb-1">
            {post.author.name.charAt(0).toUpperCase()}
          </div>
          {canClickProfile ? (
            <Link
              to={`/user/forum/uzytkownik/${post.author.id}`}
              className="text-xs font-medium text-gray-800 hover:text-purple-600 leading-tight block"
            >
              {post.author.name}
            </Link>
          ) : (
            <span className="text-xs font-medium text-gray-800 leading-tight">{post.author.name}</span>
          )}
          <span className="text-xs text-purple-600 font-medium block mt-0.5">{rankLabel}</span>
          <span className="text-xs text-gray-400 block">{postCount} postów</span>
          {post.author.createdAt && (
            <span className="text-xs text-gray-300 block">
              od {new Date(post.author.createdAt).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Mobile author row */}
          <div className="flex items-center gap-2 mb-2 sm:hidden">
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium text-xs shrink-0">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800">{post.author.name}</span>
            <span className="text-xs text-purple-600">{rankLabel}</span>
          </div>

          {/* Quoted block */}
          {post.quotedContent && (
            <div className="border-l-4 border-gray-300 bg-gray-50 rounded-r-lg px-3 py-2 mb-3">
              <p className="text-xs text-gray-500 italic mb-1">Cytowany post:</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{post.quotedContent}</p>
            </div>
          )}

          <p className="text-gray-700 text-sm whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <ReactionButton
                emoji="👍"
                count={post.reactions.LIKE.count}
                reacted={post.reactions.LIKE.reacted}
                onClick={() => onReact(post.id, 'LIKE')}
              />
              <ReactionButton
                emoji="❤️"
                count={post.reactions.HEART.count}
                reacted={post.reactions.HEART.reacted}
                onClick={() => onReact(post.id, 'HEART')}
              />
              <ReactionButton
                emoji="💡"
                count={post.reactions.HELPFUL.count}
                reacted={post.reactions.HELPFUL.reacted}
                onClick={() => onReact(post.id, 'HELPFUL')}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('pl-PL')}</span>
              <button
                onClick={() =>
                  onQuote({ postId: post.id, content: post.content.slice(0, 300), authorName: post.author.name })
                }
                className="text-xs text-gray-400 hover:text-purple-600"
              >
                Cytuj
              </button>
              {canDelete && (
                <button onClick={() => onDelete(post.id)} className="text-xs text-red-400 hover:text-red-600">
                  Usuń
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
  const [loadError, setLoadError] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      forumApi.getThread(id, { page, limit: 20 }),
      forumApi.getWatchStatus(id),
    ]).then(([threadRes, watchRes]) => {
      setThread(threadRes.thread);
      setPosts(threadRes.posts.data);
      setTotalPages(threadRes.posts.totalPages);
      setWatching(watchRes.watching);
    }).catch(() => {
      setThread(null);
      setLoadError(true);
    }).finally(() => setLoading(false));
  }, [id, page]);

  const handleToggleWatch = async () => {
    if (!id) return;
    const res = await forumApi.toggleWatch(id);
    setWatching(res.watching);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Usunąć tę odpowiedź?')) return;
    if (isAdmin) await forumApi.adminDeletePost(postId);
    else await forumApi.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!window.confirm('Usunąć ten wątek?')) return;
    if (isAdmin) await forumApi.adminDeleteThread(thread.id);
    else await forumApi.deleteThread(thread.id);
    navigate('/user/forum');
  };

  const handleReact = async (postId: string, type: 'LIKE' | 'HEART' | 'HELPFUL') => {
    const result = await forumApi.reactToPost(postId, type);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [type]: {
              count: result.counts[type] ?? 0,
              reacted: result.reacted && result.type === type,
            },
          },
        };
      })
    );
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyContent.trim()) return;
    setSubmitting(true);
    setReplyError('');
    try {
      const post = await forumApi.createPost(id, {
        content: replyContent,
        isAnonymous: replyAnon,
        quotedPostId: quoteState?.postId,
        quotedContent: quoteState?.content,
      });
      setPosts((prev) => [...prev, post]);
      setReplyContent('');
      setReplyAnon(false);
      setQuoteState(null);
    } catch {
      setReplyError('Nie udało się wysłać odpowiedzi. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;
  if (!thread) return (
    <div className="p-6 text-center" role={loadError ? 'alert' : undefined}>
      <h1 className="text-xl font-bold text-gray-800">{loadError ? 'Nie udało się wczytać wątku' : 'Nie znaleziono wątku'}</h1>
      <Link to="/user/forum" className="mt-3 inline-block text-sm text-purple-600 hover:underline">Wróć do forum</Link>
    </div>
  );

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

        <h1 className="text-xl font-bold text-gray-800 mb-2">{thread.title}</h1>

        {thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {thread.tags.map((tag) => (
              <Link
                key={tag}
                to={`/user/forum/szukaj?tags=${encodeURIComponent(tag)}`}
                className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">{thread.content}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{thread.author.name}</span>
          <span>·</span>
          <span>{new Date(thread.createdAt).toLocaleDateString('pl-PL')}</span>
          <span>·</span>
          <span>👁 {thread.viewCount} wyświetleń</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {posts.map((post) => (
          <ForumPostItem
            key={post.id}
            post={post}
            currentUserId={user?.id ?? ''}
            isAdmin={isAdmin}
            onDelete={handleDeletePost}
            onQuote={setQuoteState}
            onReact={handleReact}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mb-4">
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

      {!thread.isLocked && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:border md:rounded-xl md:p-5">
          <form onSubmit={handleSubmitReply}>
            {quoteState && (
              <div className="flex items-start gap-2 mb-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    Cytujesz: <span className="font-medium">{quoteState.authorName}</span>
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">{quoteState.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuoteState(null)}
                  aria-label="Usuń cytat"
                  className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            )}
            <label htmlFor="forum-reply" className="sr-only">Treść odpowiedzi</label>
            <textarea
              id="forum-reply"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Napisz odpowiedź... (użyj @admin jeśli potrzebujesz pomocy)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  id="forum-reply-anonymous"
                  type="checkbox"
                  checked={replyAnon}
                  onChange={(e) => setReplyAnon(e.target.checked)}
                  className="rounded"
                />
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
            {replyError && <p className="text-xs text-red-500 mt-1">{replyError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

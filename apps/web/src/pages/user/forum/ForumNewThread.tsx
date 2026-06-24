import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forumApi, ForumCategory } from '@/api/forum.api';

export function ForumNewThread() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    forumApi.getCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) return;
    setSubmitting(true);
    setError('');
    try {
      const thread = await forumApi.createThread({ title, content, categoryId, isAnonymous });
      navigate(`/user/forum/watek/${thread.id}`);
    } catch {
      setError('Nie udało się utworzyć wątku. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nowy wątek</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Temat wątku..."
            maxLength={200}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Treść</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Opisz swój problem lub pytanie..."
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="rounded mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Opublikuj anonimowo</span>
              <p className="text-xs text-gray-400 mt-0.5">Twoje imię będzie ukryte dla innych użytkowników. Administracja nadal może zidentyfikować autora.</p>
            </div>
          </label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/user/forum')}
            className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Anuluj
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Publikowanie...' : 'Opublikuj wątek'}
          </button>
        </div>
      </form>
    </div>
  );
}

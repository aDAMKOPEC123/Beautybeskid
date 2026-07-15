import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forumApi, ForumCategory, ForumTag } from '@/api/forum.api';

export function ForumNewThread() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [popularTags, setPopularTags] = useState<ForumTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    forumApi.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    }).catch(() => setError('Nie udało się pobrać kategorii. Odśwież stronę i spróbuj ponownie.'));
    forumApi.getPopularTags().then(setPopularTags).catch(() => setPopularTags([]));
  }, []);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized || normalized.length > 30 || tags.includes(normalized) || tags.length >= 5) return;
    setTags((prev) => [...prev, normalized]);
    setTagInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const filteredSuggestions = popularTags
    .filter((t) => t.tag.includes(tagInput.toLowerCase()) && !tags.includes(t.tag))
    .slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) return;
    setSubmitting(true);
    setError('');
    try {
      const thread = await forumApi.createThread({ title, content, categoryId, isAnonymous, tags });
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
          <label htmlFor="forum-category" className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
          <select
            id="forum-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="forum-title" className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
          <input
            id="forum-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Temat wątku..."
            maxLength={200}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <div>
          <label htmlFor="forum-content" className="block text-sm font-medium text-gray-700 mb-1">Treść</label>
          <textarea
            id="forum-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Opisz swój problem lub pytanie..."
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <div>
          <label htmlFor="forum-tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tagi <span className="text-gray-400 font-normal">(opcjonalnie, maks. 5)</span>
          </label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Usuń tag ${tag}`}
                    className="hover:text-purple-900 font-bold"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          {tags.length < 5 && (
            <div className="relative">
              <input
                id="forum-tags"
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                onKeyDown={handleTagKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Wpisz tag i naciśnij Enter..."
                maxLength={30}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-sm mt-1">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s.tag}
                      type="button"
                      onMouseDown={() => addTag(s.tag)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex justify-between"
                    >
                      <span>#{s.tag}</span>
                      <span className="text-gray-400 text-xs">{s.count}x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Dodaj tagi, żeby inni łatwiej znaleźli Twój wątek</p>
        </div>

        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="forum-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Opublikuj anonimowo</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Twoje imię będzie ukryte dla innych użytkowników. Administracja nadal może zidentyfikować autora.
              </p>
            </div>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/user/forum')}
            className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
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

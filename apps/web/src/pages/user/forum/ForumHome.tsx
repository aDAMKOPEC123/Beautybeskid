import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forumApi, ForumCategory } from '@/api/forum.api';

export function ForumHome() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    forumApi.getCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Forum</h1>
      <div className="space-y-3">
        {categories.map(cat => (
          <Link
            key={cat.id}
            to={`/user/forum/${cat.slug}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                )}
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="text-sm font-medium text-purple-600">
                  {cat._count?.threads ?? 0}
                </span>
                <p className="text-xs text-gray-400">wątków</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Link
          to="/user/forum/nowy"
          className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + Nowy wątek
        </Link>
      </div>
    </div>
  );
}

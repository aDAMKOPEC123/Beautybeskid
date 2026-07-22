// filepath: apps/web/src/pages/public/BlogList.tsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { blogApi } from '@/api/blog.api';
import { useAuthStore } from '@/store/auth.store';
import { Clock, Heart, MessageCircle, Search, X } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { BlogListSkeleton } from '@/components/skeletons';
import { DecoLine } from '@/components/shared/DecoElements';

const LikeButton = ({
  post,
  onLike,
  isLoggedIn,
  isPending
}: {
  post: any;
  onLike: () => void;
  isLoggedIn: boolean;
  isPending: boolean;
}) => {
  const [showHint, setShowHint] = useState(false);
  const [animate, setAnimate] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isLiked = post.isLiked;

  const spawnHearts = () => {
    if (!wrapperRef.current) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!wrapperRef.current) return;
        const heart = document.createElement('span');
        heart.textContent = '❤️';
        heart.style.cssText = `
          position: absolute;
          font-size: 14px;
          pointer-events: none;
          left: ${30 + Math.random() * 40}%;
          top: -4px;
          animation: floatUp 0.7s ease forwards;
          animation-delay: ${Math.random() * 0.1}s;
          z-index: 10;
        `;
        wrapperRef.current.appendChild(heart);
        setTimeout(() => heart.remove(), 800);
      }, i * 60);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2500);
      return;
    }
    if (animate) return;
    setAnimate(true);
    if (!isLiked) spawnHearts();
    onLike();
    setTimeout(() => setAnimate(false), 400);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
          isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{
          color: isLiked ? '#C4965A' : 'rgba(20,40,28,0.6)',
          backgroundColor: isLiked ? 'rgba(196,150,90,0.1)' : 'rgba(20,40,28,0.05)',
        }}
      >
        <Heart
          size={22}
          fill={isLiked ? '#C4965A' : 'none'}
          stroke={isLiked ? '#C4965A' : 'currentColor'}
          style={{
            animation: animate ? 'heartPop 0.3s ease' : 'none',
            transition: 'fill 0.3s, stroke 0.3s',
          }}
        />
        <span
          className="text-sm font-medium"
          style={{
            animation: animate ? (isLiked ? 'counterDown 0.3s ease' : 'counterUp 0.3s ease') : 'none',
          }}
        >
          {post._count?.likes ?? 0}
        </span>
      </button>
      {showHint && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap z-10 shadow-lg"
          style={{ backgroundColor: '#1A3828', color: '#fff' }}
        >
          <div className="text-center">
            <div>Zaloguj się, aby polubić artykuł</div>
            <div className="text-xs mt-1 opacity-70">To tylko chwila — dołącz do nas!</div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1" style={{ border: '8px solid transparent', borderTopColor: '#1A3828' }} />
        </div>
      )}
    </div>
  );
};

export const BlogList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: posts, isLoading } = useQuery({ queryKey: ['blog'], queryFn: blogApi.getAll });

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const likeMutation = useMutation({
    mutationFn: (slug: string) => blogApi.likePost(slug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: ['blog'] });
      const previousPosts = queryClient.getQueryData(['blog']);
      
      queryClient.setQueryData(['blog'], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.slug === slug) {
            return {
              ...post,
              isLiked: !post.isLiked,
              _count: {
                ...post._count,
                likes: post.isLiked ? (post._count?.likes ?? 1) - 1 : (post._count?.likes ?? 0) + 1
              }
            };
          }
          return post;
        });
      });
      
      return { previousPosts };
    },
    onSuccess: (data, slug) => {
      queryClient.setQueryData(['blog'], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.slug === slug) {
            return {
              ...post,
              isLiked: data.liked,
              _count: {
                ...post._count,
                likes: data.liked ? (post._count?.likes ?? 0) + 1 : Math.max((post._count?.likes ?? 1) - 1, 0)
              }
            };
          }
          return post;
        });
      });
    },
    onError: (_err, _slug, context) => {
      queryClient.setQueryData(['blog'], context?.previousPosts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
    },
  });

  if (isLoading) return (
    <>
      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
          >
            Wiedza i Inspiracje
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A3828' }}>
            Blog Kosmetologiczny
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(20,40,28,0.55)' }}>
            Artykuły o pielęgnacji skóry, zabiegach oraz stylizacji brwi i rzęs — porady kosmetologa z Limanowej.
          </p>
        </div>
      </section>
      <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-4xl mx-auto">
          <BlogListSkeleton count={5} />
        </div>
      </section>
    </>
  );

  const allCategories = Array.from(
    new Set<string>(
      (posts ?? [])
        .filter((p: any) => p.isPublished && p.category)
        .map((p: any) => p.category as string)
    )
  ).sort();

  const filteredPosts = (posts ?? [])
    .filter((p: any) => p.isPublished)
    .filter((p: any) =>
      !activeCategory || p.category === activeCategory
    )
    .filter((p: any) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q)
      );
    });

  return (
    <>
      <style>{`
  @keyframes floatUp {
    to { opacity: 0; transform: translateY(-40px) scale(0.5); }
  }
  @keyframes heartPop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes counterDown {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(6px); }
  }
  @keyframes counterUp {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`}</style>
      <PageSEO
        title="Blog kosmetologiczny | BeskidStudio Wiktoria Ćwik"
        description="Porady kosmetologa z Limanowej o pielęgnacji skóry, zabiegach oraz stylizacji brwi i rzęs. Przeczytaj artykuły Wiktorii Ćwik."
        canonical="/blog"
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Strona główna', item: 'https://kosmetologwiktoriacwik.pl' },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://kosmetologwiktoriacwik.pl/blog' },
              ],
            },
            {
              '@type': 'CollectionPage',
              '@id': 'https://kosmetologwiktoriacwik.pl/blog#collection',
              name: 'Blog kosmetologiczny BeskidStudio',
              url: 'https://kosmetologwiktoriacwik.pl/blog',
              isPartOf: { '@id': 'https://kosmetologwiktoriacwik.pl/#website' },
              about: { '@id': 'https://kosmetologwiktoriacwik.pl/#beautysalon' },
              inLanguage: 'pl-PL',
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
          >
            Wiedza i Inspiracje
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A3828' }}>
            Blog Kosmetologiczny
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(20,40,28,0.55)' }}>
            Artykuły o pielęgnacji skóry, zabiegach oraz stylizacji brwi i rzęs — porady kosmetologa z Limanowej.
          </p>

          {/* Search + filters */}
          <div className="mt-8 max-w-2xl mx-auto space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(20,40,28,0.4)' }}
              />
              <input
                id="blog-search"
                type="text"
                aria-label="Szukaj artykułu"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Szukaj artykułu..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid rgba(20,40,28,0.12)',
                  color: '#1A3828',
                }}
                onFocus={e => (e.currentTarget.style.border = '1px solid #3D7A54')}
                onBlur={e => (e.currentTarget.style.border = '1px solid rgba(20,40,28,0.12)')}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Wyczyść wyszukiwanie"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 transition-colors"
                  style={{ color: 'rgba(20,40,28,0.4)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category pills */}
            {allCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: !activeCategory ? '#1A3828' : 'rgba(20,40,28,0.07)',
                    color: !activeCategory ? '#fff' : 'rgba(20,40,28,0.6)',
                  }}
                >
                  Wszystkie
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: activeCategory === cat ? '#3D7A54' : 'rgba(20,40,28,0.07)',
                      color: activeCategory === cat ? '#fff' : 'rgba(20,40,28,0.6)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* List */}
      <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            {filteredPosts.length === 0 && !isLoading && (
              <div
                className="py-12 px-6 rounded-2xl"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(20,40,28,0.07)' }}
              >
                {search || activeCategory ? (
                  <div className="text-center">
                    <p className="text-base font-medium" style={{ color: 'rgba(20,40,28,0.5)' }}>
                      Brak artykułów pasujących do filtrów.
                    </p>
                    <button
                      onClick={() => { setSearch(''); setActiveCategory(null); }}
                      className="mt-3 text-sm font-semibold underline"
                      style={{ color: '#3D7A54' }}
                    >
                      Wyczyść filtry
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-center text-base font-medium mb-6" style={{ color: 'rgba(20,40,28,0.5)' }}>
                      Pierwsze artykuły już wkrótce! Tymczasem zobacz, o czym będziemy pisać:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {[
                        { title: 'Pielęgnacja skóry', desc: 'Jak dbać o skórę na co dzień — porady kosmetologa, dobór kosmetyków i rutyny pielęgnacyjne.' },
                        { title: 'Laminacja brwi i rzęs', desc: 'Czym jest laminacja, jak przebiega zabieg, ile trwa efekt i jak się przygotować do wizyty.' },
                        { title: 'Zabiegi na twarz', desc: 'Peelingi, oczyszczanie, nawilżanie — kiedy wybrać jaki zabieg i czego się spodziewać.' },
                        { title: 'Podologia i stopy', desc: 'Wrastające paznokcie, modzele, pękające pięty — kiedy warto udać się do podologa.' },
                      ].map(({ title, desc }) => (
                        <div
                          key={title}
                          className="p-4"
                          style={{
                            borderRadius: '12px',
                            backgroundColor: '#F0F7F1',
                            border: '1px solid rgba(20,40,28,0.06)',
                          }}
                        >
                          <p className="font-semibold text-sm mb-1" style={{ color: '#1A3828' }}>{title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: 'rgba(20,40,28,0.55)' }}>{desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-center mt-6 text-sm" style={{ color: 'rgba(20,40,28,0.45)' }}>
                      Chcesz się umówić na wizytę?{' '}
                      <Link to="/rezerwacja" className="font-semibold underline" style={{ color: '#3D7A54' }}>
                        Zarezerwuj termin online
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            )}

            {filteredPosts.map((post: any) => (
              <Link to={`/blog/${post.slug}`} key={post.id} className="block group">
                <div
                  className="relative flex flex-col sm:flex-row gap-0 overflow-hidden transition-all duration-300"
                  style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)')}
                >
                  {post.createdAt && (
                    <span
                      aria-hidden="true"
                      className="absolute pointer-events-none select-none"
                      style={{
                        fontSize: 48,
                        color: 'rgba(196,150,90,0.07)',
                        fontFamily: 'Playfair Display, Georgia, serif',
                        right: 12,
                        top: 8,
                        lineHeight: 1,
                        zIndex: 0,
                      }}
                    >
                      {new Date(post.createdAt).getFullYear()}
                    </span>
                  )}
                  {/* Desktop thumbnail (left side) */}
                  <div
                    className="shrink-0 overflow-hidden hidden sm:block"
                    style={{ width: '140px', borderRadius: '16px 0 0 16px' }}
                  >
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        style={{ minHeight: '100px' }}
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'rgba(196,150,90,0.08)', minHeight: '100px' }} />
                    )}
                  </div>

                  {/* Mobile thumbnail (top) */}
                  {post.coverImage && (
                    <div className="sm:hidden w-full overflow-hidden" style={{ height: '160px', borderRadius: '16px 16px 0 0' }}>
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative z-[1] flex flex-col flex-1 px-5 py-4 min-w-0">
                    <h2
                      className="text-lg font-heading font-bold leading-snug mb-1 line-clamp-2"
                      style={{ color: '#1A3828' }}
                    >
                      {post.title}
                    </h2>
                    <p
                      className="text-sm leading-relaxed mb-3 line-clamp-2"
                      style={{ color: 'rgba(20,40,28,0.55)' }}
                    >
                      {post.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-auto">
                      {post.tags?.slice(0, 3).map((tag: any) => (
                        <span
                          key={tag.id}
                          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
                        >
                          <DecoLine width={8} />#{tag.name}
                        </span>
                      ))}
                      <div className="flex items-center gap-3 ml-auto text-xs" style={{ color: 'rgba(20,40,28,0.45)' }}>
                        {post.readingTime && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {post.readingTime} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} /> {post._count?.comments ?? 0}
                        </span>
                        <LikeButton
                          post={post}
                          onLike={() => likeMutation.mutate(post.slug)}
                          isLoggedIn={!!user}
                          isPending={likeMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

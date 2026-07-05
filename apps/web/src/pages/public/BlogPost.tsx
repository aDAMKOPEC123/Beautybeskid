// filepath: apps/web/src/pages/public/BlogPost.tsx
import { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import { blogApi } from '@/api/blog.api';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Heart, MessageCircle } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { BlogCommentsSection } from '@/components/blog/BlogCommentsSection';

const ContentRenderer = ({ content }: { content: string }) => {
  const parsed = useMemo(() => {
    if (!content) return null;
    try {
      const obj = typeof content === 'string' ? JSON.parse(content) : content;
      return typeof obj === 'object' ? obj : null;
    } catch {
      return null;
    }
  }, [content]);

  const editor = useEditor({
    extensions: [StarterKit, Image, LinkExt.configure({ openOnClick: true })],
    content: parsed ?? '',
    editable: false,
  });

  return <EditorContent editor={editor} />;
};

const LikeButton = ({
  isLiked,
  count,
  onLike,
  isLoggedIn,
  isPending
}: {
  isLiked: boolean;
  count: number;
  onLike: () => void;
  isLoggedIn: boolean;
  isPending: boolean;
}) => {
  const [showHint, setShowHint] = useState(false);
  const [animate, setAnimate] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
          isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{
          color: isLiked ? '#C4965A' : 'rgba(20,40,28,0.6)',
          backgroundColor: isLiked ? 'rgba(196,150,90,0.12)' : 'rgba(20,40,28,0.05)',
        }}
      >
        <Heart
          size={24}
          fill={isLiked ? '#C4965A' : 'none'}
          stroke={isLiked ? '#C4965A' : 'currentColor'}
          style={{
            animation: animate ? 'heartPop 0.3s ease' : 'none',
            transition: 'fill 0.3s, stroke 0.3s',
          }}
        />
        <span
          className="text-base font-medium"
          style={{
            animation: animate ? (isLiked ? 'counterDown 0.3s ease' : 'counterUp 0.3s ease') : 'none',
          }}
        >
          {count}
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

export const BlogPost = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: post, isLoading } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => blogApi.getOne(slug!),
  });

  const likeMutation = useMutation({
    mutationFn: (postSlug: string) => blogApi.likePost(postSlug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: ['blog', slug] });
      const previousPost = queryClient.getQueryData(['blog', slug]);
      
      queryClient.setQueryData(['blog', slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !old.isLiked,
          _count: {
            ...old._count,
            likes: old.isLiked ? (old._count?.likes ?? 1) - 1 : (old._count?.likes ?? 0) + 1
          }
        };
      });
      
      return { previousPost };
    },
    onSuccess: (data, slug) => {
      queryClient.setQueryData(['blog', slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: data.liked,
          _count: {
            ...old._count,
            likes: data.liked ? (old._count?.likes ?? 0) + 1 : Math.max((old._count?.likes ?? 1) - 1, 0)
          }
        };
      });
    },
    onError: (_err, slugVar, context) => {
      queryClient.setQueryData(['blog', slugVar], context?.previousPost);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['blog', slug] });
    },
  });

  if (isLoading) return (
    <div className="container py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!post) return <div className="p-8 text-center">Wpis nie został znaleziony.</div>;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `https://kosmetologwiktoriacwik.pl/blog/${post.slug}#article`,
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `https://kosmetologwiktoriacwik.pl/blog/${post.slug}`,
    ...(post.coverImage ? { image: post.coverImage.startsWith('http') ? post.coverImage : `https://kosmetologwiktoriacwik.pl${post.coverImage}` } : {}),
    author: {
      '@type': 'Person',
      '@id': 'https://kosmetologwiktoriacwik.pl/o-nas#person',
      name: post.author?.name ?? 'Wiktoria Ćwik',
      jobTitle: 'Dyplomowany kosmetolog',
      url: 'https://kosmetologwiktoriacwik.pl/o-nas',
      sameAs: [
        'https://www.facebook.com/kosmetologwiktoriacwik/',
        'https://www.instagram.com/kosmetolog__wiktoria_cwik/',
        'https://www.tiktok.com/@wiktoriabeauty_brows',
      ],
    },
    publisher: { '@id': 'https://kosmetologwiktoriacwik.pl/#beautysalon' },
    isAccessibleForFree: true,
  };

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
        title={post.metaTitle ?? post.title}
        description={post.metaDescription ?? post.excerpt ?? `${post.title} — porada na blogu BeskidStudio By Wiktoria Ćwik, salon kosmetologiczny w Limanowej (Mordarka 505). Pielęgnacja skóry, zabiegi i wskazówki eksperta.`}
        canonical={`/blog/${post.slug}`}
        ogImage={post.coverImage}
        schema={articleSchema}
        type="article"
        publishedTime={post.createdAt}
        modifiedTime={post.updatedAt}
        author="Wiktoria Ćwik"
      />

      {/* Back link */}
      <div className="container pt-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'rgba(20,40,28,0.5)' }}
        >
          <ArrowLeft size={15} /> Powrót na blog
        </Link>
      </div>

      {/* Hero */}
      <section className="py-14 text-center" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container max-w-3xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#C4965A' }}>
            {format(new Date(post.createdAt), 'dd MMMM yyyy')}
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight mb-6" style={{ color: '#1A3828' }}>
            {post.title}
          </h1>
          <div className="flex justify-center items-center gap-4 mb-6 text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
            {post.readingTime && (
              <span className="flex items-center gap-1">
                <Clock size={14} /> {post.readingTime} min czytania
              </span>
            )}
            <span className="flex items-center gap-1">
              <MessageCircle size={14} /> {post._count?.comments ?? 0} komentarzy
            </span>
            <LikeButton
              isLiked={post.isLiked}
              count={post._count?.likes ?? 0}
              onLike={() => likeMutation.mutate(post.slug)}
              isLoggedIn={!!user}
              isPending={likeMutation.isPending}
            />
          </div>
          <p className="mb-5 text-sm" style={{ color: 'rgba(20,40,28,0.72)' }}>
            Autor: <Link to="/o-nas" className="font-semibold underline decoration-caramel/50 underline-offset-4">{post.author?.name ?? 'Wiktoria Ćwik'}, dyplomowany kosmetolog</Link>
            {post.updatedAt && post.updatedAt !== post.createdAt
              ? ` · aktualizacja ${format(new Date(post.updatedAt), 'dd.MM.yyyy')}`
              : ''}
          </p>
          {post.tags?.length > 0 && (
            <div className="flex justify-center flex-wrap gap-2">
              {post.tags.map((tag: any) => (
                <span
                  key={tag.id}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cover image */}
      {post.coverImage && (
        <div className="container max-w-4xl mx-auto px-4 -mt-1 pt-10">
          <div className="overflow-hidden shadow-xl" style={{ borderRadius: '20px' }}>
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <section className="py-14" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-3xl mx-auto">
          <article className="
            prose prose-lg max-w-none
            prose-headings:font-heading prose-headings:text-espresso prose-headings:leading-snug
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-caramel/20
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-2 prose-h3:text-caramel
            prose-p:text-espresso/80 prose-p:leading-relaxed prose-p:my-4
            prose-strong:text-espresso prose-strong:font-semibold
            prose-a:text-caramel prose-a:no-underline hover:prose-a:underline
            prose-ul:my-4 prose-li:my-1 prose-li:text-espresso/80
            prose-ol:my-4
            prose-blockquote:border-l-4 prose-blockquote:border-oak
            prose-blockquote:bg-oak/5 prose-blockquote:rounded-r-xl
            prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:my-8
            prose-blockquote:text-espresso/70 prose-blockquote:italic prose-blockquote:not-italic
            prose-blockquote:font-medium prose-blockquote:text-base
          ">
            <ContentRenderer content={post.content} />
          </article>
        </div>
      </section>

      <BlogCommentsSection slug={post.slug} />
    </>
  );
};

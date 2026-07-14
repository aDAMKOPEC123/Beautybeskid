import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { academyApi } from '@/api/academy.api';
import { DocumentTitle } from '@/components/DocumentTitle';

const labels: Record<string, string> = {
  regulamin: 'Regulamin Akademii',
  'polityka-prywatnosci': 'Polityka prywatności',
  cookies: 'Polityka cookies',
  odstapienie: 'Odstąpienie od umowy',
  reklamacje: 'Reklamacje',
  dostepnosc: 'Deklaracja dostępności',
};

export function AcademyLegalPage() {
  const { slug = 'regulamin' } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ['academy', 'legal', slug], queryFn: () => academyApi.getLegalDocument(slug) });
  return <div className="academy-legal-page">
    <DocumentTitle title={`${labels[slug] || 'Dokument prawny'} | Akademia BeskidStudio`} />
    <Helmet><meta name="description" content={`${labels[slug] || 'Dokument'} Akademii BeskidStudio.`} /></Helmet>
    <nav aria-label="Dokumenty prawne"><Link to="/">Akademia</Link><span aria-hidden="true">/</span><span>{labels[slug]}</span></nav>
    {isLoading && <p role="status">Ładowanie dokumentu…</p>}
    {isError && <section><h1>Dokument jest chwilowo niedostępny</h1><p>Spróbuj ponownie lub napisz na kontakt@kosmetologwiktoriacwik.pl.</p></section>}
    {data && <article><header><p className="academy-kicker">Informacje prawne</p><h1>{data.title}</h1><p>Wersja {data.version} · opublikowano {new Date(data.publishedAt || data.updatedAt).toLocaleDateString('pl-PL')}</p></header><div className="academy-legal-content">{String(data.content).split('\n').map((line, index) => line.trim() ? <p key={index}>{line}</p> : <br key={index} />)}</div></article>}
  </div>;
}

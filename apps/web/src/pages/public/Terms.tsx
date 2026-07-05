import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { PageSEO } from '@/components/shared/SEO';

export const PublicTerms = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const res = await api.get('/terms');
      return res.data.data.terms;
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <PageSEO
        title="Regulamin gabinetu kosmetologicznego BeskidStudio By Wiktoria Ćwik"
        description="Regulamin i warunki korzystania z usług salonu kosmetologicznego BeskidStudio By Wiktoria Ćwik w Mordarce koło Limanowej."
        canonical="/regulamin"
      />
      <h1 className="text-3xl font-heading font-bold text-primary mb-8">Regulamin Gabinetu BeskidStudio By Wiktoria Ćwik</h1>
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Wczytywanie regulaminu...</p>
      ) : data ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm">
          <p className="text-xs text-muted-foreground mb-4">Wersja: {data.version} · Ostatnia aktualizacja: {new Date(data.updatedAt).toLocaleDateString('pl-PL')}</p>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{data.content}</pre>
        </div>
      ) : (
        <p className="text-muted-foreground">Nie udało się załadować regulaminu.</p>
      )}
    </div>
  );
};

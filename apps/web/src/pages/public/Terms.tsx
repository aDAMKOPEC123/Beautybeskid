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
        title="Regulamin i polityka prywatności | BeskidStudio"
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
      <section className="mt-6 rounded-2xl border border-border/50 bg-card p-6 text-sm leading-relaxed shadow-sm" aria-labelledby="google-maps-data-heading">
        <h2 id="google-maps-data-heading" className="mb-3 text-xl font-heading font-bold text-primary">Dane z Google Maps Platform</h2>
        <p>
          Na stronie możemy wyświetlać aktualną ocenę, liczbę opinii oraz wybrane opinie pochodzące z Google Maps Platform.
          Dane są pobierane podczas korzystania ze strony i prezentowane wraz z oznaczeniem źródła oraz informacjami o autorach.
        </p>
        <p className="mt-3">
          Korzystanie z tych danych podlega{' '}
          <a className="font-semibold underline underline-offset-4" href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noopener noreferrer">warunkom Google Maps Platform</a>
          {' '}oraz{' '}
          <a className="font-semibold underline underline-offset-4" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">polityce prywatności Google</a>.
        </p>
      </section>
    </div>
  );
};

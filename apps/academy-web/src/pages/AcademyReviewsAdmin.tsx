import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquareQuote, X } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { toast } from 'sonner';

export function AcademyReviewsAdmin() {
  const client = useQueryClient();
  const { data: reviews = [], isLoading, error } = useQuery({ queryKey: ['academy-admin-reviews'], queryFn: academyApi.adminReviews });
  const moderate = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) => academyApi.adminModerateReview(id, isApproved),
    onSuccess: async (_, variables) => { await client.invalidateQueries({ queryKey: ['academy-admin-reviews'] }); toast.success(variables.isApproved ? 'Opinia jest widoczna przy kursie' : 'Opinia została ukryta'); },
    onError: () => toast.error('Nie udało się zmienić widoczności opinii'),
  });

  return <div className="space-y-6">
    <section className="academy-inbox-intro"><div><p className="academy-kicker">Wiarygodność Akademii</p><h1>Moderacja opinii</h1><p>Publikuj wyłącznie autentyczne opinie osób, które ukończyły dany kurs. System weryfikuje ukończenie przed wysłaniem recenzji.</p></div><MessageSquareQuote /></section>
    {isLoading ? <p>Ładujemy opinie…</p> : error ? <p>Nie udało się pobrać opinii.</p> : !(reviews as any[]).length ? <div className="rounded-xl border bg-card p-8 text-center">Nie ma jeszcze opinii do moderacji.</div> : <div className="grid gap-4">{(reviews as any[]).map(review => <article key={review.id} className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p><h2 className="font-semibold">{review.course.title}</h2><p className="text-xs text-muted-foreground">{review.user.name || review.user.email} · {new Date(review.createdAt).toLocaleDateString('pl-PL')}</p></div><span className={`rounded-full px-3 py-1 text-xs ${review.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{review.isApproved ? 'Opublikowana' : 'Oczekuje'}</span></div><p className="my-4 whitespace-pre-wrap text-sm">{review.content}</p><div className="flex gap-2"><button className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white" disabled={moderate.isPending || review.isApproved} onClick={() => moderate.mutate({ id: review.id, isApproved: true })}><Check className="h-4 w-4" />Opublikuj</button><button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" disabled={moderate.isPending || !review.isApproved} onClick={() => moderate.mutate({ id: review.id, isApproved: false })}><X className="h-4 w-4" />Ukryj</button></div></article>)}</div>}
  </div>;
}

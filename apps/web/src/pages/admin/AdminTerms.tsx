import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AdminTerms = () => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [cancellationNoticeHours, setCancellationNoticeHours] = useState(24);

  const { data, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const res = await api.get('/terms');
      return res.data.data.terms;
    },
  });

  useEffect(() => {
    if (data) {
      setContent(data.content);
      setVersion(data.version);
      setCancellationNoticeHours(data.cancellationNoticeHours ?? 24);
    }
  }, [data]);

  const { mutate: saveTerms, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.put('/terms', { content, version, cancellationNoticeHours });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Regulamin został zaktualizowany.');
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
    onError: () => {
      toast.error('Nie udało się zapisać regulaminu.');
    },
  });

  return (
    <div className="space-y-6 animate-enter">
      <h1 className="text-3xl font-heading font-bold text-primary">Regulamin</h1>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Edytor regulaminu</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground animate-pulse">Wczytywanie...</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground w-16">Wersja</label>
                <Input
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  className="w-32"
                  placeholder="np. 1.0"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="cancellation-notice-hours" className="text-sm font-medium text-muted-foreground">
                  Minimalny czas na wniosek o anulowanie
                </label>
                <Input
                  id="cancellation-notice-hours"
                  type="number"
                  min={1}
                  max={168}
                  value={cancellationNoticeHours}
                  onChange={(event) => setCancellationNoticeHours(Number(event.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">godz.</span>
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={40}
                className="w-full rounded-lg border border-border bg-muted/10 p-4 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Treść regulaminu..."
              />

              <div className="flex justify-end">
                <Button onClick={() => saveTerms()} disabled={isPending} className="font-semibold">
                  {isPending ? 'Zapisywanie...' : 'Zapisz regulamin'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

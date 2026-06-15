import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationsApi, ConsultationLead } from '@/api/consultations.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Phone, Mail, Copy, Check, Trash2 } from 'lucide-react';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminConsultations = () => {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const queryClient = useQueryClient();

  const { data: activeLeads = [], isLoading: loadingActive } = useQuery({
    queryKey: ['admin', 'consultations', 'active'],
    queryFn: consultationsApi.getActive,
  });

  const { data: archivedLeads = [], isLoading: loadingArchived } = useQuery({
    queryKey: ['admin', 'consultations', 'archived'],
    queryFn: consultationsApi.getArchived,
  });

  const markContactedMutation = useMutation({
    mutationFn: consultationsApi.markContacted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'consultations'] });
      toast.success('Oznaczono jako zadzwoniono');
    },
    onError: () => toast.error('Nie udało się zaktualizować'),
  });

  const deleteMutation = useMutation({
    mutationFn: consultationsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'consultations'] });
      toast.success('Usunięto zgłoszenie');
    },
    onError: () => toast.error('Nie udało się usunąć'),
  });

  const copyAllPhones = () => {
    if (archivedLeads.length === 0) return;
    const phones = archivedLeads.map((l) => l.phone).join('\n');
    navigator.clipboard.writeText(phones).then(() => {
      toast.success(`Skopiowano ${archivedLeads.length} numerów`);
    });
  };

  const LeadCard = ({ lead, isArchived }: { lead: ConsultationLead; isArchived: boolean }) => (
    <div className="bg-card border rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-base">{lead.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zgłoszenie: {formatDate(lead.createdAt)}
          </p>
          {isArchived && lead.contactedAt && (
            <p className="text-xs text-muted-foreground">
              Kontakt: {formatDate(lead.contactedAt)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isArchived && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => markContactedMutation.mutate(lead.id)}
              disabled={markContactedMutation.isPending}
            >
              <Check size={14} />
              Zadzwoniłam
            </Button>
          )}
          {isArchived && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => deleteMutation.mutate(lead.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={`tel:${lead.phone}`}
          className="flex items-center gap-1.5 text-primary hover:underline font-medium"
        >
          <Phone size={14} />
          {lead.phone}
        </a>
        <a
          href={`mailto:${lead.email}`}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Mail size={14} />
          {lead.email}
        </a>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold">Konsultacje</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('active')}
        >
          Nowe
          {activeLeads.length > 0 && (
            <span className="ml-2 bg-primary text-white text-xs rounded-full px-1.5 py-0.5">
              {activeLeads.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'archived'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('archived')}
        >
          Archiwum
        </button>
      </div>

      {tab === 'active' && (
        <div className="flex flex-col gap-3">
          {loadingActive ? (
            <p className="text-muted-foreground text-sm">Ładowanie...</p>
          ) : activeLeads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">Brak nowych zgłoszeń</p>
              <p className="text-sm mt-1">Wszystkie konsultacje zostały obsłużone.</p>
            </div>
          ) : (
            activeLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} isArchived={false} />
            ))
          )}
        </div>
      )}

      {tab === 'archived' && (
        <div className="flex flex-col gap-3">
          {archivedLeads.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={copyAllPhones}>
                <Copy size={14} />
                Kopiuj wszystkie numery ({archivedLeads.length})
              </Button>
            </div>
          )}
          {loadingArchived ? (
            <p className="text-muted-foreground text-sm">Ładowanie...</p>
          ) : archivedLeads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">Archiwum jest puste</p>
            </div>
          ) : (
            archivedLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} isArchived={true} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

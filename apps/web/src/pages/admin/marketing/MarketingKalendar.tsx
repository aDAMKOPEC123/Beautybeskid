import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventDropArg } from '@fullcalendar/core';
import plLocale from '@fullcalendar/core/locales/pl';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { ContentEventCard } from '@/components/marketing/ContentEventCard';
import { ContentPostModal } from '@/components/marketing/ContentPostModal';
import type { ContentPost, SocialPlatform, ContentStatus } from '@/types/marketing.types';
import { PLATFORM_LABELS, STATUS_LABELS } from '@/types/marketing.types';

export const MarketingKalendar = () => {
  const qc = useQueryClient();
  const isMobile = window.innerWidth < 768;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | ''>('');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | ''>('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['marketing', 'posts'],
    queryFn: () => marketingApi.getPosts({}),
  });

  const filteredPosts = posts.filter(p => {
    if (filterPlatform && p.platform !== filterPlatform) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const events = filteredPosts.map(p => ({
    id: p.id,
    title: p.title,
    start: p.scheduledAt,
    extendedProps: p,
  }));

  const handleDrop = async (info: EventDropArg) => {
    try {
      await marketingApi.updatePost(info.event.id, {
        scheduledAt: info.event.start!.toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] });
    } catch {
      info.revert();
      toast.error('Nie udalo sie przeniesc publikacji');
    }
  };

  const handleEventClick = (info: any) => {
    const post = info.event.extendedProps as ContentPost;
    setEditingPost(post);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Kalendarz contentu</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value as SocialPlatform | '')}
            className="border rounded-md px-2 py-1.5 text-sm bg-background"
          >
            <option value="">Wszystkie platformy</option>
            {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(p => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ContentStatus | '')}
            className="border rounded-md px-2 py-1.5 text-sm bg-background"
          >
            <option value="">Wszystkie statusy</option>
            {(Object.keys(STATUS_LABELS) as ContentStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingPost(null); setModalOpen(true); }}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Dodaj
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Ladowanie...</div>
      ) : (
        <div className="bg-card rounded-xl border p-2 overflow-hidden">
          <FullCalendar
            plugins={[timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
            editable={true}
            locale={plLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isMobile ? 'listWeek,timeGridWeek' : 'timeGridWeek,listWeek',
            }}
            buttonText={{
              today: 'Dzis',
              week: 'Tydzien',
              list: 'Lista',
            }}
            events={events}
            eventContent={(arg) => <ContentEventCard eventArg={arg} />}
            eventDrop={handleDrop}
            eventClick={handleEventClick}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
          />
        </div>
      )}

      <ContentPostModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPost(null); }}
        post={editingPost}
      />
    </div>
  );
};

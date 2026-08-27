import { useEffect } from 'react';
import { EventInput } from '@fullcalendar/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import externalCalendarApi from '@/api/external-calendar.api';
import { useSocket } from '@/hooks/useSocket';

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
  employees: any[];
  isResourceView: boolean;
  enabled: boolean;
  children: (events: EventInput[]) => React.ReactNode;
}

export function AppleCalendarOverlay({
  rangeStart, rangeEnd, employees, isResourceView, enabled, children,
}: Props) {
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data: raw = [] } = useQuery({
    queryKey: ['external-calendar-events', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () => externalCalendarApi.listEvents(rangeStart.toISOString(), rangeEnd.toISOString()),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  // Po zakończonej synchronizacji w tle serwer wysyła sygnał do pokoju admin:global.
  useEffect(() => {
    const onUpdated = () => qc.invalidateQueries({ queryKey: ['external-calendar-events'] });
    socket.on('external-calendar:updated', onUpdated);
    return () => { socket.off('external-calendar:updated', onUpdated); };
  }, [socket, qc]);

  const events: EventInput[] = enabled
    ? raw.flatMap((ev) => {
        const base = {
          // FullCalendar v6 nie renderuje własnej treści z eventContent dla zdarzeń
          // 'background' — bez tytułu wydarzenia Apple byłyby tylko szarymi prostokątami.
          // Wzorem Happy Hours używamy 'auto' z przezroczystym tłem i blado-szarym
          // stylem w eventContent, żeby zachować stonowany wygląd.
          title: ev.title,
          start: ev.startsAt,
          end: ev.endsAt,
          display: 'auto' as const,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          extendedProps: { appleEventId: ev.id, title: ev.title },
        };
        // W widoku zasobów event bez resourceId nie zostanie wyrysowany —
        // powielamy go na wszystkie kolumny pracowników.
        if (!isResourceView) return [{ ...base, id: `apple-${ev.id}` }];
        return employees.map((emp: any) => ({
          ...base,
          id: `apple-${ev.id}-${emp.id}`,
          resourceId: emp.id,
        }));
      })
    : [];

  return <>{children(events)}</>;
}

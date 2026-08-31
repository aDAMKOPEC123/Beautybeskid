import { useEffect, useMemo } from 'react';
import { EventInput } from '@fullcalendar/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import externalCalendarApi from '@/api/external-calendar.api';
import { useSocket } from '@/hooks/useSocket';
import type { CalendarBlock } from '@/api/calendar-blocks.api';
import { splitByDay, isCoveredByBlock } from './appleCoverage';

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
  employees: any[];
  isResourceView: boolean;
  enabled: boolean;
  blocks: CalendarBlock[];
  children: (events: EventInput[]) => React.ReactNode;
}

export function AppleCalendarOverlay({
  rangeStart, rangeEnd, employees, isResourceView, enabled, blocks, children,
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

  const events: EventInput[] = useMemo(() => {
    if (!enabled) return [];
    return raw.flatMap((ev) => {
      // Wydarzenie wielodniowe rozpada się na kawałki dobowe: każdy dzień dostaje
      // własny kafel i własny badge, a kafel zna przycięte do doby godziny —
      // dzięki temu modal blokady nie musi zgadywać, w który dzień kliknięto.
      const chunks = splitByDay(new Date(ev.startsAt), new Date(ev.endsAt));
      return chunks.flatMap((chunk, dayIndex) => {
        const base = {
          // display:'background' renderuje event jako tło, niezaznaczalne i nieblokujące
          // kliknięć/układu kolumny (w przeciwieństwie do 'auto', które współdzieli
          // szerokość kolumny z wizytami/blokadami i łapie dateClick/select). FullCalendar v6
          // mimo to stosuje eventContent do zdarzeń tła (BgEvent renderuje przez
          // EventContainer z customGenerator: options.eventContent), więc tytuł i badge
          // się pokażą.
          title: ev.title,
          start: chunk.start,
          end: chunk.end,
          display: 'background' as const,
          classNames: ['cosmo-apple-event'],
          extendedProps: {
            appleEventId: ev.id,
            title: ev.title,
            appleStart: chunk.start,
            appleEnd: chunk.end,
            appleTitle: ev.title,
            appleCovered: isCoveredByBlock(chunk, blocks),
          },
        };
        // W widoku zasobów event bez resourceId nie zostanie wyrysowany —
        // powielamy go na wszystkie kolumny pracowników.
        if (!isResourceView) return [{ ...base, id: `apple-${ev.id}-${dayIndex}` }];
        return employees.map((emp: any) => ({
          ...base,
          id: `apple-${ev.id}-${dayIndex}-${emp.id}`,
          resourceId: emp.id,
        }));
      });
    });
  }, [enabled, raw, blocks, isResourceView, employees]);

  return <>{children(events)}</>;
}

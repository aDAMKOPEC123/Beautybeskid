import type { EventContentArg } from '@fullcalendar/core';
import { PLATFORM_COLORS, STATUS_COLORS, FORMAT_LABELS, STATUS_LABELS } from '@/types/marketing.types';
import type { ContentPost } from '@/types/marketing.types';

interface Props {
  eventArg: EventContentArg;
}

export const ContentEventCard = ({ eventArg }: Props) => {
  const post = eventArg.event.extendedProps as ContentPost;
  const bgColor = PLATFORM_COLORS[post.platform] ?? '#6b7280';
  const statusColor = STATUS_COLORS[post.status] ?? '#94a3b8';
  const timeStr = eventArg.event.start
    ? new Date(eventArg.event.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderLeft: `4px solid ${statusColor}`,
      }}
      className="rounded-md px-2 py-1 h-full overflow-hidden cursor-pointer"
    >
      <div className="font-semibold text-white text-[11px] leading-tight truncate">
        {eventArg.event.title}
      </div>
      <div className="text-white/80 text-[10px] mt-0.5">
        {post.platform} {post.format ? FORMAT_LABELS[post.format] : ''} {timeStr && `• ${timeStr}`}
      </div>
      <span
        style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        className="inline-block text-white text-[9px] px-1 py-0.5 rounded mt-1"
      >
        {STATUS_LABELS[post.status]}
      </span>
    </div>
  );
};

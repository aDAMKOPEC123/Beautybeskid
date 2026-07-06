// filepath: apps/web/src/components/chat/ChatMessage.tsx
import React from 'react';
import { ChatMessagePayload } from '@cosmo/shared';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessagePayload;
  isOwn: boolean;
  showNewMarker?: boolean;
  showAvatar?: boolean;
  dateLabel?: string | null;
}

function Avatar({ name, avatarPath }: { name?: string; avatarPath?: string | null }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (avatarPath) {
    return (
      <img
        src={avatarPath}
        alt={name}
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function renderWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 break-all hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}

export const ChatMessage = ({ message, isOwn, showNewMarker, showAvatar = true, dateLabel }: ChatMessageProps) => {
  const isRead = message.readAt != null;
  const senderName = message.sender?.name;
  const avatarPath = message.sender?.avatarPath;

  return (
    <>
      {dateLabel && (
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
          <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: 'rgba(20,40,28,0.45)' }}>
            {dateLabel}
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
        </div>
      )}

      {showNewMarker && (
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            — Nowe wiadomości —
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      <div className={cn('flex gap-2 max-w-[85%] sm:max-w-[75%]', isOwn ? 'self-end flex-row-reverse' : 'self-start flex-row')}>
        {/* Avatar — only rendered on last message in a group */}
        <div className="mt-auto mb-4 w-9 shrink-0">
          {showAvatar ? (
            <Avatar name={senderName} avatarPath={avatarPath} />
          ) : null}
        </div>

        {/* Bubble */}
        <div className={cn('flex flex-col min-w-0', isOwn ? 'items-end' : 'items-start')}>
          {senderName && !isOwn && showAvatar && (
            <span className="text-[11px] text-muted-foreground font-medium px-1 mb-0.5">
              {senderName}
            </span>
          )}

          <div
            className={cn(
              'px-3 py-2 rounded-2xl text-sm min-w-0',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm'
                : 'bg-muted rounded-tl-sm border'
            )}
          >
            {message.attachmentType === 'image' && message.attachmentUrl && (
              <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.attachmentUrl}
                  alt="zalacznik"
                  className="max-w-full max-h-64 rounded-lg mb-1 object-cover"
                />
              </a>
            )}
            {message.attachmentType === 'video' && message.attachmentUrl && (
              <video
                src={message.attachmentUrl}
                controls
                className="max-w-full max-h-64 rounded-lg mb-1"
              />
            )}
            {message.content && <span className="break-words">{renderWithLinks(message.content)}</span>}
          </div>

          <div className="flex items-center gap-1 mt-0.5 px-1">
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {isOwn && (
              isRead
                ? <CheckCheck size={13} className="text-primary" />
                : <Check size={13} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

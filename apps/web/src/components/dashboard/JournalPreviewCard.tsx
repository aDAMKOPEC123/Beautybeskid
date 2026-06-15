import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BookOpen, Plus } from 'lucide-react';
import { skinJournalApi } from '@/api/skin-journal.api';

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };

export const JournalPreviewCard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['skin-journal', 'preview'],
    queryFn: () => skinJournalApi.getJournal(1),
    staleTime: 60_000,
  });

  const latest = data?.entries?.[0] ?? null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
              background: 'rgba(26,56,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={15} style={{ color: '#1A3828' }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A3828' }}>Dziennik skóry</p>
          </div>
          <Link
            to="/user/dziennik"
            style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)', textDecoration: 'none' }}
          >
            Zobacz wszystkie →
          </Link>
        </div>

        {isLoading ? (
          <div style={{ height: '48px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', animation: 'pulse 1.5s infinite' }} />
        ) : latest ? (
          <div style={{
            background: 'rgba(26,56,40,0.03)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>{MOOD_EMOJI[latest.mood ?? 3]}</span>
              <span style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)' }}>
                {format(new Date(latest.date), 'd MMMM', { locale: pl })}
              </span>
              {latest.tags.length > 0 && (
                <span style={{
                  fontSize: '10px', color: '#5A7A62', background: 'rgba(90,122,98,0.1)',
                  padding: '2px 7px', borderRadius: '100px',
                }}>
                  {latest.tags[0]}
                </span>
              )}
            </div>
            {latest.notes && (
              <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.6)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {latest.notes}
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.4)', lineHeight: 1.5, marginBottom: '12px' }}>
            Zacznij notować stan swojej skóry — kosmetolożka może dodawać komentarze do Twoich wpisów.
          </p>
        )}

        <Link
          to="/user/dziennik"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 0', borderRadius: '100px',
            border: '1px solid rgba(26,56,40,0.15)', color: '#1A3828',
            fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          <Plus size={13} />
          Dodaj wpis
        </Link>
      </div>
    </div>
  );
};

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Send, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { skinJournalApi, type SkinJournalEntry } from '@/api/skin-journal.api';

const MOODS: string[] = ['😟', '😕', '😐', '🙂', '😊'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CommentSection({ entry, userId }: { entry: SkinJournalEntry; userId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const qc = useQueryClient();

  const addComment = useMutation({
    mutationFn: () => skinJournalApi.addComment(entry.id, text.trim()),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['admin-journal', userId] });
      toast.success('Komentarz dodany');
    },
  });

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Komentarze ({entry.comments.length})
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-border">
          {entry.comments.map(c => (
            <div key={c.id} className="text-xs bg-muted/40 rounded p-2">
              <span className="font-medium">{c.author?.name ?? 'Admin'}:</span>{' '}
              <span>{c.content}</span>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Dodaj komentarz..."
              className="flex-1 text-xs border rounded px-2 py-1 bg-background"
              onKeyDown={e => { if (e.key === 'Enter' && text.trim()) addComment.mutate(); }}
            />
            <button
              onClick={() => { if (text.trim()) addComment.mutate(); }}
              disabled={!text.trim() || addComment.isPending}
              className="p-1 rounded text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserJournalProps {
  userId: string;
  userName: string;
}

export function UserJournal({ userId, userName }: UserJournalProps) {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-journal', userId, page],
    queryFn: () => skinJournalApi.adminGetJournal(userId, page),
  });

  const createEntry = useMutation({
    mutationFn: () =>
      skinJournalApi.adminCreateEntry(userId, {
        notes: newNotes.trim() || undefined,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
        photo: newPhoto ?? undefined,
      }),
    onSuccess: () => {
      setNewNotes('');
      setNewTags('');
      setNewPhoto(null);
      setPhotoPreview(null);
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-journal', userId] });
      toast.success('Wpis dodany');
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setNewPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) => skinJournalApi.adminDeleteEntry(userId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-journal', userId] });
      toast.success('Wpis usunięty');
    },
  });

  const entries: SkinJournalEntry[] = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Dziennik kosmetologa — {userName}
        </p>
        <button
          onClick={() => setAddOpen(v => !v)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {addOpen ? <X size={13} /> : <Plus size={13} />}
          {addOpen ? 'Anuluj' : 'Dodaj wpis'}
        </button>
      </div>

      {addOpen && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
          <textarea
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            placeholder="Notatki kosmetologa..."
            rows={3}
            className="w-full text-sm border rounded px-3 py-2 bg-background resize-none"
          />
          <input
            value={newTags}
            onChange={e => setNewTags(e.target.value)}
            placeholder="Tagi (np. twarz, stopy) — rozdziel przecinkami"
            className="w-full text-sm border rounded px-3 py-2 bg-background"
          />
          {/* Zdjęcie */}
          <div className="space-y-2">
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Podgląd" className="rounded-md max-h-40 object-cover" loading="lazy" />
                <button
                  onClick={removePhoto}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2 hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus size={14} />
                Dodaj zdjęcie
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <button
            onClick={() => createEntry.mutate()}
            disabled={createEntry.isPending}
            className="text-xs px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createEntry.isPending ? 'Zapisywanie...' : 'Zapisz wpis'}
          </button>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground py-4 text-center">Ładowanie...</p>
      )}

      {!isLoading && entries.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">Brak wpisów w dzienniku.</p>
      )}

      {entries.map(entry => (
        <div key={entry.id} className="border rounded-lg p-4 bg-background space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
              {entry.mood != null && (
                <span className="text-base" title={`Nastrój: ${entry.mood}/5`}>
                  {MOODS[entry.mood - 1]}
                </span>
              )}
              {entry.isAdminEntry && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  Wpis kosmetologa
                </span>
              )}
              {entry.tags.map(tag => (
                <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                if (confirm('Usunąć wpis?')) deleteEntry.mutate(entry.id);
              }}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {entry.photoPath && (
            <img
              src={entry.photoPath}
              alt="Zdjęcie do wpisu"
              className="rounded-md max-h-40 object-cover"
              loading="lazy"
            />
          )}

          {entry.notes && (
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.notes}</p>
          )}

          <CommentSection entry={entry} userId={userId} />
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

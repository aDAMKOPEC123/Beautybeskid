// filepath: apps/web/src/components/chat/ChatInput.tsx
import { useState, KeyboardEvent, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Send, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string, file?: File) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, onTyping, disabled }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [content, autoResize]);

  const handleSend = () => {
    if (!content.trim() && !selectedFile) return;
    onSend(content, selectedFile ?? undefined);
    setContent('');
    clearFile();
    onTyping(false);
    // Reset textarea height after clearing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-col gap-2">
      {selectedFile && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
          {previewUrl ? (
            <img src={previewUrl} alt="podglad" className="w-12 h-12 object-cover rounded" loading="lazy" />
          ) : (
            <span className="text-muted-foreground truncate max-w-[200px]">{selectedFile.name}</span>
          )}
          <button
            onClick={clearFile}
            className="ml-auto min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground"
        >
          <Paperclip size={20} />
        </Button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomosc..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 leading-snug"
          style={{ maxHeight: 120 }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || (!content.trim() && !selectedFile)}
          className="shrink-0 min-w-[44px] min-h-[44px] bg-primary hover:bg-primary/90 text-white rounded-full transition-transform active:scale-95"
        >
          <Send size={18} className="-ml-0.5" />
        </Button>
      </div>
    </div>
  );
};

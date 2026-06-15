// filepath: apps/web/src/components/chat/ChatInput.tsx
import { useState, KeyboardEvent, useRef } from 'react';
import { Button } from '../ui/button';
import { Send, Paperclip, X } from 'lucide-react';
import { Input } from '../ui/input';

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

  const handleSend = () => {
    if (!content.trim() && !selectedFile) return;
    onSend(content, selectedFile ?? undefined);
    setContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
    onTyping(false);
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
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {selectedFile && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
          {previewUrl ? (
            <img src={previewUrl} alt="podgląd" className="w-12 h-12 object-cover rounded" loading="lazy" />
          ) : (
            <span className="text-muted-foreground truncate max-w-[200px]">{selectedFile.name}</span>
          )}
          <button onClick={clearFile} className="ml-auto text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-2 items-center">
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
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Paperclip size={18} />
        </Button>
        <Input
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomość..."
          className="flex-1 bg-background"
          disabled={disabled}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || (!content.trim() && !selectedFile)}
          className="shrink-0 bg-primary hover:bg-primary/90 text-white rounded-full transition-transform active:scale-95"
        >
          <Send size={16} className="-ml-1" />
        </Button>
      </div>
    </div>
  );
};

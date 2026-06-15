// filepath: apps/web/src/components/shared/ImageUpload.tsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { UploadCloud, X } from 'lucide-react';

interface Props {
  value?: File | null;
  onChange: (file: File | null) => void;
  currentImage?: string;
  label?: string;
}

export const ImageUpload = ({ onChange, currentImage, label = "Wybierz zdjęcie" }: Props) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Plik jest za duży. Maksymalnie 5MB.');
        return;
      }
      onChange(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const clear = () => {
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {preview ? (
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border shadow-sm group">
          <img src={preview} alt="Preview" className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="destructive" className="rounded-full shadow-lg" onClick={clear}>
              <X size={16} className="mr-2" /> Usuń
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/50 hover:border-primary transition-all duration-300">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-primary/70" />
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-primary">Kliknij</span> wgrać plik (Max 5MB)</p>
          </div>
          <input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
};

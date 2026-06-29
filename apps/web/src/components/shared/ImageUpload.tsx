import { useEffect, useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  value?: File | null;
  onChange: (file: File | null) => void;
  currentImage?: string;
  label?: string;
}

export const ImageUpload = ({ value, onChange, currentImage, label = 'Wybierz zdjęcie' }: Props) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) return;

    setPreview((previous) => {
      const nextPreview = currentImage || null;
      if (previous === nextPreview) return previous;
      if (previous && previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      return nextPreview;
    });
  }, [currentImage, value]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Plik jest za duży. Maksymalnie 5 MB.');
      return;
    }

    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    onChange(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const clear = () => {
    onChange(null);
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(currentImage || null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {preview ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded-xl border shadow-sm">
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="destructive" className="rounded-full shadow-lg" onClick={clear}>
              <X size={16} className="mr-2" />
              Usuń
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 transition-all duration-300 hover:border-primary hover:bg-muted/50">
          <div className="flex flex-col items-center justify-center pb-6 pt-5">
            <UploadCloud className="mb-3 h-10 w-10 text-primary/70" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Kliknij</span> wgrać plik (max 5 MB)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
};

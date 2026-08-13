import { useRef } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { CropAspect } from '@/components/ImageCropDialog';

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder: 'academy-courses' | 'academy-instructors';
  aspect: CropAspect;
  previewShape: 'wide' | 'circle';
}

export function ImageUploadField({ label, hint, value, onChange, folder, aspect, previewShape }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { pick, dialog, uploading, error } = useImageUpload({
    folder, aspect, lockAspect: true, onUploaded: onChange,
  });

  return (
    <div className="image-upload-field">
      <span className="image-upload-label">{label}</span>

      <div className={`image-upload-preview ${previewShape}`}>
        {value
          ? <img src={value} alt="" />
          : <span className="image-upload-empty"><ImagePlus /><small>Brak zdjęcia</small></span>}
      </div>

      <div className="image-upload-actions">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="spin" />Wgrywanie…</> : <><ImagePlus />{value ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}</>}
        </button>
        {value && (
          <button type="button" className="ghost" onClick={() => onChange('')} disabled={uploading}>
            <Trash2 />Usuń
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={pick} hidden />
      {hint && <small className="image-upload-hint">{hint}</small>}
      {error && <small className="image-upload-error" role="alert">{error}</small>}
      {dialog}
    </div>
  );
}

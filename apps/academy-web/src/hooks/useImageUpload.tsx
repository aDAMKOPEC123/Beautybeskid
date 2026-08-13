import { useCallback, useState } from 'react';
import { academyApi } from '@/api/academy.api';
import { canDecodeImage } from '@/lib/cropImage';
import { uploadErrorMessage } from '@/lib/uploadErrorMessage';
import { ImageCropDialog, type CropAspect } from '@/components/ImageCropDialog';

interface UseImageUploadOptions {
  folder: 'academy-lessons' | 'academy-courses' | 'academy-instructors';
  aspect: CropAspect;
  lockAspect?: boolean;
  onUploaded: (url: string) => void | Promise<void>;
}

const HEIC_NOTICE = 'Tego formatu nie da się wykadrować w przeglądarce — zdjęcie zostało wgrane w całości. '
  + 'Aby je przyciąć, zapisz je najpierw jako JPG.';

export function useImageUpload({ folder, aspect, lockAspect, onUploaded }: UseImageUploadOptions) {
  const [pending, setPending] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /** Zwraca komunikat błędu albo `null` przy powodzeniu — zamiast połykać
   *  niepowodzenie. Dzięki temu okno kadrowania wie, że wysyłka się nie udała:
   *  odblokowuje przyciski i pokazuje błąd u siebie, a kadr zostaje na miejscu
   *  i można spróbować ponownie. */
  const send = useCallback(async (payload: Blob): Promise<string | null> => {
    setUploading(true);
    try {
      const { url } = await academyApi.adminUploadLessonImage(payload, folder);
      await onUploaded(url);
      setPending(null);
      setError('');
      return null;
    } catch (cause) {
      return uploadErrorMessage(cause);
    } finally {
      setUploading(false);
    }
  }, [folder, onUploaded]);

  /** Podepnij pod onChange elementu <input type="file">. */
  const pick = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');

    if (await canDecodeImage(file)) {
      setPending(file);
      return;
    }

    // Zdjęcia HEIC z iPhone'a nie dekodują się w przeglądarkach na Windowsie,
    // ale sharp po stronie serwera je obsłuży. Lepiej wgrać bez kadru niż wcale.
    // Wyjaśnienie ustawiamy dopiero po wysyłce, żeby nie zniknęło razem
    // z czyszczeniem stanu błędu.
    const failure = await send(file);
    setError(failure ?? '');
    setNotice(failure ? '' : HEIC_NOTICE);
  }, [send]);

  /** Otwiera kadrowanie dla obrazu, który jest już na serwerze. */
  const pickFor = useCallback(async (url: string) => {
    if (!url) return;
    setError('');
    setNotice('');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('FETCH_FAILED');
      const blob = await response.blob();
      setPending(new File([blob], 'kadr.webp', { type: blob.type || 'image/webp' }));
    } catch {
      setError('Nie udało się wczytać tego zdjęcia do ponownego kadrowania.');
    }
  }, []);

  const dialog = pending
    ? <ImageCropDialog file={pending} aspect={aspect} lockAspect={lockAspect}
        onCancel={() => setPending(null)} onConfirm={send} />
    : null;

  return { pick, pickFor, dialog, uploading, error, notice };
}

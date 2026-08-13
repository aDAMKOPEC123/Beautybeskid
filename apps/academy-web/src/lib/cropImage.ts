export interface CropAreaPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelCrop {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** react-easy-crop podaje obszar w procentach. Przeliczamy go na piksele
 *  źródłowe i przycinamy do granic obrazu, żeby drawImage nigdy nie dostał
 *  obszaru wychodzącego poza źródło. */
export function cropAreaToPixels(area: CropAreaPercent, natural: { width: number; height: number }): PixelCrop {
  const left = Math.min(natural.width - 1, Math.max(0, Math.round((area.x / 100) * natural.width)));
  const top = Math.min(natural.height - 1, Math.max(0, Math.round((area.y / 100) * natural.height)));
  const width = Math.max(1, Math.min(natural.width - left, Math.round((area.width / 100) * natural.width)));
  const height = Math.max(1, Math.min(natural.height - top, Math.round((area.height / 100) * natural.height)));
  return { left, top, width, height };
}

/** Przeglądarki na Windowsie nie dekodują HEIC z iPhone'a. Sprawdzamy to
 *  zawczasu, żeby zamiast pustego okna kadrowania pokazać ścieżkę zapasową. */
export async function canDecodeImage(file: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

export async function cropFileToBlob(file: Blob, area: CropAreaPercent): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('DECODE_FAILED');
  }

  try {
    const { left, top, width, height } = cropAreaToPixels(area, { width: bitmap.width, height: bitmap.height });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('DECODE_FAILED');
    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('DECODE_FAILED'))),
        'image/webp',
        0.9,
      );
    });
  } finally {
    bitmap.close();
  }
}

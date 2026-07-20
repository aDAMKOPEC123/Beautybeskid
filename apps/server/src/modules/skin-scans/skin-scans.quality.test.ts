import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { assessSkinScanImage } from './skin-scans.quality';

describe('skin scan image quality', () => {
  it('odrzuca obraz o zbyt małej rozdzielczości', async () => {
    const buffer = await sharp({
      create: { width: 320, height: 320, channels: 3, background: '#808080' },
    }).png().toBuffer();

    const result = await assessSkinScanImage(buffer);

    expect(result.quality.passed).toBe(false);
    expect(result.quality.issues.some((item) => item.code === 'RESOLUTION_TOO_LOW')).toBe(true);
  });

  it('wykrywa silnie niedoświetlony obraz', async () => {
    const buffer = await sharp({
      create: { width: 800, height: 800, channels: 3, background: '#050505' },
    }).png().toBuffer();

    const result = await assessSkinScanImage(buffer);

    expect(result.quality.issues.some((item) => item.code === 'TOO_DARK')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { cropAreaToPixels } from './cropImage';

const natural = { width: 4000, height: 3000 };

describe('cropAreaToPixels', () => {
  it('przelicza procenty na piksele źródłowe', () => {
    expect(cropAreaToPixels({ x: 25, y: 10, width: 50, height: 40 }, natural))
      .toEqual({ left: 1000, top: 300, width: 2000, height: 1200 });
  });

  it('cały obraz daje pełne wymiary', () => {
    expect(cropAreaToPixels({ x: 0, y: 0, width: 100, height: 100 }, natural))
      .toEqual({ left: 0, top: 0, width: 4000, height: 3000 });
  });

  it('zaokrągla ułamki pikseli', () => {
    const result = cropAreaToPixels({ x: 33.333, y: 0, width: 33.333, height: 100 }, natural);
    expect(Number.isInteger(result.left)).toBe(true);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(result.left).toBe(1333);
  });

  it('nie wychodzi poza prawą i dolną krawędź obrazu', () => {
    const result = cropAreaToPixels({ x: 90, y: 90, width: 50, height: 50 }, natural);
    expect(result.left + result.width).toBeLessThanOrEqual(natural.width);
    expect(result.top + result.height).toBeLessThanOrEqual(natural.height);
  });

  it('obcina ujemne przesunięcia do zera', () => {
    const result = cropAreaToPixels({ x: -10, y: -5, width: 50, height: 50 }, natural);
    expect(result.left).toBe(0);
    expect(result.top).toBe(0);
  });

  it('zawsze zwraca co najmniej jeden piksel', () => {
    const result = cropAreaToPixels({ x: 0, y: 0, width: 0, height: 0 }, natural);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('radzi sobie z obrazem mniejszym niż ramka kadru', () => {
    const result = cropAreaToPixels({ x: 0, y: 0, width: 100, height: 100 }, { width: 20, height: 15 });
    expect(result).toEqual({ left: 0, top: 0, width: 20, height: 15 });
  });
});

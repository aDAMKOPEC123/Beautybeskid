import { describe, expect, it } from 'vitest';
import { resolveUploadFolder } from './lessons.controller';

describe('resolveUploadFolder', () => {
  it('przepuszcza foldery z białej listy', () => {
    expect(resolveUploadFolder('academy-lessons')).toBe('academy-lessons');
    expect(resolveUploadFolder('academy-courses')).toBe('academy-courses');
    expect(resolveUploadFolder('academy-instructors')).toBe('academy-instructors');
  });

  it('wraca do folderu lekcji, gdy pola nie ma', () => {
    expect(resolveUploadFolder(undefined)).toBe('academy-lessons');
    expect(resolveUploadFolder('')).toBe('academy-lessons');
  });

  it('odrzuca próbę wyjścia poza katalog uploadów', () => {
    expect(resolveUploadFolder('../../etc')).toBe('academy-lessons');
    expect(resolveUploadFolder('academy-lessons/../../etc')).toBe('academy-lessons');
    expect(resolveUploadFolder('/absolute/path')).toBe('academy-lessons');
  });

  it('odrzuca wartości, które nie są tekstem', () => {
    expect(resolveUploadFolder({ toString: () => 'academy-courses' })).toBe('academy-lessons');
    expect(resolveUploadFolder(['academy-courses'])).toBe('academy-lessons');
    expect(resolveUploadFolder(null)).toBe('academy-lessons');
  });
});

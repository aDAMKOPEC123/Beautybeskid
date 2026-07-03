// filepath: apps/server/src/utils/slug.ts
export const createSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

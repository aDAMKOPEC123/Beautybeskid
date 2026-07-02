export const getPanelPath = (role?: string | null) => {
  if (role === 'ADMIN') return '/admin';
  if (role === 'EMPLOYEE') return '/employee';
  return '/user';
};

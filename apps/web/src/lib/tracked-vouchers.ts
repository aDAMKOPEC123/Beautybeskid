export const TRACKED_VOUCHERS_STORAGE_KEY = 'cosmo_tracked_vouchers';

export function loadTrackedVoucherCodes(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(TRACKED_VOUCHERS_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    return [...new Set(
      stored.filter((code): code is string => typeof code === 'string' && Boolean(code.trim()))
    )];
  } catch {
    return [];
  }
}

export function saveTrackedVoucherCodes(codes: string[]): void {
  localStorage.setItem(TRACKED_VOUCHERS_STORAGE_KEY, JSON.stringify(codes));
}

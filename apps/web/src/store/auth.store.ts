// filepath: apps/web/src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@cosmo/shared';
import { clearDeviceToken } from '../lib/device-token';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      // Sieć bezpieczeństwa: każde zakończenie sesji — świadome wylogowanie,
      // ale i porzucenie sesji po nieudanym odświeżeniu — kasuje token
      // urządzenia. Bez tego pozostawiony token odtwarzałby sesję poprzedniego
      // użytkownika na współdzielonym urządzeniu (tablet w gabinecie).
      logout: () => {
        clearDeviceToken();
        set({ user: null, accessToken: null });
      },
      hydrate: () => set({ isLoading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false;
      },
    }
  )
);

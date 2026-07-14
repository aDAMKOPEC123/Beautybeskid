import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export type AcademyUser = { id: string; email: string; name: string; role: string; emailVerified: boolean };

interface AuthState {
  user: AcademyUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: AcademyUser | null) => void;
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
      logout: () => set({ user: null, accessToken: null }),
      hydrate: () => set({ isLoading: false }),
    }),
    {
      name: 'academy-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }) as AuthState,
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AuthState>), isLoading: true }),
      onRehydrateStorage: () => (state) => {
        // Keep protected queries paused until App verifies or clears the persisted token.
        if (state) state.isLoading = true;
      },
    }
  )
);

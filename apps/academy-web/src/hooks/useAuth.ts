import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const { user, accessToken, isLoading, setUser, setAccessToken, logout } = useAuthStore();
  // A persisted token is only trusted after the refresh request finishes.
  const isAuthenticated = !isLoading && !!accessToken && !!user;

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    setUser,
    setAccessToken,
    logout,
  };
};

import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const { user, accessToken, isLoading, setUser, setAccessToken, logout } = useAuthStore();
  const isAuthenticated = !!accessToken && !!user;

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

import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const { user, accessToken, isLoading, setUser, setAccessToken, logout } = useAuthStore();
  const isAuthenticated = !!accessToken && !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    isEmployee,
    isLoading,
    setUser,
    setAccessToken,
    logout,
  };
};

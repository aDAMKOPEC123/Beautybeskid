// filepath: apps/web/src/components/auth/GoogleAuthButton.tsx
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export const GoogleAuthButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setAccessToken } = useAuthStore();
  const from = (location.state as { from?: string } | null)?.from ?? '/user';
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Nie udało się zalogować przez Google');
      return;
    }
    try {
      const data = await authApi.loginWithGoogle(credentialResponse.credential);
      setUser(data.user);
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Błąd logowania przez Google';
      toast.error(message);
    }
  };

  if (!clientId) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Logowanie przez Google nie powiodło się')}
        useOneTap={false}
        width="100%"
        text="continue_with"
      />
    </GoogleOAuthProvider>
  );
};

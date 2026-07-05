import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { getPanelPath } from '@/lib/panel-routing';
import { PageSEO } from '@/components/shared/SEO';

const safeNextPath = (value: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

export const FacebookCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAccessToken, setUser } = useAuthStore();

  useEffect(() => {
    let active = true;

    authApi
      .refreshSession()
      .then(({ accessToken, user }) => {
        if (!active) return;
        setAccessToken(accessToken);
        setUser(user);
        toast.success('Zalogowano przez Facebook.');
        navigate(safeNextPath(searchParams.get('next')) ?? getPanelPath(user.role), {
          replace: true,
        });
      })
      .catch(() => {
        if (!active) return;
        navigate('/auth/login?facebookError=facebook-failed', { replace: true });
      });

    return () => {
      active = false;
    };
  }, [navigate, searchParams, setAccessToken, setUser]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <PageSEO title="Logowanie przez Facebook" description="Trwa logowanie." noIndex />
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-b-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Kończymy logowanie przez Facebook…</p>
      </div>
    </div>
  );
};

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { academyApi } from '@/api/academy.api';
import { useAuth } from '@/hooks/useAuth';

export function PaymentSuccess() {
  const [params] = useSearchParams(); const sessionId = params.get('session_id') || '';
  const { isAuthenticated, isLoading } = useAuth();
  const query = useQuery({ queryKey: ['academy', 'payment-status', sessionId], queryFn: () => academyApi.getOrderStatus(sessionId), enabled: Boolean(sessionId && isAuthenticated), refetchInterval: (state) => state.state.data?.status === 'PENDING' ? 1500 : false, retry: 3 });
  if (!sessionId) return <div className="academy-profile-empty"><XCircle /><h1>Brak danych płatności</h1><p>Ten adres nie zawiera identyfikatora zamówienia. Sprawdź historię zamówień na swoim profilu.</p><Link to="/profil">Przejdź do profilu</Link></div>;
  if (!isLoading && !isAuthenticated) return <Navigate to="/logowanie" state={{ from: `/platnosc/sukces?session_id=${encodeURIComponent(sessionId)}` }} replace />;
  if (query.isLoading || query.data?.status === 'PENDING') return <div className="academy-profile-empty" role="status"><Clock3 /><h1>Potwierdzamy płatność</h1><p>Czekamy na bezpieczne potwierdzenie operatora. Nie zamykaj tej strony — status odświeży się automatycznie.</p></div>;
  if (query.data?.status === 'PAID') return <div className="academy-profile-empty"><CheckCircle2 className="text-green-600" /><h1>Płatność potwierdzona</h1><p>Dostęp został nadany. Potwierdzenie zamówienia wysłaliśmy na Twój adres e-mail.</p><Link to="/moje-kursy">Przejdź do mojej nauki</Link></div>;
  return <div className="academy-profile-empty"><XCircle /><h1>Płatność nie została potwierdzona</h1><p>Status zamówienia: {query.data?.status || 'nieznany'}. Nie pokazujemy sukcesu bez potwierdzenia serwera.</p><Link to="/profil">Sprawdź zamówienia</Link></div>;
}

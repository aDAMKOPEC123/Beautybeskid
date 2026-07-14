import { AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function PaymentCancelled() {
  const [params] = useSearchParams();
  return <div className="academy-profile-empty"><AlertCircle className="text-amber-600" /><h1>Płatność nie została wykonana</h1><p>Nie pobraliśmy środków. Możesz wrócić do katalogu i ponowić zamówienie, gdy będziesz gotowa/y.</p>{params.get('order_id') && <small>Numer rozpoczętego zamówienia: {params.get('order_id')}</small>}<Link to="/">Wróć do katalogu</Link></div>;
}

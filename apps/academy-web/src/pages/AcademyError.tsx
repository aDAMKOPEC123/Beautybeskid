import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export function AcademyError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : 'Nie udało się wyświetlić tej części Akademii.';
  return <div className="academy-profile-empty"><AlertCircle /><h2>Coś poszło nie tak</h2><p>{message} Spróbuj odświeżyć stronę. Jeśli problem wróci, skontaktuj się z nami.</p><Link to="/">Wróć do Akademii</Link></div>;
}

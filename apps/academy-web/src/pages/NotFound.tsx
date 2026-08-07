import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { DocumentTitle } from '@/components/DocumentTitle';

export function NotFound() {
  return (
    <div className="academy-profile-empty">
      <DocumentTitle title="Nie znaleziono strony | Akademia BeskidStudio" />
      <Compass />
      <h2>Nie znaleźliśmy tej strony</h2>
      <p>Adres jest nieprawidłowy albo materiał został przeniesiony. Zajrzyj do katalogu kursów — na pewno coś tam na Ciebie czeka.</p>
      <Link to="/">Wróć do Akademii</Link>
    </div>
  );
}

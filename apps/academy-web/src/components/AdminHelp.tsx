import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

/**
 * Blok pomocy nad każdą zakładką panelu. Pisany prostym językiem, bez żargonu —
 * osoba uzupełniająca treści ma po przeczytaniu wiedzieć, co tu robi i od czego zacząć.
 */
export function AdminHelp({ title, children, steps }: { title: string; children: React.ReactNode; steps?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="admin-help">
      <div className="admin-help-main">
        <span className="admin-help-icon"><HelpCircle /></span>
        <div>
          <strong>{title}</strong>
          <p>{children}</p>
        </div>
        {steps && steps.length > 0 && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Ukryj instrukcję' : 'Jak to zrobić krok po kroku'}
            <ChevronDown className={open ? 'open' : ''} />
          </button>
        )}
      </div>
      {open && steps && (
        <ol className="admin-help-steps">
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      )}
    </section>
  );
}

/** Pole formularza z etykietą i jednozdaniową podpowiedzią pod spodem. */
export function HelpField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

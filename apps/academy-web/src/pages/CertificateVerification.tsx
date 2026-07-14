import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

export function CertificateVerification() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [value, setValue] = useState(code);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['academy', 'certificate-verification', code],
    queryFn: () => academyApi.verifyCertificate(code),
    enabled: !!code,
    retry: false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = value.trim();
    if (normalized) navigate(`/certyfikat/${encodeURIComponent(normalized)}`);
  };

  return <main className="academy-auth-page">
    <section className="academy-auth-card space-y-5">
      <Link to="/" className="academy-brand"><span className="academy-brand-mark"><Award /></span><span><strong>Akademia</strong><em>BeskidStudio</em></span></Link>
      <div><p className="academy-kicker text-caramel"><ShieldCheck /> Weryfikacja dokumentu</p><h1>Sprawdź certyfikat</h1><p>Wpisz kod znajdujący się na certyfikacie Akademii.</p></div>
      <form onSubmit={submit} className="space-y-3"><label className="block text-sm font-medium">Kod weryfikacyjny<input className="mt-1 w-full rounded-md border bg-background p-3" value={value} onChange={(e) => setValue(e.target.value)} maxLength={64} /></label><button className="academy-button academy-buy w-full" disabled={!value.trim()}><Search /> Sprawdź</button></form>
      {code && isLoading && <p>Sprawdzamy certyfikat…</p>}
      {code && isError && <div className="academy-empty"><Award /><h2>Nie znaleziono certyfikatu</h2><p>Sprawdź, czy kod został przepisany prawidłowo.</p></div>}
      {data && <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-950"><CheckCircle2 className="mb-2 text-green-600" /><h2 className="font-heading text-xl font-bold">Certyfikat jest autentyczny</h2><dl className="mt-4 space-y-2 text-sm"><div><dt className="text-green-700">Osoba</dt><dd className="font-semibold">{data.recipientName}</dd></div><div><dt className="text-green-700">Kurs lub quiz</dt><dd className="font-semibold">{data.title}</dd></div><div><dt className="text-green-700">Data wydania</dt><dd>{new Date(data.issuedAt).toLocaleDateString('pl-PL')}</dd></div><div><dt className="text-green-700">Kod</dt><dd className="font-mono">{data.verificationCode}</dd></div></dl></div>}
    </section>
  </main>;
}

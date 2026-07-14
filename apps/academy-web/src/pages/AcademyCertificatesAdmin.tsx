import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, RefreshCw, ShieldX } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

export function AcademyCertificatesAdmin() {
  const client = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['academy-admin-certificates'], queryFn: academyApi.adminCertificates });
  const refresh = () => client.invalidateQueries({ queryKey: ['academy-admin-certificates'] });
  if (isLoading) return <div className="academy-loading">Ładujemy certyfikaty…</div>;
  return <div className="space-y-5"><div><p className="academy-kicker">Administracja</p><h1 className="text-2xl font-bold font-heading">Certyfikaty</h1><p className="text-sm text-muted-foreground">Unieważniaj błędne dokumenty i wystawiaj poprawione wersje.</p></div><div className="space-y-3">{(data as any[]).map(cert=><article key={cert.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"><Award className="text-primary"/><div className="min-w-0 flex-1"><strong>{cert.course?.title ?? cert.quiz?.title}</strong><p className="text-xs text-muted-foreground">{cert.user.name} · {cert.user.email} · {cert.verificationCode}</p></div><span className="text-xs font-semibold">{cert.status}</span>{cert.status==='ACTIVE'&&<><button className="flex items-center gap-1 text-xs text-destructive" onClick={async()=>{const reason=window.prompt('Powód unieważnienia')||'';if(reason){await academyApi.adminRevokeCertificate(cert.verificationCode,reason);refresh();}}}><ShieldX/>Unieważnij</button><button className="flex items-center gap-1 text-xs text-primary" onClick={async()=>{await academyApi.adminReissueCertificate(cert.verificationCode);refresh();}}><RefreshCw/>Wystaw ponownie</button></>}</article>)}</div></div>;
}

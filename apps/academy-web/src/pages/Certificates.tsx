import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Award, Download, ExternalLink, Copy, Eye, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function Certificates() {
  const { isAuthenticated } = useAuth();
  const { data: certificates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['academy', 'certificates'],
    queryFn: academyApi.getCertificates, enabled: isAuthenticated,
  });
  const copyVerificationLink = async (code: string) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/certyfikat/${code}`); toast.success('Link został skopiowany'); }
    catch { toast.error('Nie udało się skopiować linku'); }
  };
  const openPdf = async (code: string, download = false) => {
    try { const blob = await academyApi.downloadCertificate(code); const url = URL.createObjectURL(blob); if (download) { const link = document.createElement('a'); link.href = url; link.download = `certyfikat-${code}.pdf`; link.click(); } else window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    catch { toast.error('Nie udało się otworzyć certyfikatu'); }
  };
  const shareCertificate = async (code: string, title: string) => {
    const url = `${window.location.origin}/certyfikat/${code}`;
    if (navigator.share) { await navigator.share({ title: `Certyfikat: ${title}`, text: 'Ukończyłam kurs w Akademii BeskidStudio', url }); return; }
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
  };
  if (!isAuthenticated) return <div className="academy-profile-empty"><Award /><h2>Twoje certyfikaty będą tutaj</h2><p>Po zakupie kursu, ukończeniu materiału i zalogowaniu znajdziesz tu swoje certyfikaty.</p><Link to="/logowanie">Zaloguj się do Akademii</Link></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading mb-1">Certyfikaty</h1>
        <p className="text-muted-foreground text-sm">Twoje zdobyte certyfikaty</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="academy-empty"><Award /><h2>Nie udało się pobrać certyfikatów</h2><p>Sprawdź połączenie i spróbuj ponownie.</p><button onClick={() => refetch()}>Spróbuj ponownie</button></div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Award className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nie masz jeszcze żadnego certyfikatu.</p>
          <p className="text-sm text-muted-foreground">
            Ukończ kurs lub zdaj quiz, aby otrzymać certyfikat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(certificates as any[]).map((cert: any) => (
            <div key={cert.id} className="bg-card rounded-lg border p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {cert.courseId ? 'Kurs' : 'Quiz'}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">
                  {cert.course?.title ?? cert.quiz?.title ?? 'Akademia BeskidStudio By Wiktoria Cwik'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Wydano: {format(new Date(cert.issuedAt), 'd MMMM yyyy', { locale: pl })}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Kod: {cert.verificationCode}
                </p>
              </div>
              <div className="flex gap-2"><button onClick={() => openPdf(cert.verificationCode)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium"><Eye className="w-3.5 h-3.5" />Podgląd</button><button onClick={() => openPdf(cert.verificationCode, true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium"><Download className="w-3.5 h-3.5" />Pobierz PDF</button></div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/certyfikat/${cert.verificationCode}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"><ExternalLink className="w-3.5 h-3.5" />Sprawdź autentyczność</Link>
                <button type="button" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => copyVerificationLink(cert.verificationCode)}><Copy className="w-3.5 h-3.5" />Kopiuj link</button>
                <button type="button" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => shareCertificate(cert.verificationCode, cert.course?.title ?? cert.quiz?.title ?? 'Akademia')}><Share2 className="w-3.5 h-3.5" />Udostępnij</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

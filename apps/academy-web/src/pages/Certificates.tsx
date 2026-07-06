import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Award, Download } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export function Certificates() {
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['academy', 'certificates'],
    queryFn: academyApi.getCertificates,
  });

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
      ) : certificates.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Award className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nie zdobyles/as jeszcze zadnego certyfikatu.</p>
          <p className="text-sm text-muted-foreground">
            Ukoncz kurs lub zdaj quiz, aby otrzymac certyfikat.
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
              <a
                href={cert.downloadUrl}
                download
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors w-fit"
              >
                <Download className="w-3.5 h-3.5" />
                Pobierz PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

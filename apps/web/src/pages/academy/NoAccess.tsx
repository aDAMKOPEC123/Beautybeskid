import { Link } from 'react-router-dom';
import { Lock, GraduationCap, BookOpen, Award, Star, Video, Sparkles } from 'lucide-react';

const BENEFITS = [
  { icon: Video, label: 'Kursy wideo', desc: 'Nagrania i materiały edukacyjne od ekspertów BeautyBeskid' },
  { icon: BookOpen, label: 'Wiedza o pielęgnacji', desc: 'Szczegółowe przewodniki po zabiegach i rutynach' },
  { icon: Star, label: 'Quizy i testy', desc: 'Sprawdź swoją wiedzę i odkryj dopasowane zabiegi' },
  { icon: Award, label: 'Certyfikaty', desc: 'Zdobywaj certyfikaty ukończenia kursów' },
  { icon: Sparkles, label: 'Ekskluzywne treści', desc: 'Dostęp do materiałów dostępnych tylko dla wybranych klientów' },
];

export function NoAccess() {
  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="p-5 rounded-full" style={{ background: 'rgba(196,150,90,0.1)' }}>
                <GraduationCap className="w-12 h-12" style={{ color: '#C4965A' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white shadow">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Akademia BeautyBeskid</h1>
            <p className="text-muted-foreground mt-1">
              Ekskluzywna strefa edukacyjna dla klientów BeautyBeskid
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Co zyskasz po uzyskaniu dostępu</p>
          <div className="space-y-3">
            {BENEFITS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(196,150,90,0.08)' }}>
                  <Icon className="w-4 h-4" style={{ color: '#C4965A' }} />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border bg-card p-5 text-center space-y-3">
          <p className="text-sm font-medium">Chcesz uzyskać dostęp do Akademii?</p>
          <p className="text-sm text-muted-foreground">
            Skontaktuj się z administratorem przez czat lub podczas wizyty — dostęp jest nadawany indywidualnie.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link
              to="/user/chat"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
              style={{ background: '#1A3828', color: '#fff' }}
            >
              Napisz do nas
            </Link>
            <Link
              to="/user"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-accent transition-colors"
            >
              Wróć do panelu
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

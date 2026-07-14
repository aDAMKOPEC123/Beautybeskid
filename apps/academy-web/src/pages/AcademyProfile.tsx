import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Award, BookOpen, GraduationCap, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function AcademyProfile() {
  const { user, isAuthenticated, logout } = useAuth();
  const hasAccess = !!user?.hasAcademyAccess || user?.role === 'ADMIN';
  const { data: courses = [] } = useQuery({ queryKey:['academy','profile-courses'], queryFn: academyApi.getCourses, enabled: hasAccess });
  const { data: certificates = [] } = useQuery({ queryKey:['academy','profile-certificates'], queryFn: academyApi.getCertificates, enabled: hasAccess });
  if (!isAuthenticated) { window.location.href = 'https://kosmetologwiktoriacwik.pl/auth/login'; return null; }
  const completed = (courses as any[]).filter(course => course.progress?.completedAt);
  return <div className="academy-profile"><section className="academy-profile-head"><span>{user?.name?.[0] || user?.email?.[0]}</span><div><p className="academy-kicker">Twoje konto</p><h1>{user?.name || 'Kursantka Akademii'}</h1><p>{user?.email}</p></div><button onClick={logout}><LogOut className="w-4 h-4" />Wyloguj</button></section>{hasAccess ? <><section className="academy-profile-stats"><div><BookOpen /><strong>{(courses as any[]).filter(c=>c.progress).length}</strong><span>kursów w nauce</span></div><div><GraduationCap /><strong>{completed.length}</strong><span>ukończonych kursów</span></div><div><Award /><strong>{(certificates as any[]).length}</strong><span>certyfikatów</span></div></section><section className="academy-profile-list"><div><p className="academy-kicker text-caramel">Osiągnięcia</p><h2>Ukończone kursy</h2></div>{completed.length ? completed.map((course:any)=><Link key={course.id} to={`/kurs/${course.slug}`}><BookOpen /><span>{course.title}</span><span>Ukończony</span></Link>) : <p>Ukończone kursy pojawią się tutaj wraz z certyfikatami.</p>}</section></> : <section className="academy-profile-empty"><GraduationCap /><h2>Twoja Akademia jest gotowa</h2><p>Wybierz kurs z katalogu. Po zakupie odblokujemy pełny materiał i dodamy go automatycznie do „Mojej nauki”.</p><Link to="/">Zobacz kursy</Link></section>}</div>;
}

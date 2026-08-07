import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AcademyError } from './pages/AcademyError';
import { useAuth } from './hooks/useAuth';

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="academy-route-loading" role="status">Ładowanie…</div>}>{children}</Suspense>
);

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="academy-route-loading" role="status">Ładowanie…</div>;
  if (!isAuthenticated) return <Navigate to="/logowanie" replace />;
  return <>{children}</>;
}

const AcademyLayout = lazy(() => import('./pages/AcademyLayout').then(m => ({ default: m.AcademyLayout })));
const AcademyAdminLayout = lazy(() => import('./pages/AcademyAdminLayout').then(m => ({ default: m.AcademyAdminLayout })));
const NoAccess = lazy(() => import('./pages/NoAccess').then(m => ({ default: m.NoAccess })));
const Discover = lazy(() => import('./pages/Discover').then(m => ({ default: m.Discover })));
const CourseCatalog = lazy(() => import('./pages/CourseCatalog').then(m => ({ default: m.CourseCatalog })));
const PersonaLanding = lazy(() => import('./pages/PersonaLanding').then(m => ({ default: m.PersonaLanding })));
const MyCourses = lazy(() => import('./pages/MyCourses').then(m => ({ default: m.MyCourses })));
const Certificates = lazy(() => import('./pages/Certificates').then(m => ({ default: m.Certificates })));
const StandaloneQuizPage = lazy(() => import('./pages/StandaloneQuizPage').then(m => ({ default: m.StandaloneQuizPage })));
const CourseDetail = lazy(() => import('./pages/CourseDetail').then(m => ({ default: m.CourseDetail })));
const LessonPlayer = lazy(() => import('./pages/LessonPlayer').then(m => ({ default: m.LessonPlayer })));
const AcademyStudio = lazy(() => import('./pages/AcademyStudio').then(m => ({ default: m.AcademyStudio })));
const AcademyConsultation = lazy(() => import('./pages/AcademyConsultation').then(m => ({ default: m.AcademyConsultation })));
const AcademyProfile = lazy(() => import('./pages/AcademyProfile').then(m => ({ default: m.AcademyProfile })));
const AcademySupportInbox = lazy(() => import('./pages/AcademySupportInbox').then(m => ({ default: m.AcademySupportInbox })));
const AcademyAnalytics = lazy(() => import('./pages/AcademyAnalytics').then(m => ({ default: m.AcademyAnalytics })));
const AcademyAuth = lazy(() => import('./pages/AcademyAuth').then(m => ({ default: m.AcademyAuth })));
const CertificateVerification = lazy(() => import('./pages/CertificateVerification').then(m => ({ default: m.CertificateVerification })));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })));
const AcademyCertificatesAdmin = lazy(() => import('./pages/AcademyCertificatesAdmin').then(m => ({ default: m.AcademyCertificatesAdmin })));
const AcademyReviewsAdmin = lazy(() => import('./pages/AcademyReviewsAdmin').then(m => ({ default: m.AcademyReviewsAdmin })));
const AcademyLegalPage = lazy(() => import('./pages/AcademyLegalPage').then(m => ({ default: m.AcademyLegalPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const BundleDetail = lazy(() => import('./pages/BundleDetail').then(m => ({ default: m.BundleDetail })));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled').then(m => ({ default: m.PaymentCancelled })));
const AcademyAuthAction = lazy(() => import('./pages/AcademyAuthAction').then(m => ({ default: m.AcademyAuthAction })));
const AcademyLegalAdmin = lazy(() => import('./pages/AcademyLegalAdmin').then(m => ({ default: m.AcademyLegalAdmin })));
const AcademyOrdersAdmin = lazy(() => import('./pages/AcademyOrdersAdmin').then(m => ({ default: m.AcademyOrdersAdmin })));
const AcademyBundlesAdmin = lazy(() => import('./pages/AcademyBundlesAdmin').then(m => ({ default: m.AcademyBundlesAdmin })));
const AcademyMarketingAdmin = lazy(() => import('./pages/AcademyMarketingAdmin').then(m => ({ default: m.AcademyMarketingAdmin })));
const AcademyUnsubscribe = lazy(() => import('./pages/AcademyUnsubscribe').then(m => ({ default: m.AcademyUnsubscribe })));
const AcademyMediaAdmin = lazy(() => import('./pages/AcademyMediaAdmin').then(m=>({default:m.AcademyMediaAdmin})));
const AcademyCart=lazy(()=>import('./pages/AcademyCart').then(m=>({default:m.AcademyCart})));
const AcademyOperationsAdmin=lazy(()=>import('./pages/AcademyOperationsAdmin').then(m=>({default:m.AcademyOperationsAdmin})));
const SkinAtlasMap = lazy(() => import('./pages/atlas/SkinAtlasMap').then(m => ({ default: m.SkinAtlasMap })));
const SkinAtlasRegion = lazy(() => import('./pages/atlas/SkinAtlasRegion').then(m => ({ default: m.SkinAtlasRegion })));
const SkinAtlasCondition = lazy(() => import('./pages/atlas/SkinAtlasCondition').then(m => ({ default: m.SkinAtlasCondition })));
const SkinAtlasQuiz = lazy(() => import('./pages/atlas/SkinAtlasQuiz').then(m => ({ default: m.SkinAtlasQuiz })));
const CaseStudyList = lazy(() => import('./pages/case-studies/CaseStudyList').then(m => ({ default: m.CaseStudyList })));
const CaseStudyPlayer = lazy(() => import('./pages/case-studies/CaseStudyPlayer').then(m => ({ default: m.CaseStudyPlayer })));
const AdminSkinAtlas = lazy(() => import('./pages/admin/AdminSkinAtlas').then(m => ({ default: m.AdminSkinAtlas })));
const AdminCaseStudies = lazy(() => import('./pages/admin/AdminCaseStudies').then(m => ({ default: m.AdminCaseStudies })));
const AdminInstructors = lazy(() => import('./pages/admin/AdminInstructors').then(m => ({ default: m.AdminInstructors })));
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes').then(m => ({ default: m.AdminQuizzes })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Strona prawna obsługuje zamknięty zestaw dokumentów. Trzymamy je jako jawne
// ścieżki, bo wcześniejsze `:slug` łapało każdy literówkowy adres i pokazywało
// regulamin zamiast informacji, że strona nie istnieje.
const LEGAL_SLUGS = ['regulamin', 'polityka-prywatnosci', 'cookies', 'odstapienie', 'reklamacje', 'dostepnosc'];

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <AcademyError />,
    children: [
      { path: 'brak-dostepu', element: <S><NoAccess /></S> },
      { path: 'logowanie', element: <S><AcademyAuth mode="login" /></S> },
      { path: 'rejestracja', element: <S><AcademyAuth mode="register" /></S> },
      { path: 'certyfikat/:code?', element: <S><CertificateVerification /></S> },
      { path: 'platnosc/sukces', element: <S><PaymentSuccess /></S> },
      { path: 'platnosc/anulowana', element: <S><PaymentCancelled /></S> },
      { path: 'przypomnij-haslo', element: <S><AcademyAuthAction mode="forgot" /></S> },
      { path: 'nowe-haslo', element: <S><AcademyAuthAction mode="reset" /></S> },
      { path: 'potwierdz-email', element: <S><AcademyAuthAction mode="verify" /></S> },
      { path: 'wypisz/:token', element: <S><AcademyUnsubscribe /></S> },
      {
        element: <S><AcademyLayout /></S>,
        children: [
          { index: true, element: <S><Discover /></S> },
          { path: 'kursy', element: <S><CourseCatalog /></S> },
          { path: 'dla-poczatkujacych', element: <S><PersonaLanding /></S> },
          { path: 'dla-praktykow', element: <S><PersonaLanding /></S> },
          { path: 'dla-salonow', element: <S><PersonaLanding /></S> },
          { path: 'moje-kursy', element: <S><RequireAuth><MyCourses /></RequireAuth></S> },
          { path: 'certyfikaty', element: <S><RequireAuth><Certificates /></RequireAuth></S> },
          { path: 'profil', element: <S><RequireAuth><AcademyProfile /></RequireAuth></S> },
          { path: 'zapytaj-kosmetologa', element: <S><RequireAuth><AcademyConsultation /></RequireAuth></S> },
          { path: 'quizy', element: <S><RequireAuth><StandaloneQuizPage /></RequireAuth></S> },
          { path: 'quiz/:quizId', element: <S><RequireAuth><StandaloneQuizPage /></RequireAuth></S> },
          { path: 'kurs/:slug', element: <S><CourseDetail /></S> },
          { path: 'pakiet/:slug', element: <S><BundleDetail /></S> },
          { path: 'zamowienie/kurs/:slug', element: <S><RequireAuth><CheckoutPage type="course" /></RequireAuth></S> },
          { path: 'zamowienie/pakiet/:slug', element: <S><RequireAuth><CheckoutPage type="bundle" /></RequireAuth></S> },
          { path: 'koszyk', element: <S><AcademyCart /></S> },
          { path: 'atlas', element: <S><RequireAuth><SkinAtlasMap /></RequireAuth></S> },
          { path: 'atlas/quiz', element: <S><RequireAuth><SkinAtlasQuiz /></RequireAuth></S> },
          { path: 'atlas/quiz/:region', element: <S><RequireAuth><SkinAtlasQuiz /></RequireAuth></S> },
          { path: 'atlas/:region', element: <S><RequireAuth><SkinAtlasRegion /></RequireAuth></S> },
          { path: 'atlas/:region/:condition', element: <S><RequireAuth><SkinAtlasCondition /></RequireAuth></S> },
          { path: 'kurs/:slug/przypadki', element: <S><RequireAuth><CaseStudyList /></RequireAuth></S> },
          { path: 'kurs/:slug/przypadek/:id', element: <S><RequireAuth><CaseStudyPlayer /></RequireAuth></S> },
          ...LEGAL_SLUGS.map((slug) => ({ path: slug, element: <S><AcademyLegalPage /></S> })),
          { path: 'kurs/:slug/lekcja/:lessonSlug', element: <S><LessonPlayer /></S> },
          { path: '*', element: <S><NotFound /></S> },
        ],
      },
      {
        path: 'admin',
        element: <S><AcademyAdminLayout /></S>,
        children: [
          { index: true, element: <S><AcademyStudio /></S> },
          { path: 'statystyki', element: <S><AcademyAnalytics /></S> },
          { path: 'wiadomosci', element: <S><AcademySupportInbox /></S> },
          { path: 'certyfikaty', element: <S><AcademyCertificatesAdmin /></S> },
          { path: 'opinie', element: <S><AcademyReviewsAdmin /></S> },
          { path: 'zamowienia', element: <S><AcademyOrdersAdmin /></S> },
          { path: 'pakiety', element: <S><AcademyBundlesAdmin /></S> },
          { path: 'marketing', element: <S><AcademyMarketingAdmin /></S> },
          { path: 'media', element: <S><AcademyMediaAdmin /></S> },
          { path: 'prowadzace', element: <S><AdminInstructors /></S> },
          { path: 'quizy', element: <S><AdminQuizzes /></S> },
          { path: 'atlas', element: <S><AdminSkinAtlas /></S> },
          { path: 'przypadki', element: <S><AdminCaseStudies /></S> },
          { path: 'system', element: <S><AcademyOperationsAdmin /></S> },
          { path: 'prawo', element: <S><AcademyLegalAdmin /></S> },
        ],
      },
      { path: 'studio', element: <Navigate to="/admin" replace /> },
      { path: 'studio/wiadomosci', element: <Navigate to="/admin/wiadomosci" replace /> },
    ],
  },
]);

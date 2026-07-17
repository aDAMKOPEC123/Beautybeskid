import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AcademyError } from './pages/AcademyError';

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="academy-route-loading" role="status">Ładowanie…</div>}>{children}</Suspense>
);

const AcademyLayout = lazy(() => import('./pages/AcademyLayout').then(m => ({ default: m.AcademyLayout })));
const AcademyAdminLayout = lazy(() => import('./pages/AcademyAdminLayout').then(m => ({ default: m.AcademyAdminLayout })));
const NoAccess = lazy(() => import('./pages/NoAccess').then(m => ({ default: m.NoAccess })));
const AcademyCatalog = lazy(() => import('./pages/AcademyCatalog').then(m => ({ default: m.AcademyCatalog })));
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
          { index: true, element: <S><AcademyCatalog /></S> },
          { path: 'moje-kursy', element: <S><MyCourses /></S> },
          { path: 'certyfikaty', element: <S><Certificates /></S> },
          { path: 'profil', element: <S><AcademyProfile /></S> },
          { path: 'zapytaj-kosmetologa', element: <S><AcademyConsultation /></S> },
          { path: 'quizy', element: <S><StandaloneQuizPage /></S> },
          { path: 'quiz/:quizId', element: <S><StandaloneQuizPage /></S> },
          { path: 'kurs/:slug', element: <S><CourseDetail /></S> },
          { path: 'pakiet/:slug', element: <S><BundleDetail /></S> },
          { path: 'zamowienie/kurs/:slug', element: <S><CheckoutPage type="course" /></S> },
          { path: 'zamowienie/pakiet/:slug', element: <S><CheckoutPage type="bundle" /></S> },
          { path: 'koszyk', element: <S><AcademyCart /></S> },
          { path: ':slug', element: <S><AcademyLegalPage /></S> },
          { path: 'kurs/:slug/lekcja/:lessonSlug', element: <S><LessonPlayer /></S> },
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
          { path: 'system', element: <S><AcademyOperationsAdmin /></S> },
          { path: 'prawo', element: <S><AcademyLegalAdmin /></S> },
        ],
      },
      { path: 'studio', element: <Navigate to="/admin" replace /> },
      { path: 'studio/wiadomosci', element: <Navigate to="/admin/wiadomosci" replace /> },
    ],
  },
]);

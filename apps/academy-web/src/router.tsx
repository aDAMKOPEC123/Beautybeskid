import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AcademyError } from './pages/AcademyError';

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8 text-center">Ladowanie...</div>}>{children}</Suspense>
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

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <AcademyError />,
    children: [
      { path: 'brak-dostepu', element: <S><NoAccess /></S> },
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
          { path: 'kurs/:slug/lekcja/:lessonSlug', element: <S><LessonPlayer /></S> },
        ],
      },
      {
        path: 'admin',
        element: <S><AcademyAdminLayout /></S>,
        children: [
          { index: true, element: <S><AcademyStudio /></S> },
          { path: 'wiadomosci', element: <S><AcademySupportInbox /></S> },
        ],
      },
      { path: 'studio', element: <Navigate to="/admin" replace /> },
      { path: 'studio/wiadomosci', element: <Navigate to="/admin/wiadomosci" replace /> },
    ],
  },
]);

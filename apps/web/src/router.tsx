import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { RouteErrorFallback } from '@/components/shared/RouteErrorFallback';
import { useAuthStore } from '@/store/auth.store';
import { getPanelPath } from '@/lib/panel-routing';
import { PublicLayout } from './components/layout/PublicLayout';
import { Home } from './pages/public/Home';

const HomeRoute = () => {
  const { accessToken, user } = useAuthStore();
  const location = useLocation();
  if (accessToken && user && !(location.state as any)?.fromPanel) {
    return <Navigate to={getPanelPath(user.role)} replace />;
  }
  return <Home />;
};

const UserLayout = lazy(() => import('./components/layout/UserLayout').then(m => ({ default: m.UserLayout })));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout').then(m => ({ default: m.AdminLayout })));
const EmployeeLayout = lazy(() => import('./components/layout/EmployeeLayout').then(m => ({ default: m.EmployeeLayout })));

// Public pages
const ServiceList = lazy(() => import('./pages/public/ServiceList').then(m => ({ default: m.ServiceList })));
const BlogList = lazy(() => import('./pages/public/BlogList').then(m => ({ default: m.BlogList })));
const BlogPost = lazy(() => import('./pages/public/BlogPost').then(m => ({ default: m.BlogPost })));
const MetamorphosesGallery = lazy(() => import('./pages/public/MetamorphosesGallery').then(m => ({ default: m.MetamorphosesGallery })));
const LoyaltyInfo = lazy(() => import('./pages/public/LoyaltyInfo').then(m => ({ default: m.LoyaltyInfo })));
const PublicTerms = lazy(() => import('./pages/public/Terms').then(m => ({ default: m.PublicTerms })));
const Contact = lazy(() => import('./pages/public/Contact').then(m => ({ default: m.Contact })));
const About = lazy(() => import('./pages/public/About').then(m => ({ default: m.About })));
const ServiceDetail = lazy(() => import('./pages/public/ServiceDetail').then(m => ({ default: m.ServiceDetail })));
const LocalSeoPage = lazy(() => import('./pages/public/LocalSeoPage').then(m => ({ default: m.LocalSeoPage })));

// Auth pages
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const FacebookCallback = lazy(() => import('./pages/auth/FacebookCallback').then(m => ({ default: m.FacebookCallback })));
const FacebookRegistrationComplete = lazy(() => import('./pages/auth/FacebookRegistrationComplete').then(m => ({ default: m.FacebookRegistrationComplete })));
const GoogleRegistrationComplete = lazy(() => import('./pages/auth/FacebookRegistrationComplete').then(m => ({ default: m.GoogleRegistrationComplete })));

// User pages
const UserDashboard = lazy(() => import('./pages/user/Dashboard').then(m => ({ default: m.UserDashboard })));
const UserAppointments = lazy(() => import('./pages/user/Appointments').then(m => ({ default: m.UserAppointments })));
const BookingWizard = lazy(() => import('./pages/user/BookingWizard').then(m => ({ default: m.BookingWizard })));
const UserLoyalty = lazy(() => import('./pages/user/Loyalty').then(m => ({ default: m.UserLoyalty })));
const UserProfile = lazy(() => import('./pages/user/Profile').then(m => ({ default: m.UserProfile })));
const UserChat = lazy(() => import('./pages/user/Chat').then(m => ({ default: m.UserChat })));
const UserTimeline = lazy(() => import('./pages/user/Timeline').then(m => ({ default: m.UserTimeline })));
const UserNotifications = lazy(() => import('./pages/user/Notifications').then(m => ({ default: m.UserNotifications })));
const UserReferrals = lazy(() => import('./pages/user/Referrals').then(m => ({ default: m.UserReferrals })));
const UserProducts = lazy(() => import('./pages/user/Products').then(m => ({ default: m.UserProducts })));
const UserSkinJournal = lazy(() => import('./pages/user/SkinJournal').then(m => ({ default: m.UserSkinJournal })));
const HomecareRoutinePage = lazy(() => import('./pages/user/HomecareRoutine').then(m => ({ default: m.HomecareRoutinePage })));
const ChangePassword = lazy(() => import('./pages/user/ChangePassword').then(m => ({ default: m.ChangePassword })));
const SkinWeatherProfile = lazy(() => import('./pages/user/SkinWeatherProfile').then(m => ({ default: m.SkinWeatherProfile })));
const UserBeautyPlan = lazy(() => import('./pages/user/BeautyPlan').then(m => ({ default: m.UserBeautyPlan })));
const UserVouchery = lazy(() => import('./pages/user/UserVouchery').then(m => ({ default: m.UserVouchery })));
const UserStorePromotions = lazy(() => import('./pages/user/StorePromotions').then(m => ({ default: m.UserStorePromotions })));
const ForumHome = lazy(() => import('./pages/user/forum/ForumHome').then(m => ({ default: m.ForumHome })));
const ForumCategory = lazy(() => import('./pages/user/forum/ForumCategory').then(m => ({ default: m.ForumCategory })));
const ForumThread = lazy(() => import('./pages/user/forum/ForumThread').then(m => ({ default: m.ForumThread })));
const ForumNewThread = lazy(() => import('./pages/user/forum/ForumNewThread').then(m => ({ default: m.ForumNewThread })));
const ForumSearch = lazy(() => import('./pages/user/forum/ForumSearch').then(m => ({ default: m.ForumSearch })));
const ForumUserProfile = lazy(() => import('./pages/user/forum/ForumUserProfile').then(m => ({ default: m.ForumUserProfile })));
const AdminForum = lazy(() => import('./pages/admin/AdminForum').then(m => ({ default: m.AdminForum })));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminAppointments = lazy(() => import('./pages/admin/Appointments').then(m => ({ default: m.AdminAppointments })));
const AdminServices = lazy(() => import('./pages/admin/Services').then(m => ({ default: m.AdminServices })));
const AdminBlog = lazy(() => import('./pages/admin/Blog').then(m => ({ default: m.AdminBlog })));
const AdminBlogForm = lazy(() => import('./pages/admin/AdminBlogForm').then(m => ({ default: m.AdminBlogForm })));
const AdminMetamorphoses = lazy(() => import('./pages/admin/Metamorphoses').then(m => ({ default: m.AdminMetamorphoses })));
const AdminLoyalty = lazy(() => import('./pages/admin/Loyalty').then(m => ({ default: m.AdminLoyalty })));
const AdminUsers = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.AdminUsers })));
const AdminChat = lazy(() => import('./pages/admin/Chat').then(m => ({ default: m.AdminChat })));
const AdminEmployees = lazy(() => import('./pages/admin/Employees').then(m => ({ default: m.AdminEmployees })));
const AdminWork = lazy(() => import('./pages/admin/Work').then(m => ({ default: m.AdminWork })));
const AdminHeroSlides = lazy(() => import('./pages/admin/HeroSlides').then(m => ({ default: m.AdminHeroSlides })));
const AdminRecommendedSlides = lazy(() => import('./pages/admin/RecommendedSlides').then(m => ({ default: m.AdminRecommendedSlides })));
const AdminDiscountCodes = lazy(() => import('./pages/admin/DiscountCodes').then(m => ({ default: m.AdminDiscountCodes })));
const AdminTerms = lazy(() => import('./pages/admin/AdminTerms').then(m => ({ default: m.AdminTerms })));
const AdminAbout = lazy(() => import('./pages/admin/AdminAbout').then(m => ({ default: m.AdminAbout })));
const AdminConsultations = lazy(() => import('./pages/admin/Consultations').then(m => ({ default: m.AdminConsultations })));
const AdminServiceDetail = lazy(() => import('./pages/admin/AdminServiceDetail').then(m => ({ default: m.AdminServiceDetail })));
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes'));
const AdminQuizEditor = lazy(() => import('./pages/admin/AdminQuizEditor'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews').then(m => ({ default: m.AdminReviews })));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications })));
const AdminBlogComments = lazy(() => import('./pages/admin/AdminBlogComments').then(m => ({ default: m.AdminBlogComments })));
const AdminAssortment = lazy(() => import('./pages/admin/AdminAssortment').then(m => ({ default: m.AdminAssortment })));
const SkinWeatherRules = lazy(() => import('./pages/admin/SkinWeatherRules').then(m => ({ default: m.SkinWeatherRules })));
const AdminVouchery = lazy(() => import('./pages/admin/AdminVouchery').then(m => ({ default: m.AdminVouchery })));
const AdminAkademia = lazy(() => import('./pages/admin/academy/AdminAkademia').then(m => ({ default: m.AdminAkademia })));
const AdminCourseEditor = lazy(() => import('./pages/admin/academy/AdminCourseEditor').then(m => ({ default: m.AdminCourseEditor })));
const AdminStandaloneQuizEditor = lazy(() => import('./pages/admin/academy/AdminStandaloneQuizEditor').then(m => ({ default: m.AdminStandaloneQuizEditor })));
const Marketing = lazy(() => import('@/pages/admin/Marketing').then(m => ({ default: m.Marketing })));
const AdminBeautyPlans = lazy(() => import('./pages/admin/AdminBeautyPlans').then(m => ({ default: m.AdminBeautyPlans })));
const AdminStorePromotions = lazy(() => import('./pages/admin/StorePromotions').then(m => ({ default: m.AdminStorePromotions })));

// Employee pages
const EmployeeSchedule = lazy(() => import('./pages/employee/Schedule').then(m => ({ default: m.EmployeeSchedule })));
const EmployeeAppointments = lazy(() => import('./pages/employee/MyAppointments').then(m => ({ default: m.EmployeeAppointments })));
const EmployeeChat = lazy(() => import('./pages/employee/Chat').then(m => ({ default: m.EmployeeChat })));
const EmployeeAssortment = lazy(() => import('./pages/employee/EmployeeAssortment').then(m => ({ default: m.EmployeeAssortment })));

// Academy redirect (moved to subdomain)
const ACADEMY_URL = import.meta.env.VITE_ACADEMY_URL || 'https://akademia.kosmetologwiktoriacwik.pl';
const AcademyRedirect = () => {
  const { pathname } = useLocation();
  const subPath = pathname.replace(/^\/akademia/, '') || '/';
  window.location.href = `${ACADEMY_URL}${subPath}`;
  return null;
};

const Spinner = (
  <div className="flex min-h-[calc(100svh-72px)] items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={Spinner}>{children}</Suspense>
);

const routeErrorElement = <RouteErrorFallback />;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: routeErrorElement,
    children: [
      { index: true, element: <S><HomeRoute /></S> },
      { path: 'home', element: <Navigate to="/" replace /> },
      { path: 'uslugi', element: <S><ServiceList /></S> },
      { path: 'uslugi/:slug', element: <S><ServiceDetail /></S> },
      { path: 'blog', element: <S><BlogList /></S> },
      { path: 'blog/:slug', element: <S><BlogPost /></S> },
      { path: 'metamorfozy', element: <S><MetamorphosesGallery /></S> },
      { path: 'program-lojalnosciowy', element: <S><LoyaltyInfo /></S> },
      { path: 'regulamin', element: <S><PublicTerms /></S> },
      { path: 'kontakt', element: <S><Contact /></S> },
      { path: 'o-nas', element: <S><About /></S> },
      { path: 'kosmetolog-limanowa', element: <Navigate to="/" replace /> },
      { path: 'kosmetolog-mordarka', element: <S><LocalSeoPage pageKey="kosmetolog-mordarka" /></S> },
      { path: 'podolog-limanowa', element: <S><LocalSeoPage pageKey="podolog-limanowa" /></S> },
      { path: 'podolog-mordarka', element: <S><LocalSeoPage pageKey="podolog-mordarka" /></S> },
      { path: 'kosmetyczka-limanowa', element: <S><LocalSeoPage pageKey="kosmetyczka-limanowa" /></S> },
      { path: 'kosmetyczka-mordarka', element: <Navigate to="/kosmetyczka-limanowa" replace /> },
      { path: 'laminacja-brwi-limanowa', element: <S><LocalSeoPage pageKey="laminacja-brwi-limanowa" /></S> },
      { path: 'laminacja-brwi-mordarka', element: <Navigate to="/laminacja-brwi-limanowa" replace /> },
      { path: 'laminacja-rzes-limanowa', element: <S><LocalSeoPage pageKey="laminacja-rzes-limanowa" /></S> },
      { path: 'laminacja-rzes-mordarka', element: <Navigate to="/laminacja-rzes-limanowa" replace /> },
      { path: 'oprawa-oka-limanowa', element: <S><LocalSeoPage pageKey="oprawa-oka-limanowa" /></S> },
      { path: 'oprawa-oka-mordarka', element: <Navigate to="/oprawa-oka-limanowa" replace /> },
      { path: 'wrastajace-paznokcie-limanowa', element: <S><LocalSeoPage pageKey="wrastajace-paznokcie-limanowa" /></S> },
      { path: 'wrastajace-paznokcie-mordarka', element: <S><LocalSeoPage pageKey="wrastajace-paznokcie-mordarka" /></S> },
      {
        path: 'auth',
        children: [
          { path: 'login', element: <S><Login /></S> },
          { path: 'register', element: <S><Register /></S> },
          { path: 'forgot-password', element: <S><ForgotPassword /></S> },
          { path: 'reset-password', element: <S><ResetPassword /></S> },
          { path: 'facebook/callback', element: <S><FacebookCallback /></S> },
          { path: 'facebook/complete', element: <S><FacebookRegistrationComplete /></S> },
          { path: 'google/complete', element: <S><GoogleRegistrationComplete /></S> },
        ],
      },
    ],
  },
  {
    path: '/user',
    element: <UserLayout />,
    errorElement: routeErrorElement,
    children: [
      { index: true, element: <S><UserDashboard /></S> },
      { path: 'wizyty', element: <S><UserAppointments /></S> },
      { path: 'appointments', element: <Navigate to="/user/wizyty" replace /> },
      { path: 'lojalnosc', element: <S><UserLoyalty /></S> },
      { path: 'profil', element: <S><UserProfile /></S> },
      { path: 'historia', element: <S><UserTimeline /></S> },
      { path: 'chat', element: <S><UserChat /></S> },
      { path: 'powiadomienia', element: <S><UserNotifications /></S> },
      { path: 'polecenia', element: <S><UserReferrals /></S> },
      { path: 'produkty', element: <S><UserProducts /></S> },
      { path: 'dziennik', element: <S><UserSkinJournal /></S> },
      { path: 'rutyna', element: <S><HomecareRoutinePage /></S> },
      { path: 'zmien-haslo', element: <S><ChangePassword /></S> },
      { path: 'pogoda-skory', element: <S><SkinWeatherProfile /></S> },
      { path: 'zalecenia', element: <S><UserBeautyPlan /></S> },
      { path: 'vouchery', element: <S><UserVouchery /></S> },
      { path: 'promocje-sklepowe', element: <S><UserStorePromotions /></S> },
      { path: 'forum', element: <S><ForumHome /></S> },
      { path: 'forum/nowy', element: <S><ForumNewThread /></S> },
      { path: 'forum/szukaj', element: <S><ForumSearch /></S> },
      { path: 'forum/uzytkownik/:userId', element: <S><ForumUserProfile /></S> },
      { path: 'forum/watek/:id', element: <S><ForumThread /></S> },
      { path: 'forum/:categorySlug', element: <S><ForumCategory /></S> },
    ],
  },
  {
    path: '/rezerwacja',
    element: <UserLayout />,
    errorElement: routeErrorElement,
    children: [{ index: true, element: <S><BookingWizard /></S> }],
  },
  {
    path: '/employee',
    element: <EmployeeLayout />,
    errorElement: routeErrorElement,
    children: [
      { index: true, element: <Navigate to="terminarz" replace /> },
      { path: 'terminarz', element: <S><EmployeeSchedule /></S> },
      { path: 'wizyty', element: <S><EmployeeAppointments /></S> },
      { path: 'chat', element: <S><EmployeeChat /></S> },
      { path: 'asortyment', element: <S><EmployeeAssortment /></S> },
    ],
  },
  {
    path: '/akademia/*',
    element: <AcademyRedirect />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: routeErrorElement,
    children: [
      { index: true, element: <S><AdminDashboard /></S> },
      { path: 'wizyty', element: <S><AdminAppointments /></S> },
      { path: 'pracownicy', element: <S><AdminEmployees /></S> },
      { path: 'uslugi', element: <S><AdminServices /></S> },
      { path: 'uslugi/:slug', element: <S><AdminServiceDetail /></S> },
      { path: 'blog/new', element: <S><AdminBlogForm /></S> },
      { path: 'blog/:id/edit', element: <S><AdminBlogForm /></S> },
      { path: 'blog/:id/comments', element: <S><AdminBlogComments /></S> },
      { path: 'blog', element: <S><AdminBlog /></S> },
      { path: 'metamorfozy', element: <S><AdminMetamorphoses /></S> },
      { path: 'lojalnosc', element: <S><AdminLoyalty /></S> },
      { path: 'uzytkownicy', element: <S><AdminUsers /></S> },
      { path: 'chat', element: <S><AdminChat /></S> },
      { path: 'praca', element: <S><AdminWork /></S> },
      { path: 'hero', element: <S><AdminHeroSlides /></S> },
      { path: 'polecane-zabiegi', element: <S><AdminRecommendedSlides /></S> },
      { path: 'kody-rabatowe', element: <S><AdminDiscountCodes /></S> },
      { path: 'promocje-sklepowe', element: <S><AdminStorePromotions /></S> },
      { path: 'vouchery', element: <S><AdminVouchery /></S> },
      { path: 'regulamin', element: <S><AdminTerms /></S> },
      { path: 'o-nas', element: <S><AdminAbout /></S> },
      { path: 'konsultacje', element: <S><AdminConsultations /></S> },
      { path: 'quizy', element: <S><AdminQuizzes /></S> },
      { path: 'quizy/:id/edytor', element: <S><AdminQuizEditor /></S> },
      { path: 'recenzje', element: <S><AdminReviews /></S> },
      { path: 'powiadomienia', element: <S><AdminNotifications /></S> },
      { path: 'asortyment', element: <S><AdminAssortment /></S> },
      { path: 'pogoda-skory', element: <S><SkinWeatherRules /></S> },
      { path: 'beauty-plans', element: <S><AdminBeautyPlans /></S> },
      { path: 'akademia', element: <S><AdminAkademia /></S> },
      { path: 'akademia/kurs/:id', element: <S><AdminCourseEditor /></S> },
      { path: 'akademia/quiz/:id', element: <S><AdminStandaloneQuizEditor /></S> },
      { path: 'marketing', element: <S><Marketing /></S> },
      { path: 'forum', element: <S><AdminForum /></S> },
    ],
  },
]);

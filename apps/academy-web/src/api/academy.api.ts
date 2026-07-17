import { api } from '@/lib/axios';

export const academyApi = {
  logout: () => api.post('/academy/auth/logout').then(() => undefined),
  resendVerification: () => api.post('/academy/auth/resend-verification').then(() => undefined),
  // Public storefront
  getPublicCourses: () => api.get('/academy/public/courses').then((r) => r.data.data),
  getPublicCourseBySlug: (slug: string) => api.get(`/academy/public/courses/${slug}`).then((r) => r.data.data),
  getPublicBundles: () => api.get('/academy/public/bundles').then((r) => r.data.data),
  getPublicBundleBySlug: (slug: string) => api.get(`/academy/public/bundles/${slug}`).then((r) => r.data.data),
  getCommerceInfo: () => api.get('/academy/public/legal/commerce-info').then((r) => r.data.data),
  getLegalDocument: (slug: string) => api.get(`/academy/public/legal/${slug}`).then((r) => r.data.data),
  getStorefront: () => api.get('/academy/public/storefront').then((r) => r.data.data),
  recordBannerEvent: (id: string, type: 'impression' | 'click') => api.post(`/academy/public/banners/${id}/event`, { type }),
  subscribeLead: (data: Record<string, unknown>) => api.post('/academy/public/leads', data).then(r => r.data.data),
  unsubscribeLead: (token: string) => api.post(`/academy/public/leads/unsubscribe/${encodeURIComponent(token)}`).then(r=>r.data.data),
  previewDiscountCode: (data: Record<string, unknown>) => api.post('/academy/marketing/preview-code', data).then(r => r.data.data),
  // Courses
  getCourses: () =>
    api.get('/academy/courses').then((r) => r.data.data),

  getCourseBySlug: (slug: string) =>
    api.get(`/academy/courses/${slug}`).then((r) => r.data.data),
  registerCourseInterest: (courseId: string) =>
    api.post(`/academy/courses/${courseId}/interest`).then((r) => r.data.data),
  createCheckout: (courseId: string, data: Record<string, unknown>) => api.post(`/academy/payments/courses/${courseId}/checkout`, data).then((r) => r.data.data),
  createBundleCheckout: (bundleId: string, data: Record<string, unknown>) => api.post(`/academy/payments/bundles/${bundleId}/checkout`, data).then((r) => r.data.data),
  createCartCheckout:(data:Record<string,unknown>)=>api.post('/academy/payments/cart/checkout',data).then(r=>r.data.data),
  getOrders: () => api.get('/academy/payments/orders').then((r) => r.data.data),
  getOrderStatus: (sessionId: string) => api.get(`/academy/payments/order-status?sessionId=${encodeURIComponent(sessionId)}`).then((r) => r.data.data),
  getFavorites: () => api.get('/academy/favorites').then((r) => r.data.data),
  addFavorite: (courseId: string) => api.post(`/academy/favorites/${courseId}`).then((r) => r.data.data),
  removeFavorite: (courseId: string) => api.delete(`/academy/favorites/${courseId}`),
  submitCourseReview: (courseId: string, rating: number, content: string) => api.post(`/academy/courses/${courseId}/reviews`, { rating, content }).then(r => r.data.data),

  getLessonBySlug: (courseSlug: string, lessonSlug: string) =>
    api.get(`/academy/courses/${courseSlug}/lessons/${lessonSlug}`).then((r) => r.data.data),
  saveLessonNote: (lessonId: string, content: string, videoTimestamp?: number) =>
    api.put(`/academy/lessons/${lessonId}/note`, { content, videoTimestamp }).then((r) => r.data.data),
  deleteLessonNote: (lessonId: string) => api.delete(`/academy/lessons/${lessonId}/note`),

  // Progress
  markLessonComplete: (lessonId: string) =>
    api.post(`/academy/progress/lesson/${lessonId}/complete`).then((r) => r.data),

  updateVideoProgress: (lessonId: string, watchedSeconds: number) =>
    api.patch(`/academy/progress/lesson/${lessonId}/video`, { watchedSeconds }).then((r) => r.data),

  getCourseProgress: (courseId: string) =>
    api.get(`/academy/progress/course/${courseId}`).then((r) => r.data.data),
  getLearningDashboard: () => api.get('/academy/progress/dashboard').then(r => r.data.data),
  updateLearningGoal: (weeklyMinutesGoal: number) => api.patch('/academy/progress/goal', { weeklyMinutesGoal }).then(r => r.data.data),

  // Quizzes
  getStandaloneQuizzes: () =>
    api.get('/academy/quizzes').then((r) => r.data.data),

  getStandaloneQuiz: (quizId: string) =>
    api.get(`/academy/quizzes/${quizId}`).then((r) => r.data.data),

  submitQuizAttempt: (quizId: string, answers: { questionId: string; selectedOptionIds: string[] }[]) =>
    api.post(`/academy/quizzes/${quizId}/attempt`, { answers }).then((r) => r.data.data),

  getLessonQuiz: (lessonId: string) =>
    api.get(`/academy/lessons/${lessonId}/quiz`).then((r) => r.data.data),

  // Certificates
  getCertificates: () =>
    api.get('/academy/certificates').then((r) => r.data.data),

  getCertificateDownloadUrl: (code: string) => `/api/academy/certificates/download/${code}`,
  downloadCertificate: (code: string) => api.get(`/academy/certificates/download/${code}`, { responseType: 'blob' }).then(r => r.data as Blob),
  adminAnalyticsDashboard: (days = 30) => api.get(`/academy/admin/analytics/dashboard?days=${days}`).then((r) => r.data.data),
  adminAnalyticsCustomers: (search = '') => api.get(`/academy/admin/analytics/customers?search=${encodeURIComponent(search)}`).then((r) => r.data.data),
  adminGrantCustomerCourse: (userId: string, courseId: string) => api.post(`/academy/admin/analytics/customers/${userId}/courses`, { courseId }).then((r) => r.data.data),
  adminRevokeCustomerCourse: (userId: string, courseId: string) => api.delete(`/academy/admin/analytics/customers/${userId}/courses/${courseId}`).then((r) => r.data.data),

  verifyCertificate: (code: string) =>
    api.get(`/academy/certificates/verify/${code}`).then((r) => r.data.data),
  adminCertificates: () => api.get('/academy/admin/certificates').then(r => r.data.data),
  adminRevokeCertificate: (code: string, reason: string) => api.post(`/academy/admin/certificates/${code}/revoke`, { reason }).then(r => r.data.data),
  adminReissueCertificate: (code: string) => api.post(`/academy/admin/certificates/${code}/reissue`).then(r => r.data.data),
  adminReviews: () => api.get('/academy/admin/reviews').then(r => r.data.data),
  adminModerateReview: (id: string, isApproved: boolean) => api.patch(`/academy/admin/reviews/${id}`, { isApproved }).then(r => r.data.data),

  // Academy studio — administrator only
  adminGetCourses: () => api.get('/academy/admin/courses').then((r) => r.data.data),
  adminCreateCourse: (data: Record<string, unknown>) => api.post('/academy/admin/courses', data).then((r) => r.data.data),
  adminUpdateCourse: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/courses/${id}`, data).then((r) => r.data.data),
  adminGetBundles: () => api.get('/academy/admin/bundles').then((r) => r.data.data),
  adminCreateBundle: (data: Record<string, unknown>) => api.post('/academy/admin/bundles', data).then((r) => r.data.data),
  adminUpdateBundle: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/bundles/${id}`, data).then((r) => r.data.data),
  adminDeleteBundle: (id: string) => api.delete(`/academy/admin/bundles/${id}`).then((r) => r.data.data),
  adminGetLegal: () => api.get('/academy/admin/legal').then((r) => r.data.data),
  adminUpdateSeller: (data: Record<string, unknown>) => api.patch('/academy/admin/legal/seller', data).then((r) => r.data.data),
  adminUpdateLegalDocument: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/legal/documents/${id}`, data).then((r) => r.data.data),
  adminGetOrders: (status = 'ALL', search = '') => api.get(`/academy/admin/orders?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`).then((r) => r.data.data),
  adminRefundOrder: (orderId: string, data: { amount?: number; reason?: string }) => api.post(`/academy/admin/orders/${orderId}/refund`, data).then((r) => r.data.data),
  adminGetMarketing: () => api.get('/academy/admin/marketing').then(r => r.data.data),
  adminSendMarketingCampaign: (data: Record<string,unknown>) => api.post('/academy/admin/marketing/send-campaign',data).then(r=>r.data.data),
  adminGetCampaigns:()=>api.get('/academy/admin/marketing/campaigns').then(r=>r.data.data),
  adminTestCampaign:(data:Record<string,unknown>)=>api.post('/academy/admin/marketing/test-campaign',data).then(r=>r.data.data),
  adminGetAcademyMedia:()=>api.get('/academy/admin/marketing/media').then(r=>r.data.data),
  adminUploadAcademyMedia:(image:File,data:{alt:string;kind:string;cropX:number;cropY:number})=>{const body=new FormData();body.append('image',image);Object.entries(data).forEach(([key,value])=>body.append(key,String(value)));return api.post('/academy/admin/marketing/media',body).then(r=>r.data.data);},
  adminUpdateLead:(id:string,data:Record<string,unknown>)=>api.patch(`/academy/admin/marketing/leads/${id}`,data).then(r=>r.data.data),
  adminDeleteLead:(id:string)=>api.delete(`/academy/admin/marketing/leads/${id}`).then(r=>r.data.data),
  adminGetOperations:()=>api.get('/academy/admin/operations').then(r=>r.data.data),
  adminResolveOperationalEvent:(id:string)=>api.patch(`/academy/admin/operations/events/${id}/resolve`).then(r=>r.data.data),
  adminCreateMarketing: (kind: string, data: Record<string, unknown>) => api.post(`/academy/admin/marketing/${kind}`, data).then(r => r.data.data),
  adminUpdateMarketing: (kind: string, id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/marketing/${kind}/${id}`, data).then(r => r.data.data),
  adminDeleteMarketing: (kind: string, id: string) => api.delete(`/academy/admin/marketing/${kind}/${id}`).then(r => r.data.data),
  adminCreateModule: (courseId: string, data: { title: string; order?: number }) => api.post(`/academy/admin/courses/${courseId}/modules`, data).then((r) => r.data.data),
  adminCreateLesson: (moduleId: string, data: Record<string, unknown>) => api.post(`/academy/admin/modules/${moduleId}/lessons`, data).then((r) => r.data.data),
  adminUploadLessonImage: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return api.post('/academy/admin/lesson-images', formData).then((r) => r.data.data);
  },
  adminCreateCheckpoint: (moduleId: string, data: { title: string; order?: number; passingScore?: number }) => api.post(`/academy/admin/modules/${moduleId}/checkpoints`, data).then((r) => r.data.data),
  adminUpdateLesson: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/lessons/${id}`, data).then((r) => r.data.data),
  adminCreateQuiz: (data: Record<string, unknown>) => api.post('/academy/admin/quizzes', data).then((r) => r.data.data),
  adminCreateQuestion: (quizId: string, data: Record<string, unknown>) => api.post(`/academy/admin/quizzes/${quizId}/questions`, data).then((r) => r.data.data),

  // Academy-only support — deliberately separate from the salon chat.
  getMySupportThread: () => api.get('/academy/support/my-thread').then((r) => r.data.data),
  sendSupportMessage: (input: { content: string; category: string; attachment?: File; sensitiveDataConsent?: boolean; courseId?: string; lessonId?: string }) => {
    const formData = new FormData();
    formData.append('content', input.content);
    formData.append('category', input.category);
    if (input.courseId) formData.append('courseId', input.courseId);
    if (input.lessonId) formData.append('lessonId', input.lessonId);
    if (input.attachment) formData.append('attachment', input.attachment);
    formData.append('sensitiveDataConsent', String(Boolean(input.sensitiveDataConsent)));
    return api.post('/academy/support/messages', formData).then((r) => r.data.data);
  },
  rateSupportThread: (threadId: string, rating: number, comment = '') => api.post(`/academy/support/threads/${threadId}/rating`, { rating, comment }).then(r => r.data.data),
  getSupportAttachment: (url: string) => api.get(new URL(url, window.location.origin).toString(), { responseType: 'blob' }).then(r => r.data as Blob),
  adminSupportThreads: () => api.get('/academy/admin/support/threads').then((r) => r.data.data),
  adminMarkSupportRead: (threadId: string) => api.post(`/academy/admin/support/threads/${threadId}/read`),
  adminSendSupportMessage: (threadId: string, content: string) => api.post(`/academy/admin/support/threads/${threadId}/messages`, { content }).then((r) => r.data.data),
  adminSetSupportStatus: (threadId: string, status: string) => api.patch(`/academy/admin/support/threads/${threadId}/status`, { status }).then(r => r.data.data),
};

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

  // Attachments
  downloadAttachmentUrl: (lessonId: string, attachmentId: string) => `/api/academy/lessons/${lessonId}/attachments/${attachmentId}/download`,

  // Comments
  getLessonComments: (lessonId: string) => api.get(`/academy/lessons/${lessonId}/comments`).then((r) => r.data.data),
  addLessonComment: (lessonId: string, content: string) => api.post(`/academy/lessons/${lessonId}/comments`, { content }).then((r) => r.data.data),
  addCommentReply: (commentId: string, content: string) => api.post(`/academy/comments/${commentId}/replies`, { content }).then((r) => r.data.data),
  deleteComment: (commentId: string) => api.delete(`/academy/comments/${commentId}`),

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
  adminUploadLessonImage: (image: File | Blob, folder?: string) => {
    const formData = new FormData();
    // Blob z kadrowania nie ma nazwy — serwer i tak nadaje własną, ale multer
    // wymaga nazwy pliku, żeby rozpoznać pole jako plik.
    formData.append('image', image, image instanceof File ? image.name : 'kadr.webp');
    if (folder) formData.append('folder', folder);
    return api.post('/academy/admin/lesson-images', formData).then((r) => r.data.data);
  },
  adminCreateCheckpoint: (moduleId: string, data: { title: string; order?: number; passingScore?: number }) => api.post(`/academy/admin/modules/${moduleId}/checkpoints`, data).then((r) => r.data.data),
  adminUpdateLesson: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/lessons/${id}`, data).then((r) => r.data.data),
  adminDeleteLesson: (id: string) => api.delete(`/academy/admin/lessons/${id}`).then((r) => r.data),
  adminCreateQuiz: (data: Record<string, unknown>) => api.post('/academy/admin/quizzes', data).then((r) => r.data.data),
  adminCreateQuestion: (quizId: string, data: Record<string, unknown>) => api.post(`/academy/admin/quizzes/${quizId}/questions`, data).then((r) => r.data.data),

  // Admin — kursy: usuwanie, kolejność, moduły
  adminDeleteCourse: (id: string) => api.delete(`/academy/admin/courses/${id}`).then((r) => r.data),
  adminReorderModules: (courseId: string, order: string[]) => api.put(`/academy/admin/courses/${courseId}/reorder-modules`, { order }).then((r) => r.data),
  adminReorderLessons: (moduleId: string, order: string[]) => api.put(`/academy/admin/modules/${moduleId}/reorder-lessons`, { order }).then((r) => r.data),
  adminUpdateModule: (moduleId: string, data: { title?: string; order?: number }) => api.patch(`/academy/admin/modules/${moduleId}`, data).then((r) => r.data.data),
  adminDeleteModule: (moduleId: string) => api.delete(`/academy/admin/modules/${moduleId}`).then((r) => r.data),

  // Admin — prowadzące
  adminGetInstructors: () => api.get('/academy/admin/instructors').then((r) => r.data.data),
  adminCreateInstructor: (data: Record<string, unknown>) => api.post('/academy/admin/instructors', data).then((r) => r.data.data),
  adminUpdateInstructor: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/instructors/${id}`, data).then((r) => r.data.data),
  adminDeleteInstructor: (id: string) => api.delete(`/academy/admin/instructors/${id}`).then((r) => r.data.data),

  // Admin — quizy
  adminGetQuizzes: () => api.get('/academy/admin/quizzes').then((r) => r.data.data),
  adminGetQuiz: (id: string) => api.get(`/academy/admin/quizzes/${id}`).then((r) => r.data.data),
  adminUpdateQuiz: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/quizzes/${id}`, data).then((r) => r.data.data),
  adminDeleteQuiz: (id: string) => api.delete(`/academy/admin/quizzes/${id}`).then((r) => r.data),
  adminUpdateQuestion: (questionId: string, data: Record<string, unknown>) => api.patch(`/academy/admin/questions/${questionId}`, data).then((r) => r.data.data),
  adminDeleteQuestion: (questionId: string) => api.delete(`/academy/admin/questions/${questionId}`).then((r) => r.data),

  // Admin attachments
  adminAddAttachment: (lessonId: string, file: File, description?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (description) fd.append('description', description);
    return api.post(`/academy/admin/lessons/${lessonId}/attachments`, fd).then((r) => r.data.data);
  },
  adminDeleteAttachment: (id: string) => api.delete(`/academy/admin/attachments/${id}`).then((r) => r.data),

  // Admin case studies
  adminCreateCaseStudy: (lessonId: string, data: Record<string, unknown>) => api.post(`/academy/admin/lessons/${lessonId}/case-studies`, data).then((r) => r.data.data),
  adminUpdateCaseStudy: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/case-studies/${id}`, data).then((r) => r.data.data),
  adminDeleteCaseStudy: (id: string) => api.delete(`/academy/admin/case-studies/${id}`).then((r) => r.data),
  adminAddCaseStudyImage: (caseStudyId: string, file: File, type: string, caption?: string) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('type', type);
    if (caption) fd.append('caption', caption);
    return api.post(`/academy/admin/case-studies/${caseStudyId}/images`, fd).then((r) => r.data.data);
  },
  adminDeleteCaseStudyImage: (id: string) => api.delete(`/academy/admin/case-study-images/${id}`).then((r) => r.data),

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

  // ── Skin Atlas ──────────────────────────────────────────
  getAtlasRegions: (parentId?: string | null) =>
    api.get('/academy/atlas/regions', { params: parentId !== undefined ? { parentId } : {} }).then(r => r.data.data),
  getAtlasRegion: (slug: string) => api.get(`/academy/atlas/${slug}`).then(r => r.data.data),
  getAtlasCondition: (region: string, condition: string) =>
    api.get(`/academy/atlas/${region}/${condition}`).then(r => r.data.data),
  getAtlasQuizQuestions: (region?: string) =>
    api.get(region ? `/academy/atlas/quiz/${region}` : '/academy/atlas/quiz').then(r => r.data.data),
  submitAtlasQuiz: (data: { regionSlug?: string; answers: { questionId: string; selectedAnswerId: string }[] }) =>
    api.post('/academy/atlas/quiz', data).then(r => r.data.data),

  // Atlas Admin
  adminGetAtlasRegions: () => api.get('/academy/admin/atlas/regions').then(r => r.data.data),
  adminCreateAtlasRegion: (data: Record<string, unknown>) => api.post('/academy/admin/atlas/regions', data).then(r => r.data.data),
  adminUpdateAtlasRegion: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/atlas/regions/${id}`, data).then(r => r.data.data),
  adminDeleteAtlasRegion: (id: string) => api.delete(`/academy/admin/atlas/regions/${id}`),
  adminCreateAtlasCondition: (data: Record<string, unknown>) => api.post('/academy/admin/atlas/conditions', data).then(r => r.data.data),
  adminUpdateAtlasCondition: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/atlas/conditions/${id}`, data).then(r => r.data.data),
  adminDeleteAtlasCondition: (id: string) => api.delete(`/academy/admin/atlas/conditions/${id}`),
  adminCreateAtlasQuizQuestion: (data: Record<string, unknown>) => api.post('/academy/admin/atlas/questions', data).then(r => r.data.data),
  adminDeleteAtlasQuizQuestion: (id: string) => api.delete(`/academy/admin/atlas/questions/${id}`),
  adminUploadAtlasImage: (formData: FormData) => api.post('/academy/admin/atlas/images', formData).then(r => r.data.data),
  adminDeleteAtlasImage: (id: string) => api.delete(`/academy/admin/atlas/images/${id}`),

  // ── Diagnostic Cases ────────────────────────────────────
  getDiagnosticCasesForCourse: (courseSlug: string) =>
    api.get(`/academy/diagnostic-cases/course/${courseSlug}`).then(r => r.data.data),
  getDiagnosticCase: (id: string) => api.get(`/academy/diagnostic-cases/${id}`).then(r => r.data.data),
  submitDiagnosticCaseAttempt: (id: string, stepAnswers: { stepId: string; selectedAnswerIds: string[] }[]) =>
    api.post(`/academy/diagnostic-cases/${id}/attempt`, { stepAnswers }).then(r => r.data.data),

  // Diagnostic Cases Admin
  adminGetDiagnosticCases: () => api.get('/academy/admin/diagnostic-cases').then(r => r.data.data),
  adminGetDiagnosticCase: (id: string) => api.get(`/academy/admin/diagnostic-cases/${id}`).then(r => r.data.data),
  adminCreateDiagnosticCase: (data: Record<string, unknown>) => api.post('/academy/admin/diagnostic-cases', data).then(r => r.data.data),
  adminUpdateDiagnosticCase: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/diagnostic-cases/${id}`, data).then(r => r.data.data),
  adminDeleteDiagnosticCase: (id: string) => api.delete(`/academy/admin/diagnostic-cases/${id}`),
  adminGetDiagnosticCaseStats: (id: string) => api.get(`/academy/admin/diagnostic-cases/${id}/stats`).then(r => r.data.data),
  adminUploadDiagnosticCaseImage: (formData: FormData) =>
    api.post('/academy/admin/diagnostic-cases/images', formData).then(r => r.data.data),
};

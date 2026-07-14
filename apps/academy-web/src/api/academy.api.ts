import { api } from '@/lib/axios';

export const academyApi = {
  logout: () => api.post('/academy/auth/logout').then(() => undefined),
  // Public storefront
  getPublicCourses: () => api.get('/academy/public/courses').then((r) => r.data.data),
  getPublicCourseBySlug: (slug: string) => api.get(`/academy/public/courses/${slug}`).then((r) => r.data.data),
  // Courses
  getCourses: () =>
    api.get('/academy/courses').then((r) => r.data.data),

  getCourseBySlug: (slug: string) =>
    api.get(`/academy/courses/${slug}`).then((r) => r.data.data),

  getLessonBySlug: (courseSlug: string, lessonSlug: string) =>
    api.get(`/academy/courses/${courseSlug}/lessons/${lessonSlug}`).then((r) => r.data.data),

  // Progress
  markLessonComplete: (lessonId: string) =>
    api.post(`/academy/progress/lesson/${lessonId}/complete`).then((r) => r.data),

  updateVideoProgress: (lessonId: string, watchedSeconds: number) =>
    api.patch(`/academy/progress/lesson/${lessonId}/video`, { watchedSeconds }).then((r) => r.data),

  getCourseProgress: (courseId: string) =>
    api.get(`/academy/progress/course/${courseId}`).then((r) => r.data.data),

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

  verifyCertificate: (code: string) =>
    api.get(`/academy/certificates/verify/${code}`).then((r) => r.data.data),

  // Academy studio — administrator only
  adminGetCourses: () => api.get('/academy/admin/courses').then((r) => r.data.data),
  adminCreateCourse: (data: Record<string, unknown>) => api.post('/academy/admin/courses', data).then((r) => r.data.data),
  adminUpdateCourse: (id: string, data: Record<string, unknown>) => api.patch(`/academy/admin/courses/${id}`, data).then((r) => r.data.data),
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
  sendSupportMessage: (content: string) => api.post('/academy/support/messages', { content }).then((r) => r.data.data),
  adminSupportThreads: () => api.get('/academy/admin/support/threads').then((r) => r.data.data),
  adminSendSupportMessage: (threadId: string, content: string) => api.post(`/academy/admin/support/threads/${threadId}/messages`, { content }).then((r) => r.data.data),
};

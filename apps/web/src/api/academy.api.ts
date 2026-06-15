import { api } from '@/lib/axios';

export const academyApi = {
  // === User: Courses ===
  getCourses: () =>
    api.get('/academy/courses').then((r) => r.data.data),

  getCourseBySlug: (slug: string) =>
    api.get(`/academy/courses/${slug}`).then((r) => r.data.data),

  getLessonBySlug: (courseSlug: string, lessonSlug: string) =>
    api.get(`/academy/courses/${courseSlug}/lessons/${lessonSlug}`).then((r) => r.data.data),

  // === User: Progress ===
  markLessonComplete: (lessonId: string) =>
    api.post(`/academy/progress/lesson/${lessonId}/complete`).then((r) => r.data),

  updateVideoProgress: (lessonId: string, watchedSeconds: number) =>
    api.patch(`/academy/progress/lesson/${lessonId}/video`, { watchedSeconds }).then((r) => r.data),

  getCourseProgress: (courseId: string) =>
    api.get(`/academy/progress/course/${courseId}`).then((r) => r.data.data),

  // === User: Quizzes ===
  getStandaloneQuizzes: () =>
    api.get('/academy/quizzes').then((r) => r.data.data),

  getStandaloneQuiz: (quizId: string) =>
    api.get(`/academy/quizzes/${quizId}`).then((r) => r.data.data),

  submitQuizAttempt: (quizId: string, answers: { questionId: string; selectedOptionIds: string[] }[]) =>
    api.post(`/academy/quizzes/${quizId}/attempt`, { answers }).then((r) => r.data.data),

  getLessonQuiz: (lessonId: string) =>
    api.get(`/academy/lessons/${lessonId}/quiz`).then((r) => r.data.data),

  // === User: Certificates ===
  getCertificates: () =>
    api.get('/academy/certificates').then((r) => r.data.data),

  getCertificateDownloadUrl: (code: string) => `/api/academy/certificates/download/${code}`,

  verifyCertificate: (code: string) =>
    api.get(`/academy/certificates/verify/${code}`).then((r) => r.data.data),

  // === Admin: Access Management ===
  searchUsers: (q: string) =>
    api.get('/users/search', { params: { q } }).then((r) => r.data.data),

  grantAccess: (userId: string, expiresAt?: string) =>
    api.post('/academy/access/grant', { userId, expiresAt }).then((r) => r.data),

  revokeAccess: (userId: string) =>
    api.post('/academy/access/revoke', { userId }).then((r) => r.data),

  getAccessLog: (userId: string) =>
    api.get(`/academy/access/log/${userId}`).then((r) => r.data.data),

  // === Admin: Courses ===
  adminGetCourses: () =>
    api.get('/academy/admin/courses').then((r) => r.data.data),

  adminCreateCourse: (data: {
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimatedMinutes?: number;
    tags?: string[];
    thumbnailUrl?: string;
    status?: string;
  }) => api.post('/academy/admin/courses', data).then((r) => r.data.data),

  adminUpdateCourse: (id: string, data: Partial<{
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimatedMinutes: number;
    tags: string[];
    thumbnailUrl: string;
    status: string;
    isActive: boolean;
  }>) => api.patch(`/academy/admin/courses/${id}`, data).then((r) => r.data.data),

  adminDeleteCourse: (id: string) =>
    api.delete(`/academy/admin/courses/${id}`).then((r) => r.data),

  adminReorderModules: (courseId: string, order: string[]) =>
    api.put(`/academy/admin/courses/${courseId}/reorder-modules`, { order }).then((r) => r.data),

  adminReorderLessons: (moduleId: string, order: string[]) =>
    api.put(`/academy/admin/modules/${moduleId}/reorder-lessons`, { order }).then((r) => r.data),

  // === Admin: Modules ===
  adminCreateModule: (courseId: string, data: { title: string; order?: number }) =>
    api.post(`/academy/admin/courses/${courseId}/modules`, data).then((r) => r.data.data),

  adminUpdateModule: (moduleId: string, data: { title?: string; order?: number }) =>
    api.patch(`/academy/admin/modules/${moduleId}`, data).then((r) => r.data.data),

  adminDeleteModule: (moduleId: string) =>
    api.delete(`/academy/admin/modules/${moduleId}`).then((r) => r.data),

  // === Admin: Lessons ===
  adminCreateLesson: (moduleId: string, data: {
    title: string;
    slug: string;
    type: string;
    videoProvider?: string;
    videoId?: string;
    contentHtml?: string;
    estimatedMinutes?: number;
    order?: number;
    isRequired?: boolean;
  }) => api.post(`/academy/admin/modules/${moduleId}/lessons`, data).then((r) => r.data.data),

  adminUpdateLesson: (id: string, data: Record<string, unknown>) =>
    api.patch(`/academy/admin/lessons/${id}`, data).then((r) => r.data.data),

  adminDeleteLesson: (id: string) =>
    api.delete(`/academy/admin/lessons/${id}`).then((r) => r.data),

  // === Admin: Quizzes ===
  adminGetQuizzes: () =>
    api.get('/academy/admin/quizzes').then((r) => r.data.data),

  adminGetQuiz: (id: string) =>
    api.get(`/academy/admin/quizzes/${id}`).then((r) => r.data.data),

  adminCreateQuiz: (data: {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    passingScore?: number;
    maxAttempts?: number;
    timeLimitMinutes?: number;
    lessonId?: string;
  }) => api.post('/academy/admin/quizzes', data).then((r) => r.data.data),

  adminUpdateQuiz: (id: string, data: Partial<{
    title: string;
    description: string;
    thumbnailUrl: string;
    passingScore: number;
    maxAttempts: number;
    timeLimitMinutes: number;
    isPublished: boolean;
  }>) => api.patch(`/academy/admin/quizzes/${id}`, data).then((r) => r.data.data),

  adminDeleteQuiz: (id: string) =>
    api.delete(`/academy/admin/quizzes/${id}`).then((r) => r.data),

  adminCreateQuestion: (quizId: string, data: {
    text: string;
    type: string;
    order?: number;
    explanation?: string;
    options: { text: string; isCorrect: boolean; order?: number }[];
  }) => api.post(`/academy/admin/quizzes/${quizId}/questions`, data).then((r) => r.data.data),

  adminUpdateQuestion: (questionId: string, data: Record<string, unknown>) =>
    api.patch(`/academy/admin/questions/${questionId}`, data).then((r) => r.data.data),

  adminDeleteQuestion: (questionId: string) =>
    api.delete(`/academy/admin/questions/${questionId}`).then((r) => r.data),
};

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  questionCreate: vi.fn(),
  questionUpdate: vi.fn(),
  optionDeleteMany: vi.fn(),
  transaction: vi.fn(),
  quizFindUnique: vi.fn(),
  attemptCount: vi.fn(),
  attemptCreate: vi.fn(),
  enrollmentFindUnique: vi.fn(),
  certificateFindFirst: vi.fn(),
  issueCertificate: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({ prisma: {
  academyQuizQuestion: { create: mocks.questionCreate, update: mocks.questionUpdate },
  academyQuizOption: { deleteMany: mocks.optionDeleteMany },
  academyQuiz: { findUnique: mocks.quizFindUnique },
  academyQuizAttempt: { count: mocks.attemptCount, create: mocks.attemptCreate },
  academyEnrollment: { findUnique: mocks.enrollmentFindUnique },
  academyCertificate: { findFirst: mocks.certificateFindFirst },
  $transaction: mocks.transaction,
} }));

vi.mock('../certificates/certificates.service', () => ({ issueCertificate: mocks.issueCertificate }));

import { createQuestion, submitAttempt, updateQuestion } from './quizzes.service';

const twoOptions = [
  { text: 'Poprawna', isCorrect: true },
  { text: 'Błędna', isCorrect: false },
];

describe('Walidacja odpowiedzi w pytaniach quizu', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    // $transaction dostaje callback z klientem — w teście podajemy ten sam mock.
    mocks.transaction.mockImplementation((fn: any) => fn({
      academyQuizOption: { deleteMany: mocks.optionDeleteMany },
      academyQuizQuestion: { update: mocks.questionUpdate },
    }));
  });

  it('odrzuca pytanie z jedną odpowiedzią', async () => {
    await expect(createQuestion('quiz-1', { text: 'Pytanie', type: 'SINGLE_CHOICE', options: [{ text: 'Jedyna', isCorrect: true }] } as any))
      .rejects.toThrow('co najmniej dwie odpowiedzi');
    expect(mocks.questionCreate).not.toHaveBeenCalled();
  });

  it('odrzuca pytanie bez zaznaczonej poprawnej odpowiedzi', async () => {
    await expect(createQuestion('quiz-1', { text: 'Pytanie', type: 'SINGLE_CHOICE', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] } as any))
      .rejects.toThrow('poprawną odpowiedź');
  });

  it('pomija odpowiedzi z pustą treścią przed sprawdzeniem liczby', async () => {
    await expect(createQuestion('quiz-1', { text: 'Pytanie', type: 'SINGLE_CHOICE', options: [...twoOptions, { text: '   ', isCorrect: false }] } as any))
      .resolves.toBeUndefined();
    expect(mocks.questionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ options: { create: [
        { text: 'Poprawna', isCorrect: true, order: 0 },
        { text: 'Błędna', isCorrect: false, order: 1 },
      ] } }),
    }));
  });

  it('podmienia wszystkie odpowiedzi przy edycji pytania', async () => {
    await updateQuestion('question-1', { text: 'Poprawione', options: twoOptions });
    expect(mocks.optionDeleteMany).toHaveBeenCalledWith({ where: { questionId: 'question-1' } });
    expect(mocks.questionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'question-1' },
      data: expect.objectContaining({ text: 'Poprawione', options: { create: expect.any(Array) } }),
    }));
  });

  it('nie rusza odpowiedzi, gdy edycja ich nie zawiera', async () => {
    await updateQuestion('question-1', { explanation: 'Nowe wyjaśnienie' });
    expect(mocks.optionDeleteMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.questionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { explanation: 'Nowe wyjaśnienie' },
    }));
  });
});

const lessonQuiz = {
  id: 'quiz-lesson',
  isPublished: true,
  lessonId: 'lesson-1',
  passingScore: 50,
  maxAttempts: 3,
  questions: [{ id: 'q1', options: [{ id: 'o1', isCorrect: true }, { id: 'o2', isCorrect: false }] }],
  lesson: { module: { courseId: 'course-b', course: { accessDays: null } } },
};

describe('Podejście do quizu — kontrola dostępu', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.transaction.mockImplementation((fn: any) => fn({ academyQuizAttempt: { count: mocks.attemptCount, create: mocks.attemptCreate } }));
    mocks.attemptCount.mockResolvedValue(0);
    mocks.attemptCreate.mockResolvedValue({ id: 'attempt-1' });
    mocks.certificateFindFirst.mockResolvedValue(null);
    mocks.issueCertificate.mockResolvedValue({ id: 'cert-1' });
  });

  it('blokuje quiz z lekcji kursu, którego użytkowniczka nie kupiła', async () => {
    mocks.quizFindUnique.mockResolvedValue(lessonQuiz);
    mocks.enrollmentFindUnique.mockResolvedValue(null);

    await expect(submitAttempt('user-1', 'quiz-lesson', [])).rejects.toThrow('Kup kurs');
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
    expect(mocks.issueCertificate).not.toHaveBeenCalled();
  });

  it('blokuje quiz z lekcji, gdy dostęp do kursu wygasł', async () => {
    mocks.quizFindUnique.mockResolvedValue({ ...lessonQuiz, lesson: { module: { courseId: 'course-b', course: { accessDays: 30 } } } });
    mocks.enrollmentFindUnique.mockResolvedValue({ purchasedAt: new Date(Date.now() - 60 * 86_400_000), accessExpiresAt: null });

    await expect(submitAttempt('user-1', 'quiz-lesson', [])).rejects.toThrow('Kup kurs');
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it('przepuszcza quiz z lekcji, gdy dostęp do kursu jest aktywny', async () => {
    mocks.quizFindUnique.mockResolvedValue(lessonQuiz);
    mocks.enrollmentFindUnique.mockResolvedValue({ purchasedAt: new Date(), accessExpiresAt: null });

    const result = await submitAttempt('user-1', 'quiz-lesson', [{ questionId: 'q1', selectedOptionIds: ['o1'] }]);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('odrzuca quiz, który nie jest opublikowany', async () => {
    mocks.quizFindUnique.mockResolvedValue({ ...lessonQuiz, isPublished: false });

    await expect(submitAttempt('user-1', 'quiz-lesson', [])).rejects.toThrow('nie jest opublikowany');
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it('nie wywraca się na braku tablicy odpowiedzi', async () => {
    mocks.quizFindUnique.mockResolvedValue({ ...lessonQuiz, lesson: null, lessonId: null });

    const result = await submitAttempt('user-1', 'quiz-standalone', undefined as never);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('sprawdza limit prób w tej samej transakcji co zapis podejścia', async () => {
    mocks.quizFindUnique.mockResolvedValue({ ...lessonQuiz, lesson: null, lessonId: null });
    mocks.attemptCount.mockResolvedValue(3);

    await expect(submitAttempt('user-1', 'quiz-standalone', [])).rejects.toThrow('limit');
    expect(mocks.transaction).toHaveBeenCalled();
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });
});

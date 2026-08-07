import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  questionCreate: vi.fn(),
  questionUpdate: vi.fn(),
  optionDeleteMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({ prisma: {
  academyQuizQuestion: { create: mocks.questionCreate, update: mocks.questionUpdate },
  academyQuizOption: { deleteMany: mocks.optionDeleteMany },
  $transaction: mocks.transaction,
} }));

import { createQuestion, updateQuestion } from './quizzes.service';

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

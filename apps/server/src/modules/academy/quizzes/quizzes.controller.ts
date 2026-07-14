import { Request, Response, NextFunction } from 'express';
import * as quizzesService from './quizzes.service';

export const getQuizForLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizzesService.getQuizForLesson(req.params.lessonId);
    res.json({ data: quiz });
  } catch (error) {
    next(error);
  }
};

export const listStandaloneQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizzes = await quizzesService.listStandaloneQuizzes(req.academyUser!.id);
    res.json({ data: quizzes });
  } catch (error) {
    next(error);
  }
};

export const getStandaloneQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizzesService.getStandaloneQuiz(req.params.quizId);
    res.json({ data: quiz });
  } catch (error) {
    next(error);
  }
};

export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const result = await quizzesService.submitAttempt(userId, req.params.quizId, req.body.answers);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const adminListQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizzes = await quizzesService.adminListQuizzes();
    res.json({ data: quizzes });
  } catch (error) {
    next(error);
  }
};

export const adminGetQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizzesService.adminGetQuiz(req.params.id);
    res.json({ data: quiz });
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizzesService.createQuiz(req.body);
    res.status(201).json({ data: quiz });
  } catch (error) {
    next(error);
  }
};

export const updateQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizzesService.updateQuiz(req.params.id, req.body);
    res.json({ data: quiz });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quizzesService.deleteQuiz(req.params.id);
    res.json({ message: 'Quiz usunięty' });
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = await quizzesService.createQuestion(req.params.quizId, req.body);
    res.status(201).json({ data: question });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = await quizzesService.updateQuestion(req.params.questionId, req.body);
    res.json({ data: question });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quizzesService.deleteQuestion(req.params.questionId);
    res.json({ message: 'Pytanie usunięte' });
  } catch (error) {
    next(error);
  }
};

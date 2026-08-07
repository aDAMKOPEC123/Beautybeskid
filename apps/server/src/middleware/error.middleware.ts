// filepath: apps/server/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  /** Opcjonalny kod dla klienta, gdy sama treść komunikatu nie wystarcza do reakcji UI. */
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        status: 'error',
        message: 'Plik jest za duży. Maksymalny rozmiar to 5 MB.'
      });
      return;
    }

    res.status(400).json({
      status: 'error',
      message: err.message || 'Nieprawidłowy plik.'
    });
    return;
  }

  // Handle Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ status: 'error', message: 'Nie znaleziono zasobu' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ status: 'error', message: 'Zasób już istnieje' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ status: 'error', message: 'Nieprawidłowe referencje danych' });
      return;
    }
    console.error('Prisma error:', err.code, err.message);
    res.status(500).json({ status: 'error', message: 'Błąd bazy danych' });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Wewnętrzny błąd serwera';

  const code = typeof err.code === 'string' && err.isOperational ? { code: err.code } : {};

  if (env.NODE_ENV === 'development') {
    const devStatus = err.name === 'ZodError' ? 400 : statusCode;
    res.status(devStatus).json({
      status: 'error',
      message: err.name === 'ZodError' ? err.issues : message,
      ...code,
      stack: err.stack,
      error: err
    });
  } else {
    // Production
    if (err.isOperational || err.name === 'ZodError') {
      res.status(err.name === 'ZodError' ? 400 : statusCode).json({
        status: 'error',
        message: err.name === 'ZodError' ? 'Błąd walidacji danych' : message,
        ...code
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Coś poszło nie tak!'
      });
    }
  }
};

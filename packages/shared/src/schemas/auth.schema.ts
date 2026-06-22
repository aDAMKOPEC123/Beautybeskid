// filepath: packages/shared/src/schemas/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
  name: z.string().min(2, 'Imię musi mieć co najmniej 2 znaki'),
  phone: z.string().optional(),
  ambassadorCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token jest wymagany'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

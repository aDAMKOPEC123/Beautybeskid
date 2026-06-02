// filepath: apps/server/src/utils/email.ts
import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[sendEmail] Resend error:', error);
    throw new Error(`Nie udało się wysłać emaila: ${error.message}`);
  }
};

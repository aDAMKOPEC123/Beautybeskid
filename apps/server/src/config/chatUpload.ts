import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AppError } from '../middleware/error.middleware';

const CHAT_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'chat');

if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
  fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CHAT_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_MIME = /^(image\/(jpeg|jpg|png|webp|gif)|video\/(mp4|webm|quicktime|x-msvideo))$/;

export const chatUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new AppError('Dozwolone są tylko obrazy (jpeg/png/webp/gif) i filmy (mp4/webm/mov/avi)', 400));
  },
});

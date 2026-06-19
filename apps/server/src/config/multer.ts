// filepath: apps/server/src/config/multer.ts
import multer from 'multer';
import path from 'path';

// We inline the AppError definition here slightly to avoid circular dependencies before middleware is loaded or just use Error
// Since we will create error middleware next, we can just throw standard Error that error middleware catches, 
// but using the proper AppError is better so we'll import it. Assuming it's in middleware/error.middleware.ts
import { AppError } from '../middleware/error.middleware';

const storage = multer.memoryStorage(); // We use sharp to process buffer before saving

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimetypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/gif',
      'image/bmp',
      'image/tiff',
    ];
    const allowedExts = /jpeg|jpg|png|webp|heic|heif|gif|bmp|tiff|tif/;
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new AppError('Tylko pliki obrazów są dozwolone!', 400));
  },
});

import multer from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/errors';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',   // iPhone photos
  'image/heif',
  'application/pdf',
];

// 10 MB per file (phones take large photos)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage(); // Keep in memory, upload to S3 directly

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, WEBP and PDF files are allowed', 400));
  }
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,           // rc + insurance + puc
    fields: 5,          // data field + misc
    fieldSize: 100_000, // 100 KB per text field (enough for JSON payload)
  },
}).fields([
  { name: 'rc',        maxCount: 1 },
  { name: 'insurance', maxCount: 1 },
  { name: 'puc',       maxCount: 1 },
]);

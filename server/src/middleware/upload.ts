import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.resolve(__dirname, "../../../data/images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || ".bin";
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in ALLOWED_MIME_TYPES) {
      cb(null, true);
    } else {
      cb(new Error(`許可されていないファイル形式: ${file.mimetype}`));
    }
  },
});

export function deleteImage(imagePath: string | null | undefined): void {
  if (!imagePath) return;
  const fullPath = path.join(IMAGES_DIR, imagePath);
  try {
    fs.unlinkSync(fullPath);
  } catch {
    // ファイルが存在しない場合は無視
  }
}

export function cleanupUploadedFile(
  file: Express.Multer.File | undefined,
): void {
  if (!file) return;
  deleteImage(file.filename);
}

export { IMAGES_DIR };

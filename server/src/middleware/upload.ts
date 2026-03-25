import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import type { Request } from "express";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_DIR = path.resolve(__dirname, "../../../data");
const IMAGES_DIR = path.join(DEFAULT_DATA_DIR, "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const AVIF_OPTIONS = {
  quality: 50,
  effort: 4,
};
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BASE64_IMAGE_PATTERN = /^data:image\/(jpeg|jpg|png|gif|webp|avif);base64,(.+)$/;

function resolveDataDir(reqOrDataDir?: Request | string): string {
  if (typeof reqOrDataDir === "string") {
    return reqOrDataDir;
  }

  const dataDir = reqOrDataDir?.app.get("dataDir");
  return typeof dataDir === "string" && dataDir ? dataDir : DEFAULT_DATA_DIR;
}

export function getImagesDir(reqOrDataDir?: Request | string): string {
  const imagesDir = path.join(resolveDataDir(reqOrDataDir), "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  return imagesDir;
}

async function writeAvifImage(
  input: Buffer,
  reqOrDataDir?: Request | string,
): Promise<string> {
  const filename = `${uuidv4()}.avif`;
  const filePath = path.join(getImagesDir(reqOrDataDir), filename);

  await sharp(input, { animated: true })
    .rotate()
    .avif(AVIF_OPTIONS)
    .toFile(filePath);

  return filename;
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`許可されていないファイル形式: ${file.mimetype}`));
    }
  },
});

export async function saveUploadedImage(
  file: Express.Multer.File,
  req: Request,
): Promise<string> {
  return writeAvifImage(file.buffer, req);
}

export async function restoreBase64Image(
  dataUrl: string,
  reqOrDataDir?: Request | string,
): Promise<string | null> {
  const match = dataUrl.match(BASE64_IMAGE_PATTERN);
  if (!match) return null;

  return writeAvifImage(Buffer.from(match[2], "base64"), reqOrDataDir);
}

export function getImageMimeType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  return "image/jpeg";
}

export function deleteImage(
  imagePath: string | null | undefined,
  reqOrDataDir?: Request | string,
): void {
  if (!imagePath) return;
  const fullPath = path.join(getImagesDir(reqOrDataDir), imagePath);
  try {
    fs.unlinkSync(fullPath);
  } catch {
    // ファイルが存在しない場合は無視
  }
}

export function cleanupUploadedFile(
  _file: Express.Multer.File | undefined,
): void {
  // memoryStorage利用時は一時ファイルが作られない
}

export { IMAGES_DIR };

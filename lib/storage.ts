import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export interface StorageResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "StorageError";
  }
}

export function validateUpload(file: File, options: { maxSizeBytes?: number; allowedMimeTypes?: string[] } = {}) {
  const maxSize = options.maxSizeBytes || MAX_FILE_SIZE_BYTES;
  const allowed = options.allowedMimeTypes || ALLOWED_IMAGE_TYPES;

  if (file.size > maxSize) {
    throw new StorageError(
      `File size exceeds limit (${(maxSize / (1024 * 1024)).toFixed(0)}MB maximum allowed)`,
      "FILE_TOO_LARGE"
    );
  }

  if (!allowed.includes(file.type)) {
    throw new StorageError(
      `File type ${file.type} is not supported. Allowed formats: JPG, PNG, WEBP, GIF`,
      "INVALID_FILE_TYPE"
    );
  }
}

/**
 * Saves uploaded file to public/uploads directory.
 * Abstracted so S3/Cloudflare R2 can be plugged in by swapping this adapter.
 */
export async function uploadFile(
  file: File,
  subDirectory = "general"
): Promise<StorageResult> {
  validateUpload(file);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : ".jpg");
  const uniqueName = `${crypto.randomUUID()}${ext}`;

  // Local storage strategy
  const relativeUploadDir = path.join("uploads", subDirectory);
  const absoluteUploadDir = path.join(process.cwd(), "public", relativeUploadDir);

  await fs.mkdir(absoluteUploadDir, { recursive: true });

  const filePath = path.join(absoluteUploadDir, uniqueName);
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/${relativeUploadDir.replace(/\\/g, "/")}/${uniqueName}`;

  return {
    url: publicUrl,
    filename: uniqueName,
    size: file.size,
    mimeType: file.type,
  };
}

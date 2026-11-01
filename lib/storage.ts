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
 * Saves uploaded file.
 * Automatically handles Vercel / serverless read-only filesystem by generating data URIs,
 * while saving to public/uploads in writable environments.
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

  // If running in Vercel or serverless (read-only filesystem), encode as base64 data URI
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    return {
      url: dataUri,
      filename: uniqueName,
      size: file.size,
      mimeType: file.type,
    };
  }

  try {
    // Local storage strategy for local development / VPS
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
  } catch (fsErr) {
    console.warn("Local filesystem write failed, using data URI fallback:", fsErr);
    // Robust fallback: if write fails for any reason, use data URI
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    return {
      url: dataUri,
      filename: uniqueName,
      size: file.size,
      mimeType: file.type,
    };
  }
}

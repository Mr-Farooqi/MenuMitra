import crypto from "crypto";

export async function computeFileHash(file: File | ArrayBuffer | Buffer): Promise<string> {
  let buffer: Buffer;

  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file instanceof ArrayBuffer) {
    buffer = Buffer.from(file);
  } else {
    const arrayBuffer = await (file as unknown as Blob).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  return crypto.createHash("sha256").update(buffer).digest("hex");
}

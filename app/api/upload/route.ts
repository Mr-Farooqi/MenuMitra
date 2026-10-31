import { NextRequest, NextResponse } from "next/server";
import { uploadFile, StorageError } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Sanitize folder name
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const result = await uploadFile(file, safeFolder);

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
      size: result.size,
    });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

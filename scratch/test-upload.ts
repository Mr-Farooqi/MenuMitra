import { uploadFile } from "../lib/storage";

async function testUpload() {
  console.log("=== Testing uploadFile in normal mode ===");
  // Create a mock 1x1 PNG file
  const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const buffer = Buffer.from(base64Png, "base64");
  const file = new File([buffer], "test-logo.png", { type: "image/png" });

  const result1 = await uploadFile(file, "logo");
  console.log("Normal upload result:", {
    url: result1.url.substring(0, 50),
    filename: result1.filename,
    size: result1.size,
  });

  console.log("\n=== Testing uploadFile in Vercel mode ===");
  process.env.VERCEL = "1";
  const result2 = await uploadFile(file, "logo");
  console.log("Vercel mode upload result:", {
    urlStartsWithDataUri: result2.url.startsWith("data:image/png;base64,"),
    length: result2.url.length,
    filename: result2.filename,
  });

  if (!result2.url.startsWith("data:image/png;base64,")) {
    throw new Error("Vercel mode did not produce data URI");
  }

  delete process.env.VERCEL;
  console.log("\n✓ ALL UPLOAD TESTS PASSED!");
}

testUpload().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

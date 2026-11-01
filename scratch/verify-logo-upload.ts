import { prisma } from "../lib/prisma";

async function verifyLogoUploadAndRegister() {
  const baseUrl = "http://localhost:3000";
  console.log("=== Step 1: Test /api/upload endpoint ===");

  const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const buffer = Buffer.from(base64Png, "base64");
  const blob = new Blob([buffer], { type: "image/png" });
  const formData = new FormData();
  formData.append("file", blob, "restaurant-logo.png");
  formData.append("folder", "logo");

  const uploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log("Upload response status:", uploadRes.status);
  console.log("Upload response body:", uploadData);

  if (!uploadRes.ok || !uploadData.url) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }
  console.log("✓ /api/upload returned valid URL:", uploadData.url.substring(0, 40));

  console.log("\n=== Step 2: Register restaurant with the uploaded logo ===");
  const timestamp = Date.now();
  const testEmail = `logo_test_${timestamp}@example.com`;
  const testSlug = `logo-cafe-${timestamp}`;
  const testName = `Logo Cafe ${timestamp}`;

  const pkg = await prisma.package.findFirst({ where: { name: "BASIC" } });
  if (!pkg) throw new Error("No package found");

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Owner With Logo",
      email: testEmail,
      password: "Password@123",
      restaurantName: testName,
      slug: testSlug,
      packageId: pkg.id,
      phone: "9123456780",
      city: "Bengaluru",
      logo: uploadData.url,
      firstCategoryName: "Beverages",
    }),
  });

  const regData = await regRes.json();
  console.log("Registration status:", regRes.status);
  console.log("Registration result:", {
    restaurant: regData.restaurant?.name,
    logo: regData.restaurant?.logo?.substring(0, 40),
  });

  if (!regRes.ok || !regData.restaurant?.logo) {
    throw new Error(`Registration with logo failed: ${JSON.stringify(regData)}`);
  }
  console.log("✓ Registration successfully saved the logo!");

  console.log("\n=== Step 3: Verify logo in database directly ===");
  const dbRest = await prisma.restaurant.findUnique({
    where: { id: regData.restaurant.id },
  });
  console.log("DB Restaurant logo:", dbRest?.logo?.substring(0, 40));
  if (!dbRest?.logo) {
    throw new Error("Logo was not stored in database!");
  }
  console.log("✓ Logo is confirmed present in database!");

  // Clean up test restaurant
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.restaurant.delete({ where: { id: regData.restaurant.id } });
  console.log("✓ Test restaurant cleaned up.");

  console.log("\n================================================");
  console.log("LOGO UPLOAD AND REGISTRATION IS 100% WORKING!");
  console.log("================================================");
}

verifyLogoUploadAndRegister().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

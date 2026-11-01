import { PrismaClient } from "@prisma/client";
import { uploadFile, validateUpload } from "../lib/storage";

const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Verifying Food Image Upload & Menu Item Storage...\n");

  // 1. Find a restaurant and a category
  const rest = await prisma.restaurant.findFirst({
    include: { categories: true },
  });

  if (!rest || rest.categories.length === 0) {
    throw new Error("No restaurant or category found in DB for testing");
  }

  const category = rest.categories[0];
  console.log(`Using restaurant: "${rest.name}" (id: ${rest.id}), category: "${category.name}"`);

  // 2. Test validateUpload with different mime types
  console.log("\n2. Testing validateUpload with standard and variant image formats...");
  
  // Create mock File objects
  const mockPng = new File([Buffer.from("fake-png-data")], "test-paneer.png", { type: "image/png" });
  const mockJpgVariant = new File([Buffer.from("fake-jpg-data")], "test-biryani.jpg", { type: "image/jpg" });
  const mockJpeg = new File([Buffer.from("fake-jpeg-data")], "test-tikka.jpeg", { type: "image/jpeg" });
  const mockWebp = new File([Buffer.from("fake-webp-data")], "test-naan.webp", { type: "image/webp" });

  validateUpload(mockPng);
  console.log("✅ PNG validation passed");
  validateUpload(mockJpgVariant);
  console.log("✅ JPG (image/jpg variant) validation passed");
  validateUpload(mockJpeg);
  console.log("✅ JPEG validation passed");
  validateUpload(mockWebp);
  console.log("✅ WEBP validation passed");

  // 3. Test uploadFile
  console.log("\n3. Testing uploadFile('items')...");
  const uploadRes = await uploadFile(mockPng, "items");
  console.log("✅ Upload successful:");
  console.log("   URL:", uploadRes.url.substring(0, 60) + "...");
  console.log("   Filename:", uploadRes.filename);

  // 4. Test creating a menu item with the uploaded image
  console.log("\n4. Creating menu item with image...");
  const testItem = await prisma.menuItem.create({
    data: {
      restaurantId: rest.id,
      categoryId: category.id,
      name: `Test Dish ${Date.now()}`,
      description: "Delicious test food item with uploaded image",
      price: 349,
      image: uploadRes.url,
      isVeg: true,
      isAvailable: true,
      tags: JSON.stringify(["Chef Special", "Bestseller"]),
      order: 99,
    },
  });

  console.log(`✅ Menu item created with image! Item ID: ${testItem.id}`);
  console.log(`   Stored image: ${testItem.image?.substring(0, 50)}...`);

  // 5. Test updating menu item with base64 data URI (simulating local FileReader fallback)
  console.log("\n5. Updating menu item with base64 Data URI...");
  const base64DataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const updatedItem = await prisma.menuItem.update({
    where: { id: testItem.id },
    data: {
      image: base64DataUri,
    },
  });

  console.log(`✅ Menu item updated with Data URI! Image length: ${updatedItem.image?.length} chars`);

  // 6. Clean up test item
  await prisma.menuItem.delete({ where: { id: testItem.id } });
  console.log("\n🧹 Cleaned up test menu item.");

  console.log("\n🎉 ALL FOOD IMAGE UPLOAD TESTS PASSED 100%!");
}

run()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { prisma } from "../lib/prisma";

async function verifyRestaurantDeletion() {
  const baseUrl = "http://localhost:3000";
  console.log("=== Step 1: Register a disposable test restaurant ===");

  const timestamp = Date.now();
  const testEmail = `deltest_${timestamp}@example.com`;
  const testSlug = `del-hub-${timestamp}`;
  const testName = `Delete Hub ${timestamp}`;

  // Find a package
  const pkg = await prisma.package.findFirst({ where: { name: "BASIC" } });
  if (!pkg) throw new Error("No package found");

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ramesh Test",
      email: testEmail,
      password: "Password@123",
      restaurantName: testName,
      slug: testSlug,
      packageId: pkg.id,
      city: "Nagpur",
      phone: "9876543210",
      timings: "10 AM - 10 PM",
      initialCategory: "Starters",
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Registration failed: ${regData.error}`);
  console.log("Registered dummy restaurant:", regData.restaurant.name, "ID:", regData.restaurant.id);
  const restaurantId = regData.restaurant.id;

  // Add a sample menu item
  const category = await prisma.menuCategory.findFirst({ where: { restaurantId } });
  if (!category) throw new Error("Initial category not found");

  await prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId: category.id,
      name: "Paneer Crispy",
      price: 240,
      isVeg: true,
    },
  });
  console.log("Created sample category & menu item under restaurant.");

  // Verify DB state before deletion
  const restBefore = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const userBefore = await prisma.user.findUnique({ where: { email: testEmail } });
  const itemsBefore = await prisma.menuItem.count({ where: { restaurantId } });
  console.log("Before deletion:", {
    restaurantExists: !!restBefore,
    userExists: !!userBefore,
    itemCount: itemsBefore,
  });

  if (!restBefore || !userBefore || itemsBefore === 0) {
    throw new Error("Pre-deletion database check failed");
  }

  console.log("\n=== Step 2: Attempt DELETE without Super Admin authorization ===");
  const unauthorizedRes = await fetch(`${baseUrl}/api/admin/restaurants?id=${restaurantId}`, {
    method: "DELETE",
  });
  console.log("Unauthorized call status:", unauthorizedRes.status);
  if (unauthorizedRes.status !== 401 && unauthorizedRes.status !== 403) {
    throw new Error("Security check failed: Unauthorized request was not blocked!");
  }
  console.log("✓ Access control correctly blocked unauthorized delete request.");

  console.log("\n=== Step 3: Login as Super Admin ===");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@menumitra.com", password: "Admin@123" }),
  });
  const rawCookie = loginRes.headers.get("set-cookie");
  const adminCookie = rawCookie ? rawCookie.split(";")[0] : "";
  console.log("Super Admin logged in successfully.");

  console.log("\n=== Step 4: Execute Permanent Deletion as Super Admin ===");
  const deleteRes = await fetch(`${baseUrl}/api/admin/restaurants?id=${restaurantId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  const deleteData = await deleteRes.json();
  console.log("Delete response:", deleteData);
  if (!deleteRes.ok || !deleteData.success) {
    throw new Error(`Delete failed: ${deleteData.error}`);
  }
  console.log("✓ Delete endpoint returned HTTP 200 and success response.");

  console.log("\n=== Step 5: Verify Complete Database Wipeout & Cascades ===");
  const restAfter = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const userAfter = await prisma.user.findUnique({ where: { email: testEmail } });
  const catAfter = await prisma.menuCategory.count({ where: { restaurantId } });
  const itemsAfter = await prisma.menuItem.count({ where: { restaurantId } });

  console.log("After deletion:", {
    restaurantExists: !!restAfter,
    userExists: !!userAfter,
    categoryCount: catAfter,
    itemCount: itemsAfter,
  });

  if (restAfter !== null) throw new Error("Restaurant still exists in DB!");
  if (userAfter !== null) throw new Error("Associated User still exists in DB!");
  if (catAfter !== 0) throw new Error("Categories were not cascade-deleted!");
  if (itemsAfter !== 0) throw new Error("Items were not cascade-deleted!");
  console.log("✓ Restaurant, owner account, categories, and items 100% wiped permanently!");

  console.log("\n=== Step 6: Verify Audit Trail Log ===");
  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Cookie: adminCookie },
  });
  const auditData = await auditRes.json();
  const deleteLog = auditData.logs.find((l: any) => l.action === "RESTAURANT_PERMANENTLY_DELETED");
  console.log("Found audit log:", deleteLog?.details);
  if (!deleteLog) throw new Error("Audit log for RESTAURANT_PERMANENTLY_DELETED not found");
  console.log("✓ Audit log event confirmed.");

  console.log("\n=======================================================");
  console.log("PERMANENT RESTAURANT DELETION FEATURE IS 100% VERIFIED!");
  console.log("=======================================================");
}

verifyRestaurantDeletion().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

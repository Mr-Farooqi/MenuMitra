import { PrismaClient } from "@prisma/client";
import { requireFeature } from "../lib/feature-gate";

const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Testing UPI Payment & Subscription Gating Flow...\n");

  // 1. Fetch Basic & Premium packages
  const basicPkg = await prisma.package.findFirst({ where: { slug: "basic" } });
  const premiumPkg = await prisma.package.findFirst({ where: { slug: "premium" } });

  if (!basicPkg || !premiumPkg) {
    throw new Error("Packages not found in database.");
  }

  const testSlug = `test-upi-${Date.now()}`;
  const testEmail = `owner-${Date.now()}@testupi.com`;
  const testUtr = "123456789012";

  console.log(`1. Simulating restaurant registration with plan: ${premiumPkg.name}...`);
  // Create restaurant in PENDING_PAYMENT state
  const rest = await prisma.restaurant.create({
    data: {
      name: "Biryani Express UPI",
      slug: testSlug,
      packageId: premiumPkg.id,
      phone: "+91 9988776655",
      city: "Hyderabad",
      status: "PENDING_PAYMENT",
    },
  });

  const payment = await prisma.subscriptionPayment.create({
    data: {
      restaurantId: rest.id,
      packageId: premiumPkg.id,
      amount: premiumPkg.price,
      originalAmount: premiumPkg.price,
      discountAmount: 0,
      paymentMethod: "UPI_QR",
      utrReference: testUtr,
      status: "PENDING",
    },
  });

  console.log(`✅ Restaurant created: id=${rest.id}, status=${rest.status}`);
  console.log(`✅ SubscriptionPayment created: id=${payment.id}, utr=${payment.utrReference}, status=${payment.status}\n`);

  // 2. Test Feature Gating on PENDING_PAYMENT restaurant
  console.log("2. Testing Feature Gate on PENDING_PAYMENT restaurant...");
  const gateResult = await requireFeature("reviewReward", rest.id);
  if (!gateResult) {
    throw new Error("❌ FAILURE: Feature was NOT blocked for PENDING_PAYMENT restaurant!");
  }
  const gateJson = await gateResult.json();
  console.log(`✅ Feature Gate successfully blocked access!`);
  console.log(`   Response Code: ${gateJson.code}`);
  console.log(`   Message: "${gateJson.error}"\n`);

  // 3. Super Admin Approval Simulation
  console.log("3. Simulating Super Admin Approval...");
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: "admin@menumitra.com",
      },
    });

    await tx.restaurant.update({
      where: { id: rest.id },
      data: {
        status: "ACTIVE",
        packageId: payment.packageId,
      },
    });

    await tx.invoice.create({
      data: {
        restaurantId: rest.id,
        packageId: payment.packageId,
        amount: payment.amount,
        status: "PAID",
        paymentId: `UPI_${payment.utrReference}`,
      },
    });
  });

  const updatedRest = await prisma.restaurant.findUnique({ where: { id: rest.id } });
  const updatedPayment = await prisma.subscriptionPayment.findUnique({ where: { id: payment.id } });
  const invoice = await prisma.invoice.findFirst({ where: { restaurantId: rest.id } });

  console.log(`✅ Restaurant is now: status=${updatedRest?.status}`);
  console.log(`✅ Payment is now: status=${updatedPayment?.status}, approvedBy=${updatedPayment?.approvedBy}`);
  console.log(`✅ Invoice generated: id=${invoice?.id}, amount=₹${invoice?.amount}, paymentId=${invoice?.paymentId}\n`);

  // 4. Test Feature Gate on APPROVED/ACTIVE restaurant
  console.log("4. Testing Feature Gate on now ACTIVE restaurant...");
  const activeGateResult = await requireFeature("reviewReward", rest.id);
  if (activeGateResult !== null) {
    throw new Error("❌ FAILURE: Feature was blocked for ACTIVE restaurant!");
  }
  console.log("✅ Feature Gate successfully unlocked access for ACTIVE restaurant!\n");

  // Clean up test records
  await prisma.invoice.deleteMany({ where: { restaurantId: rest.id } });
  await prisma.subscriptionPayment.deleteMany({ where: { restaurantId: rest.id } });
  await prisma.restaurant.delete({ where: { id: rest.id } });
  console.log("🧹 Test cleanup completed.\n");

  console.log("🎉 ALL UPI SUBSCRIPTION & GATING TESTS PASSED 100%!");
}

run()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

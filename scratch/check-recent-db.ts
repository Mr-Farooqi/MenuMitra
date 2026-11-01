import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true, restaurantId: true },
  });
  const restaurants = await prisma.restaurant.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, status: true, createdAt: true },
  });
  const payments = await prisma.subscriptionPayment.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, utrReference: true, status: true, amount: true, createdAt: true },
  });
  const auditLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, action: true, details: true, createdAt: true },
  });

  console.log("Recent Users:", users);
  console.log("Recent Restaurants:", restaurants);
  console.log("Recent Payments:", payments);
  console.log("Recent Audit Logs:", auditLogs);
}

main().catch(console.error).finally(() => prisma.$disconnect());

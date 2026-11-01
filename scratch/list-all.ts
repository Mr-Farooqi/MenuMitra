import { prisma } from "../lib/prisma";

async function main() {
  const rests = await prisma.restaurant.findMany({ select: { id: true, name: true, slug: true, status: true, createdAt: true } });
  console.log("All restaurants in DB:", rests);
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  console.log("All users:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());

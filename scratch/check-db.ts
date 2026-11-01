import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log("Recent Users:", users.map(u => ({ id: u.id, email: u.email, role: u.role, restId: u.restaurantId })));
  
  const pkgs = await prisma.package.findMany();
  console.log("Packages:", pkgs.map(p => ({ id: p.id, name: p.name, slug: p.slug, price: p.price })));

  const promos = await prisma.promoCode.findMany();
  console.log("Promos:", promos);

  const payments = await prisma.subscriptionPayment.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log("Recent Payments:", payments);
}

main().catch(console.error).finally(() => prisma.$disconnect());

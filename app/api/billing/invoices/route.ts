import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [restaurant, invoices, packages] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      include: { package: true },
    }),
    prisma.invoice.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({
      orderBy: { price: "asc" },
    }),
  ]);

  return NextResponse.json({
    restaurant,
    currentPackage: restaurant?.package,
    invoices,
    packages,
  });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ announcement: null });
  }

  let planName = "ALL";
  if (session.restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      include: { package: true },
    });
    if (restaurant?.package?.name) {
      planName = restaurant.package.name;
    }
  }

  const now = new Date();

  // Find most recent active announcement matching plan or ALL
  const announcement = await prisma.systemAnnouncement.findFirst({
    where: {
      active: true,
      targetPlan: { in: ["ALL", planName] },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcement });
}

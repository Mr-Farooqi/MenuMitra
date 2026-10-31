import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const whereClause: Record<string, unknown> = {
    restaurantId: session.restaurantId,
  };
  if (status) {
    whereClause.status = status;
  }

  const coupons = await prisma.coupon.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      rewardRule: true,
      submission: {
        select: { name: true, phone: true },
      },
    },
  });

  return NextResponse.json({ coupons });
}

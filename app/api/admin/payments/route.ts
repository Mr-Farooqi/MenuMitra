import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";

  const whereClause: Record<string, unknown> = {};

  if (status !== "ALL") {
    whereClause.status = status;
  }

  if (search) {
    whereClause.OR = [
      { utrReference: { contains: search } },
      { promoCode: { contains: search } },
      { restaurant: { name: { contains: search } } },
      { restaurant: { slug: { contains: search } } },
      { restaurant: { phone: { contains: search } } },
    ];
  }

  const [payments, stats] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            city: true,
            status: true,
            users: {
              where: { role: "OWNER" },
              select: { id: true, name: true, email: true },
            },
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
          },
        },
      },
    }),
    prisma.subscriptionPayment.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  let totalCollected = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  for (const s of stats) {
    if (s.status === "APPROVED") {
      totalCollected = s._sum.amount || 0;
      approvedCount = s._count._all;
    } else if (s.status === "PENDING") {
      pendingCount = s._count._all;
    } else if (s.status === "REJECTED") {
      rejectedCount = s._count._all;
    }
  }

  return NextResponse.json({
    payments,
    stats: {
      totalCollected,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: pendingCount + approvedCount + rejectedCount,
    },
  });
}

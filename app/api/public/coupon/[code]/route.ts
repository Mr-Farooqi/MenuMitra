import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code?.toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        rewardRule: true,
        restaurant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            phone: true,
            address: true,
            city: true,
            reviewSettings: {
              select: { minBill: true },
            },
          },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const isExpired = new Date(coupon.expiresAt) < new Date();

    return NextResponse.json({
      coupon: {
        code: coupon.code,
        label: coupon.rewardRule.label,
        type: coupon.rewardRule.type,
        value: coupon.rewardRule.value,
        status: isExpired && coupon.status === "ACTIVE" ? "EXPIRED" : coupon.status,
        expiresAt: coupon.expiresAt,
        redeemedAt: coupon.redeemedAt,
        minBill: coupon.restaurant.reviewSettings?.minBill || 0,
        restaurant: coupon.restaurant,
      },
    });
  } catch (error) {
    console.error("Fetch coupon error:", error);
    return NextResponse.json({ error: "Failed to load coupon" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code?.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantSlug = searchParams.get("slug")?.toLowerCase();
    const billParam = searchParams.get("bill");
    const billAmount = billParam ? parseFloat(billParam) : null;

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        rewardRule: true,
        restaurant: {
          select: {
            id: true,
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
      return NextResponse.json({ error: `Coupon code "${code}" is invalid` }, { status: 404 });
    }

    // Verify restaurant ownership if slug provided
    if (restaurantSlug && coupon.restaurant.slug.toLowerCase() !== restaurantSlug) {
      return NextResponse.json(
        { error: `This coupon is only valid at ${coupon.restaurant.name}` },
        { status: 400 }
      );
    }

    // Status checks
    if (coupon.status === "REDEEMED") {
      return NextResponse.json(
        { error: "This scratch card coupon has already been redeemed" },
        { status: 400 }
      );
    }

    const isExpired = new Date(coupon.expiresAt) < new Date();
    if (isExpired || coupon.status === "EXPIRED") {
      return NextResponse.json(
        { error: "This coupon code has expired" },
        { status: 400 }
      );
    }

    // Minimum bill check
    const minBill = coupon.restaurant.reviewSettings?.minBill || 0;
    if (billAmount !== null && billAmount < minBill) {
      return NextResponse.json(
        {
          error: `Minimum bill of ₹${minBill} is required to apply this coupon. Your current subtotal is ₹${billAmount}.`,
        },
        { status: 400 }
      );
    }

    // Calculate discount if bill provided
    let discountAmount = 0;
    const rule = coupon.rewardRule;
    if (billAmount !== null && billAmount > 0) {
      if (rule.type === "PERCENT") {
        discountAmount = Math.round(((billAmount * rule.value) / 100) * 100) / 100;
      } else if (rule.type === "FLAT") {
        discountAmount = Math.min(billAmount, rule.value);
      } else if (rule.type === "FREE_ITEM") {
        discountAmount = Math.min(billAmount, rule.value);
      }
    }

    const finalBill = billAmount !== null ? Math.max(0, billAmount - discountAmount) : null;

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        label: coupon.rewardRule.label,
        type: coupon.rewardRule.type,
        value: coupon.rewardRule.value,
        status: "ACTIVE",
        expiresAt: coupon.expiresAt,
        redeemedAt: coupon.redeemedAt,
        minBill,
        discountAmount,
        finalBill,
        restaurant: coupon.restaurant,
      },
      message:
        discountAmount > 0
          ? `🎉 Coupon applied: ${coupon.rewardRule.label}! Saved ₹${discountAmount}.`
          : `🎉 Valid coupon: ${coupon.rewardRule.label}!`,
    });
  } catch (error) {
    console.error("Fetch coupon error:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}

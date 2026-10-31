import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { code, billAmount, action } = await req.json(); // action: "PREVIEW" | "REDEEM"

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const bill = parseFloat(billAmount);
    if (isNaN(bill) || bill < 0) {
      return NextResponse.json({ error: "Valid bill amount is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Look up coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
      include: {
        rewardRule: true,
        restaurant: {
          include: { reviewSettings: true },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: `Coupon code "${cleanCode}" not found`, code: "COUPON_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Ownership check: must belong to the logged in owner's restaurant
    if (coupon.restaurantId !== session.restaurantId) {
      return NextResponse.json(
        { error: "This coupon belongs to a different restaurant", code: "INVALID_RESTAURANT" },
        { status: 403 }
      );
    }

    // Status check
    if (coupon.status === "REDEEMED") {
      return NextResponse.json(
        {
          error: `This coupon was already redeemed on ${new Date(coupon.redeemedAt!).toLocaleDateString("en-IN")}`,
          code: "ALREADY_REDEEMED",
          redeemedAt: coupon.redeemedAt,
        },
        { status: 400 }
      );
    }

    if (coupon.status === "EXPIRED" || new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This coupon has expired", code: "COUPON_EXPIRED" },
        { status: 400 }
      );
    }

    // Minimum bill check
    const minBill = coupon.restaurant.reviewSettings?.minBill || 0;
    if (bill < minBill) {
      return NextResponse.json(
        {
          error: `Minimum bill of ₹${minBill} is required to use this reward. Current bill is ₹${bill}.`,
          code: "MIN_BILL_NOT_MET",
        },
        { status: 400 }
      );
    }

    // Calculate discount
    const rule = coupon.rewardRule;
    let discount = 0;
    if (rule.type === "PERCENT") {
      discount = (bill * rule.value) / 100;
    } else if (rule.type === "FLAT") {
      discount = Math.min(bill, rule.value);
    } else if (rule.type === "FREE_ITEM") {
      discount = Math.min(bill, rule.value); // discount the item price
    }

    const finalBill = Math.max(0, bill - discount);

    // If PREVIEW only, return calculation without writing to DB
    if (action === "PREVIEW") {
      return NextResponse.json({
        valid: true,
        code: coupon.code,
        label: rule.label,
        type: rule.type,
        value: rule.value,
        billAmount: bill,
        discountApplied: Math.round(discount),
        finalBill: Math.round(finalBill),
      });
    }

    // ATOMIC REDEMPTION via Prisma Transaction
    const redeemedCoupon = await prisma.$transaction(async (tx) => {
      // Re-check atomic status in transaction
      const liveCoupon = await tx.coupon.findUnique({
        where: { id: coupon.id },
      });

      if (!liveCoupon || liveCoupon.status !== "ACTIVE") {
        throw new Error("Coupon has already been redeemed in another session");
      }

      const updated = await tx.coupon.update({
        where: { id: coupon.id },
        data: {
          status: "REDEEMED",
          redeemedAt: new Date(),
          billAmount: bill,
          discountApplied: Math.round(discount),
        },
        include: {
          rewardRule: true,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      code: redeemedCoupon.code,
      label: redeemedCoupon.rewardRule.label,
      billAmount: bill,
      discountApplied: Math.round(discount),
      finalBill: Math.round(finalBill),
      redeemedAt: redeemedCoupon.redeemedAt,
      message: "Coupon redeemed successfully! Bill updated.",
    });
  } catch (error: unknown) {
    console.error("Redeem error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to redeem coupon", code: "REDEEM_FAILED" },
      { status: 400 }
    );
  }
}

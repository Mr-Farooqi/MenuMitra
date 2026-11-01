import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetPlanSlug, utrReference, promoCode, payerPhone, payerName } = await req.json();

    if (!targetPlanSlug) {
      return NextResponse.json({ error: "Target plan is required" }, { status: 400 });
    }

    const cleanUtr = (utrReference || "").trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      return NextResponse.json(
        { error: "A valid 12-digit UPI Reference / UTR Number is required" },
        { status: 400 }
      );
    }

    const targetPackage = await prisma.package.findFirst({
      where: { slug: targetPlanSlug.toLowerCase() },
    });

    if (!targetPackage) {
      return NextResponse.json({ error: "Selected plan does not exist" }, { status: 400 });
    }

    let finalAmount = targetPackage.price;
    let discountAmount = 0;
    let appliedPromo: string | null = null;

    if (promoCode) {
      const cleanCode = promoCode.trim().toUpperCase();
      const promo = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
      if (
        promo &&
        promo.active &&
        (!promo.expiresAt || promo.expiresAt > new Date()) &&
        promo.usedCount < promo.maxUses
      ) {
        if (promo.discountPercent) {
          discountAmount = Math.round(((targetPackage.price * promo.discountPercent) / 100) * 100) / 100;
        } else if (promo.discountAmount) {
          discountAmount = Math.min(promo.discountAmount, targetPackage.price);
        }
        finalAmount = Math.max(0, targetPackage.price - discountAmount);
        appliedPromo = promo.code;

        // Increment promo code usage
        await prisma.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // Create SubscriptionPayment record with PENDING status
    const payment = await prisma.subscriptionPayment.create({
      data: {
        restaurantId: session.restaurantId,
        packageId: targetPackage.id,
        amount: finalAmount,
        originalAmount: targetPackage.price,
        discountAmount,
        promoCode: appliedPromo,
        paymentMethod: "UPI_QR",
        utrReference: cleanUtr,
        payerPhone: payerPhone?.trim() || null,
        payerName: payerName?.trim() || null,
        status: "PENDING",
      },
    });

    await logAuditEvent({
      action: "UPGRADE_PAYMENT_SUBMITTED",
      details: `Submitted UPI payment request for plan ${targetPackage.name} (₹${finalAmount}, UTR: ${cleanUtr})`,
      actorEmail: session.email,
      restaurantId: session.restaurantId,
    });

    return NextResponse.json({
      success: true,
      message: `Payment submitted successfully! Your plan will activate once verified by admin.`,
      paymentId: payment.id,
      amount: finalAmount,
      utrReference: cleanUtr,
    });
  } catch (error) {
    console.error("Payment request submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit payment request" },
      { status: 500 }
    );
  }
}

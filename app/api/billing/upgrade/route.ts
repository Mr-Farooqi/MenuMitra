import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processMockSubscriptionPayment } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetPlanSlug, promoCode } = await req.json();

    const targetPackage = await prisma.package.findFirst({
      where: { slug: targetPlanSlug.toLowerCase() },
    });

    if (!targetPackage) {
      return NextResponse.json({ error: "Selected plan does not exist" }, { status: 400 });
    }

    let finalAmount = targetPackage.price;
    let appliedPromo: string | undefined = undefined;

    // Validate promoCode if provided
    if (promoCode) {
      const cleanCode = promoCode.trim().toUpperCase();
      const promo = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
      if (promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date()) && promo.usedCount < promo.maxUses) {
        let discount = 0;
        if (promo.discountPercent) {
          discount = Math.round(((targetPackage.price * promo.discountPercent) / 100) * 100) / 100;
        } else if (promo.discountAmount) {
          discount = Math.min(promo.discountAmount, targetPackage.price);
        }
        finalAmount = Math.max(0, targetPackage.price - discount);
        appliedPromo = promo.code;

        // Increment promo code usage
        await prisma.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // Process upgrade via mock gateway
    const paymentResult = await processMockSubscriptionPayment({
      restaurantId: session.restaurantId,
      targetPackageId: targetPackage.id,
      paymentMethod: "MOCK_INSTANT_CHECKOUT",
      finalAmount,
      promoCode: appliedPromo,
    });

    return NextResponse.json({
      success: true,
      message: paymentResult.message,
      transactionId: paymentResult.transactionId,
      package: targetPackage,
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "Failed to process plan upgrade" }, { status: 500 });
  }
}

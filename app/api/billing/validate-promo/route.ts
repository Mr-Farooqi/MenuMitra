import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, planSlug, packagePrice } = await req.json();
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Promo code required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const promo = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (!promo || !promo.active) {
      return NextResponse.json({ error: `Promo code "${cleanCode}" is invalid or inactive` }, { status: 400 });
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ error: "This promo code has expired" }, { status: 400 });
    }

    if (promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: "This promo code has reached its maximum usage limit" }, { status: 400 });
    }

    // Calculate discount on target package
    let basePrice = typeof packagePrice === "number" ? packagePrice : 2999;
    if (planSlug) {
      const targetPkg = await prisma.package.findFirst({
        where: { slug: planSlug.toLowerCase() },
      });
      if (targetPkg) basePrice = targetPkg.price;
    }

    let discount = 0;
    if (promo.discountPercent) {
      discount = Math.round(((basePrice * promo.discountPercent) / 100) * 100) / 100;
    } else if (promo.discountAmount) {
      discount = Math.min(promo.discountAmount, basePrice);
    }

    const finalPrice = Math.max(0, basePrice - discount);

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
      discountAmount: promo.discountAmount,
      discountSaved: discount,
      originalPrice: basePrice,
      finalPrice,
      message: `🎉 Promo code ${promo.code} applied! You save ₹${discount}.`,
    });
  } catch (error) {
    console.error("Validate promo error:", error);
    return NextResponse.json({ error: "Failed to validate promo code" }, { status: 500 });
  }
}

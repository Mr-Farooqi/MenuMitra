import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { restaurantId, packageId, amount, paymentReference, paymentMethod } = body;

    if (!restaurantId || !packageId) {
      return NextResponse.json({ error: "Restaurant ID and Package ID required" }, { status: 400 });
    }

    const [restaurant, targetPackage] = await Promise.all([
      prisma.restaurant.findUnique({ where: { id: restaurantId } }),
      prisma.package.findUnique({ where: { id: packageId } }),
    ]);

    if (!restaurant || !targetPackage) {
      return NextResponse.json({ error: "Restaurant or Package not found" }, { status: 404 });
    }

    const billedAmount = amount !== undefined ? parseFloat(amount) : targetPackage.price;
    const ref = paymentReference || `MANUAL_${Date.now()}`;
    const method = paymentMethod || "DIRECT_CASH_OR_UPI";

    // 1. Update restaurant package and ensure status is ACTIVE
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        packageId: targetPackage.id,
        status: "ACTIVE",
      },
    });

    // 2. Create official Invoice record
    const invoice = await prisma.invoice.create({
      data: {
        restaurantId,
        packageId: targetPackage.id,
        amount: billedAmount,
        status: "PAID",
        paymentId: `GST_INV_${ref} (${method})`,
      },
    });

    await logAuditEvent({
      action: "MANUAL_PAYMENT_ACTIVATED",
      details: `Admin ${session.email} manually assigned ${targetPackage.name} (₹${billedAmount}) to ${restaurant.name}. Ref: ${ref}`,
      actorEmail: session.email,
      restaurantId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${restaurant.name} to ${targetPackage.name} with invoice recorded.`,
      invoice,
    });
  } catch (error) {
    console.error("Manual subscription error:", error);
    return NextResponse.json({ error: "Failed to process manual subscription" }, { status: 500 });
  }
}

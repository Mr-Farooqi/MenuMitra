import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const { paymentId, action, reason } = await req.json();

    if (!paymentId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid paymentId or action (must be APPROVE or REJECT)" },
        { status: 400 }
      );
    }

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: {
        restaurant: true,
        package: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Subscription payment record not found" }, { status: 404 });
    }

    if (action === "APPROVE") {
      // Execute approval transaction
      await prisma.$transaction(async (tx) => {
        // 1. Update payment status
        await tx.subscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: session.email,
            rejectReason: null,
          },
        });

        // 2. Activate restaurant and assign package
        await tx.restaurant.update({
          where: { id: payment.restaurantId },
          data: {
            status: "ACTIVE",
            packageId: payment.packageId,
          },
        });

        // 3. Create official paid invoice
        await tx.invoice.create({
          data: {
            restaurantId: payment.restaurantId,
            packageId: payment.packageId,
            amount: payment.amount,
            status: "PAID",
            paymentId: payment.utrReference
              ? `UPI_${payment.utrReference}`
              : `INV_APPROVED_${Date.now()}`,
          },
        });
      });

      await logAuditEvent({
        action: "PAYMENT_APPROVED",
        details: `Approved UPI payment of ₹${payment.amount} (UTR: ${payment.utrReference || "N/A"}) for restaurant "${payment.restaurant.name}" - Plan activated: ${payment.package.name}`,
        actorEmail: session.email,
        restaurantId: payment.restaurantId,
      });

      return NextResponse.json({
        success: true,
        message: `Payment approved! ${payment.restaurant.name} has been activated with ${payment.package.name} plan.`,
      });
    }

    if (action === "REJECT") {
      const rejectReason = reason?.trim() || "Payment verification failed or invalid UTR reference.";

      await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          rejectReason,
        },
      });

      await logAuditEvent({
        action: "PAYMENT_REJECTED",
        details: `Rejected payment of ₹${payment.amount} (UTR: ${payment.utrReference || "N/A"}) for restaurant "${payment.restaurant.name}". Reason: ${rejectReason}`,
        actorEmail: session.email,
        restaurantId: payment.restaurantId,
      });

      return NextResponse.json({
        success: true,
        message: `Payment marked as REJECTED.`,
      });
    }
  } catch (error) {
    console.error("Failed to process payment action:", error);
    return NextResponse.json(
      { error: "Internal server error processing payment action" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWaiterOrOwnerSession } from "@/lib/waiter-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getWaiterOrOwnerSession(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please scan QR and enter Waiter PIN." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, orderId } = body;

    if (!action || !orderId) {
      return NextResponse.json(
        { error: "action and orderId are required" },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: session.restaurantId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or does not belong to this restaurant" },
        { status: 404 }
      );
    }

    // 1. ACTION: SERVE ORDER
    if (action === "SERVE") {
      // Business rule: Order can ONLY be marked as served after payment is completed (PAID)
      if (order.paymentStatus !== "PAID") {
        return NextResponse.json(
          {
            error: `Payment is still pending for Table ${order.tableNumber || "Order"}. Please collect payment (Cash or UPI) before marking this order as Served.`,
            code: "PAYMENT_REQUIRED",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
        include: { items: true },
      });

      return NextResponse.json({
        success: true,
        order: updated,
        message: `Order for Table ${order.tableNumber || "Takeaway"} marked as SERVED ✓`,
      });
    }

    // 2. ACTION: RECORD / UPDATE PAYMENT (CASH / UPI)
    if (action === "PAYMENT") {
      const { paymentMode, paymentStatus } = body;
      const validMode = paymentMode === "UPI" ? "UPI" : "CASH";
      const validStatus = paymentStatus === "PENDING" ? "PENDING" : "PAID";

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMode: validMode,
          paymentStatus: validStatus,
        },
        include: { items: true },
      });

      return NextResponse.json({
        success: true,
        order: updated,
        message:
          validStatus === "PAID"
            ? `Payment of ₹${updated.total} collected via ${validMode} ✓`
            : `Payment status updated to ${validStatus}`,
      });
    }

    // 3. ACTION: SCAN / APPLY COUPON TO ORDER BILL
    if (action === "APPLY_COUPON") {
      const { couponCode } = body;
      if (!couponCode || !couponCode.trim()) {
        return NextResponse.json(
          { error: "Please enter or scan a valid coupon code" },
          { status: 400 }
        );
      }

      if (order.couponCode) {
        return NextResponse.json(
          { error: `Coupon "${order.couponCode}" has already been applied to this order` },
          { status: 400 }
        );
      }

      const cleanCode = couponCode.trim().toUpperCase();

      // Find coupon
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
          { error: `Coupon "${cleanCode}" not found` },
          { status: 404 }
        );
      }

      if (coupon.restaurantId !== session.restaurantId) {
        return NextResponse.json(
          { error: "This coupon belongs to a different restaurant" },
          { status: 403 }
        );
      }

      if (coupon.status === "REDEEMED") {
        return NextResponse.json(
          {
            error: `This coupon was already redeemed on ${new Date(coupon.redeemedAt!).toLocaleDateString("en-IN")}`,
          },
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

      // Check min bill requirement against order subtotal or total
      const minBill = coupon.restaurant.reviewSettings?.minBill || 0;
      const billBase = order.subtotal && order.subtotal > 0 ? order.subtotal : order.total;

      if (billBase < minBill) {
        return NextResponse.json(
          {
            error: `Minimum bill of ₹${minBill} is required for this reward. Current bill is ₹${billBase}.`,
          },
          { status: 400 }
        );
      }

      // Calculate discount amount
      const rule = coupon.rewardRule;
      let discountAmount = 0;
      if (rule.type === "PERCENT") {
        discountAmount = Math.round(((billBase * rule.value) / 100) * 100) / 100;
      } else if (rule.type === "FLAT") {
        discountAmount = Math.min(billBase, rule.value);
      } else if (rule.type === "FREE_ITEM") {
        discountAmount = Math.min(billBase, rule.value);
      }

      const newTotal = Math.max(0, billBase - discountAmount);

      // Execute transaction: redeem coupon & update order
      const result = await prisma.$transaction(async (tx) => {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            status: "REDEEMED",
            redeemedAt: new Date(),
            billAmount: billBase,
            discountApplied: discountAmount,
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            subtotal: billBase,
            discount: discountAmount,
            couponCode: coupon.code,
            total: newTotal,
          },
          include: { items: true },
        });

        return updatedOrder;
      });

      return NextResponse.json({
        success: true,
        order: result,
        discountApplied: discountAmount,
        message: `🎉 Coupon ${coupon.code} applied! Saved ₹${discountAmount}. New Total: ₹${newTotal}.`,
      });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (error) {
    console.error("Waiter action error:", error);
    return NextResponse.json({ error: "Failed to process waiter action" }, { status: 500 });
  }
}

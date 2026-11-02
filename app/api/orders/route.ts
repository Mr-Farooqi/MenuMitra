import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.number().int().optional().nullable(),
  customerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentMode: z.string().default("PAY_AT_COUNTER"),
  couponCode: z.string().optional().nullable(),
  utrReference: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().positive(),
        notes: z.string().optional().nullable(),
      })
    )
    .min(1, "Order must contain at least one item"),
});

// Create Order (Public Customer endpoint)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = createOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const {
      restaurantSlug,
      tableNumber,
      customerName,
      phone,
      notes,
      paymentMode,
      couponCode,
      utrReference,
      items,
    } = result.data;

    // Find restaurant and verify package has orders feature
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug.toLowerCase() },
      include: {
        package: true,
        reviewSettings: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const features = JSON.parse(restaurant.package.features || "[]");
    if (!features.includes("orders")) {
      return NextResponse.json(
        { error: "Online ordering is not enabled for this restaurant", code: "FEATURE_LOCKED" },
        { status: 403 }
      );
    }

    // Fetch real menu items to calculate server-verified total
    const itemIds = items.map((i) => i.menuItemId);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        restaurantId: restaurant.id,
        isAvailable: true,
      },
    });

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    let calculatedTotal = 0;
    const orderItemsData: {
      menuItemId: string;
      name: string;
      price: number;
      quantity: number;
      notes: string | null;
    }[] = [];

    for (const item of items) {
      const dbItem = itemMap.get(item.menuItemId);
      if (!dbItem) {
        return NextResponse.json(
          { error: `One of the selected items is no longer available` },
          { status: 400 }
        );
      }
      const itemSubtotal = dbItem.price * item.quantity;
      calculatedTotal += itemSubtotal;
      orderItemsData.push({
        menuItemId: dbItem.id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: item.quantity,
        notes: item.notes || null,
      });
    }

    // Validate Coupon if provided
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;
    let discountAmount = 0;

    if (couponCode && couponCode.trim()) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCoupon },
        include: { rewardRule: true },
      });

      if (!coupon) {
        return NextResponse.json(
          { error: `Coupon code "${cleanCoupon}" is invalid` },
          { status: 400 }
        );
      }

      if (coupon.restaurantId !== restaurant.id) {
        return NextResponse.json(
          { error: "This coupon belongs to another restaurant" },
          { status: 400 }
        );
      }

      if (coupon.status === "REDEEMED") {
        return NextResponse.json(
          { error: "This coupon code has already been redeemed" },
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

      const minBill = restaurant.reviewSettings?.minBill || 0;
      if (calculatedTotal < minBill) {
        return NextResponse.json(
          {
            error: `Minimum bill of ₹${minBill} is required to use this coupon. Current subtotal is ₹${calculatedTotal}.`,
          },
          { status: 400 }
        );
      }

      // Calculate discount
      const rule = coupon.rewardRule;
      if (rule.type === "PERCENT") {
        discountAmount = Math.round(((calculatedTotal * rule.value) / 100) * 100) / 100;
      } else if (rule.type === "FLAT") {
        discountAmount = Math.min(calculatedTotal, rule.value);
      } else if (rule.type === "FREE_ITEM") {
        discountAmount = Math.min(calculatedTotal, rule.value);
      }

      appliedCouponId = coupon.id;
      appliedCouponCode = coupon.code;
    }

    const finalTotal = Math.max(0, calculatedTotal - discountAmount);

    // Create Order with Prisma Transaction
    const newOrder = await prisma.$transaction(
      async (tx) => {
        // If coupon applied, mark it as REDEEMED atomically
        if (appliedCouponId) {
          await tx.coupon.update({
            where: { id: appliedCouponId },
            data: {
              status: "REDEEMED",
              redeemedAt: new Date(),
              billAmount: calculatedTotal,
              discountApplied: discountAmount,
            },
          });
        }

        const order = await tx.order.create({
          data: {
            restaurantId: restaurant.id,
            tableNumber: tableNumber || null,
            customerName: customerName || "Dine-in Guest",
            phone: phone || null,
            notes: notes || null,
            subtotal: calculatedTotal,
            discount: discountAmount,
            couponCode: appliedCouponCode,
            total: finalTotal,
            status: "NEW",
            paymentMode: paymentMode || "PAY_AT_COUNTER",
            paymentStatus: paymentMode === "UPI" && utrReference ? "PAID" : "PENDING",
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: true,
          },
        });
        return order;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      subtotal: newOrder.subtotal,
      discount: newOrder.discount,
      couponCode: newOrder.couponCode,
      total: newOrder.total,
      paymentMode: newOrder.paymentMode,
      paymentStatus: newOrder.paymentStatus,
      message: "Order placed successfully! Sent to kitchen.",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to place order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// List Orders for Owner / Kitchen Kanban
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("orders", session.restaurantId);
  if (gateError) return gateError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const whereClause: Record<string, unknown> = {
    restaurantId: session.restaurantId,
  };
  if (status) {
    whereClause.status = status;
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });

  return NextResponse.json({ orders });
}

// Update Order Status (NEW -> PREPARING -> READY -> COMPLETED / CANCELLED)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("orders", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
    }

    // Ownership check
    const existing = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

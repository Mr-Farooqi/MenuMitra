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

    const { restaurantSlug, tableNumber, customerName, phone, notes, paymentMode, items } =
      result.data;

    // Find restaurant and verify package has orders feature
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug.toLowerCase() },
      include: { package: true },
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

    // Create Order with Prisma Transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber: tableNumber || null,
          customerName: customerName || "Dine-in Guest",
          phone: phone || null,
          notes: notes || null,
          total: calculatedTotal,
          status: "NEW",
          paymentMode: paymentMode || "PAY_AT_COUNTER",
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });
      return order;
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      total: newOrder.total,
      message: "Order placed successfully! Sent to kitchen.",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
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

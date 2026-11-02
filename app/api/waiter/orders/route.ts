import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWaiterOrOwnerSession } from "@/lib/waiter-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getWaiterOrOwnerSession(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please scan the QR code and enter the Waiter PIN." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tableParam = searchParams.get("table");
    const statusParam = searchParams.get("status");

    const whereClause: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (tableParam) {
      const tableNum = parseInt(tableParam);
      if (!isNaN(tableNum)) {
        whereClause.tableNumber = tableNum;
      }
    }

    if (statusParam) {
      whereClause.status = statusParam;
    }

    const [orders, restaurant, tables] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          items: true,
        },
      }),
      prisma.restaurant.findUnique({
        where: { id: session.restaurantId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          phone: true,
          address: true,
          waiterPin: true,
        },
      }),
      prisma.table.findMany({
        where: { restaurantId: session.restaurantId },
        orderBy: { number: "asc" },
        select: { number: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      restaurant,
      tables: tables.map((t) => t.number),
    });
  } catch (error) {
    console.error("Waiter fetch orders error:", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

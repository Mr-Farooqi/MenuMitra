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

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { type, items } = await req.json(); // type: "category" | "item", items: [{ id: string, order: number }]

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
    }

    if (type === "category") {
      await prisma.$transaction(
        items.map((it: { id: string; order: number }) =>
          prisma.menuCategory.updateMany({
            where: { id: it.id, restaurantId: session.restaurantId! },
            data: { order: it.order },
          })
        )
      );
    } else {
      await prisma.$transaction(
        items.map((it: { id: string; order: number }) =>
          prisma.menuItem.updateMany({
            where: { id: it.id, restaurantId: session.restaurantId! },
            data: { order: it.order },
          })
        )
      );
    }

    return NextResponse.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder items" }, { status: 500 });
  }
}

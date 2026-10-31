import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { restaurantSlug, source, tableNumber } = await req.json();

    if (!restaurantSlug) {
      return NextResponse.json({ error: "Restaurant slug is required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug.toLowerCase() },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    await prisma.scanEvent.create({
      data: {
        restaurantId: restaurant.id,
        source: source || (tableNumber ? "TABLE_QR" : "MENU_QR"),
        tableNumber: tableNumber ? parseInt(tableNumber) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scan telemetry error:", error);
    return NextResponse.json({ error: "Failed to record scan event" }, { status: 500 });
  }
}

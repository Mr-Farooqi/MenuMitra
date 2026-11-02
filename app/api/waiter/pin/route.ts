import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: {
        id: true,
        slug: true,
        name: true,
        waiterPin: true,
        waiterPinUpdatedAt: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Default pin if none
    const pin = restaurant.waiterPin || "1234";

    return NextResponse.json({
      success: true,
      pin,
      updatedAt: restaurant.waiterPinUpdatedAt,
      slug: restaurant.slug,
      name: restaurant.name,
    });
  } catch (error) {
    console.error("Fetch waiter PIN error:", error);
    return NextResponse.json({ error: "Failed to fetch PIN" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a secure, easily readable 4-digit random PIN (e.g. 1000 to 9999)
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();

    const updated = await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: {
        waiterPin: newPin,
        waiterPinUpdatedAt: new Date(),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        waiterPin: true,
        waiterPinUpdatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      pin: updated.waiterPin,
      updatedAt: updated.waiterPinUpdatedAt,
      message: `New Waiter PIN ${updated.waiterPin} generated! Previous waiter sessions have been expired.`,
    });
  } catch (error) {
    console.error("Regenerate waiter PIN error:", error);
    return NextResponse.json({ error: "Failed to regenerate PIN" }, { status: 500 });
  }
}

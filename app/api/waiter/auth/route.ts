import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWaiterToken, WAITER_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { slug, pin } = await req.json();

    if (!slug || !pin) {
      return NextResponse.json(
        { error: "Restaurant slug and 4-digit PIN are required" },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase();
    const cleanPin = pin.trim();

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: cleanSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        waiterPin: true,
        status: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (restaurant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Restaurant account is not active" },
        { status: 403 }
      );
    }

    // Default PIN fallback if not set
    const expectedPin = restaurant.waiterPin || "1234";

    if (cleanPin !== expectedPin) {
      return NextResponse.json(
        { error: "Invalid Security PIN. Please check the PIN on the restaurant dashboard." },
        { status: 401 }
      );
    }

    // Generate Waiter Token valid for 24h
    const token = await createWaiterToken({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      pin: expectedPin,
    });

    const response = NextResponse.json({
      success: true,
      token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo,
      },
      message: "Waiter Station unlocked successfully",
    });

    // Set cookie as well
    response.cookies.set(WAITER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Waiter auth error:", error);
    return NextResponse.json({ error: "Failed to authenticate PIN" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const demoOwner = await prisma.user.findUnique({
      where: { email: "owner@tandoorinights.com" },
      include: {
        restaurant: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!demoOwner) {
      return NextResponse.json(
        { error: "Demo account not found. Please run seed first.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const token = await createSessionToken({
      id: demoOwner.id,
      email: demoOwner.email,
      name: demoOwner.name,
      role: demoOwner.role as "SUPER_ADMIN" | "OWNER" | "STAFF",
      restaurantId: demoOwner.restaurantId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: demoOwner.id,
        email: demoOwner.email,
        name: demoOwner.name,
        role: demoOwner.role,
        restaurant: demoOwner.restaurant,
      },
      redirectTo: "/dashboard",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Failed to log into demo account", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

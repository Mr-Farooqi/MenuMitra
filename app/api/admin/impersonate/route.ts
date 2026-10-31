import { NextRequest, NextResponse } from "next/server";
import { getSession, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const { restaurantId } = await req.json();
    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        users: {
          where: { role: "OWNER" },
          take: 1,
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const owner = restaurant.users[0];
    if (!owner) {
      return NextResponse.json({ error: "Restaurant has no registered owner" }, { status: 400 });
    }

    // Generate impersonated session token
    const token = await createSessionToken({
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: "OWNER",
      restaurantId: restaurant.id,
      impersonatedBy: session.email,
      originalAdminId: session.id,
    });

    await logAuditEvent({
      action: "IMPERSONATION_STARTED",
      details: `Super Admin ${session.email} impersonated owner ${owner.email} (${restaurant.name})`,
      actorEmail: session.email,
      restaurantId: restaurant.id,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      restaurantName: restaurant.name,
      ownerEmail: owner.email,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours for impersonation
    });

    return response;
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json({ error: "Failed to impersonate restaurant owner" }, { status: 500 });
  }
}

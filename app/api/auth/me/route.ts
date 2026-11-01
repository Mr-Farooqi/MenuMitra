import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFeatures } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let session = await getSessionFromRequest(req);
    if (!session) {
      session = await getSession().catch(() => null);
    }
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        restaurantId: true,
        restaurant: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const features = user.restaurant ? parseFeatures(user.restaurant.package.features) : [];

    const restaurantPayload = user.restaurant
      ? {
          id: user.restaurant.id,
          name: user.restaurant.name,
          slug: user.restaurant.slug,
          logo: user.restaurant.logo,
          cover: user.restaurant.cover,
          phone: user.restaurant.phone,
          timings: user.restaurant.timings,
          address: user.restaurant.address,
          city: user.restaurant.city,
          googleReviewLink: user.restaurant.googleReviewLink,
          status: user.restaurant.status,
          package: user.restaurant.package,
          features,
        }
      : null;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        impersonatedBy: session.impersonatedBy || null,
        restaurant: restaurantPayload,
      },
      restaurant: restaurantPayload,
      features,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.restaurantId },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ restaurant, user });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, phone, address, city, timings, logo, cover, googleReviewLink } = body;

    const updated = await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        timings: timings !== undefined ? timings : undefined,
        logo: logo !== undefined ? logo : undefined,
        cover: cover !== undefined ? cover : undefined,
        googleReviewLink: googleReviewLink !== undefined ? googleReviewLink : undefined,
      },
    });

    return NextResponse.json({ success: true, restaurant: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update restaurant profile" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const packages = await prisma.package.findMany({
    orderBy: { price: "asc" },
    include: {
      _count: {
        select: { restaurants: true },
      },
    },
  });

  return NextResponse.json({ packages });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, price, features } = body;

    if (!id) {
      return NextResponse.json({ error: "Package ID required" }, { status: 400 });
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        features: features !== undefined ? (typeof features === "string" ? features : JSON.stringify(features)) : undefined,
      },
    });

    return NextResponse.json({ success: true, package: updated });
  } catch (error) {
    console.error("Super admin update package error:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

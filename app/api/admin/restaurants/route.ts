import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const packageId = searchParams.get("packageId");

  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { city: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  if (packageId && packageId !== "ALL") {
    whereClause.packageId = packageId;
  }

  const restaurants = await prisma.restaurant.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      package: true,
      users: {
        where: { role: "OWNER" },
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          orders: true,
          scanEvents: true,
          categories: true,
        },
      },
    },
  });

  return NextResponse.json({ restaurants });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status, packageId } = body;

    if (!id) {
      return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        packageId: packageId !== undefined ? packageId : undefined,
      },
      include: { package: true },
    });

    return NextResponse.json({ success: true, restaurant: updated });
  } catch (error) {
    console.error("Super admin update restaurant error:", error);
    return NextResponse.json({ error: "Failed to update restaurant" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, name: true } },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Atomic transaction for permanent deletion
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated users (Owner / Staff)
      await tx.user.deleteMany({
        where: { restaurantId: id },
      });

      // 2. Delete the restaurant (all related tables with onDelete: Cascade will be removed)
      await tx.restaurant.delete({
        where: { id },
      });
    });

    // 3. Log audit event
    await logAuditEvent({
      action: "RESTAURANT_PERMANENTLY_DELETED",
      details: `Permanently deleted restaurant "${restaurant.name}" (${restaurant.slug}) and associated owner account(s): ${restaurant.users.map((u) => u.email).join(", ")}`,
      actorEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Restaurant "${restaurant.name}" and all associated data have been permanently deleted.`,
    });
  } catch (error) {
    console.error("Super admin permanent delete restaurant error:", error);
    return NextResponse.json({ error: "Failed to delete restaurant permanently" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(60),
  order: z.number().int().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const count = await prisma.menuCategory.count({
      where: { restaurantId: session.restaurantId },
    });

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: session.restaurantId,
        name: parsed.data.name,
        order: parsed.data.order !== undefined ? parsed.data.order : count,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { id, name, order, active } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    // Ownership check
    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        order: order !== undefined ? order : existing.order,
        active: active !== undefined ? active : existing.active,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    // Ownership check
    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });
    }

    await prisma.menuCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

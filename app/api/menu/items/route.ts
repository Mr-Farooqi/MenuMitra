import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Item name is required").max(100),
  description: z.string().optional().nullable(),
  price: z.number().positive("Price must be greater than 0"),
  image: z.string().optional().nullable(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  order: z.number().int().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const whereClause: Record<string, unknown> = {
    restaurantId: session.restaurantId,
  };

  if (categoryId) {
    whereClause.categoryId = categoryId;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const items = await prisma.menuItem.findMany({
    where: whereClause,
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
  });

  const parsedItems = items.map((item) => ({
    ...item,
    tagsList: item.tags ? JSON.parse(item.tags) : [],
  }));

  return NextResponse.json({ items: parsedItems });
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
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Verify category belongs to this restaurant
    const category = await prisma.menuCategory.findFirst({
      where: { id: parsed.data.categoryId, restaurantId: session.restaurantId },
    });
    if (!category) {
      return NextResponse.json({ error: "Invalid category selected" }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: session.restaurantId,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price,
        image: parsed.data.image || null,
        isVeg: parsed.data.isVeg,
        isAvailable: parsed.data.isAvailable,
        tags: parsed.data.tags ? JSON.stringify(parsed.data.tags) : null,
        order: parsed.data.order || 0,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Create item error:", error);
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
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
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    // Ownership check
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        description: data.description !== undefined ? data.description : existing.description,
        price: data.price !== undefined ? parseFloat(data.price) : existing.price,
        categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
        image: data.image !== undefined ? data.image : existing.image,
        isVeg: data.isVeg !== undefined ? data.isVeg : existing.isVeg,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : existing.isAvailable,
        tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
        order: data.order !== undefined ? data.order : existing.order,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

// Bulk toggle availability or single toggle
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("menu", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { itemIds, isAvailable } = await req.json();
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "Array of itemIds is required" }, { status: 400 });
    }

    await prisma.menuItem.updateMany({
      where: {
        id: { in: itemIds },
        restaurantId: session.restaurantId,
      },
      data: {
        isAvailable: Boolean(isAvailable),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated availability for ${itemIds.length} items`,
    });
  } catch (error) {
    console.error("Bulk toggle error:", error);
    return NextResponse.json({ error: "Failed to update item availability" }, { status: 500 });
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
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

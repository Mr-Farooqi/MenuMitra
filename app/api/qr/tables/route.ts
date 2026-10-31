import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("qr", session.restaurantId);
  if (gateError) return gateError;

  const tables = await prisma.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { number: "asc" },
  });

  return NextResponse.json({ tables });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("qr", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { number, generateCount } = await req.json();

    if (generateCount && typeof generateCount === "number") {
      // Auto-generate tables 1..N
      const count = Math.min(Math.max(1, generateCount), 100);
      for (let i = 1; i <= count; i++) {
        await prisma.table.upsert({
          where: {
            restaurantId_number: {
              restaurantId: session.restaurantId,
              number: i,
            },
          },
          update: {},
          create: {
            restaurantId: session.restaurantId,
            number: i,
          },
        });
      }
      return NextResponse.json({ success: true, message: `Created tables up to ${count}` });
    }

    if (!number || typeof number !== "number") {
      return NextResponse.json({ error: "Valid table number is required" }, { status: 400 });
    }

    const table = await prisma.table.upsert({
      where: {
        restaurantId_number: {
          restaurantId: session.restaurantId,
          number,
        },
      },
      update: {},
      create: {
        restaurantId: session.restaurantId,
        number,
      },
    });

    return NextResponse.json({ success: true, table });
  } catch (error) {
    console.error("Create table error:", error);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("qr", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Table ID is required" }, { status: 400 });
    }

    await prisma.table.deleteMany({
      where: { id, restaurantId: session.restaurantId },
    });

    return NextResponse.json({ success: true, message: "Table deleted" });
  } catch (error) {
    console.error("Delete table error:", error);
    return NextResponse.json({ error: "Failed to delete table" }, { status: 500 });
  }
}

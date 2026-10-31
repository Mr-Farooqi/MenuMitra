import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  label: z.string().min(2, "Reward label is required"),
  type: z.enum(["PERCENT", "FLAT", "FREE_ITEM", "NONE"]),
  value: z.number().min(0),
  weight: z.number().int().min(1, "Weight must be at least 1"),
  expiryDays: z.number().int().min(1).default(30),
  usageLimit: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  const rules = await prisma.rewardRule.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  try {
    const body = await req.json();
    const parsed = ruleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const rule = await prisma.rewardRule.create({
      data: {
        restaurantId: session.restaurantId,
        ...parsed.data,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Create rule error:", error);
    return NextResponse.json({ error: "Failed to create reward rule" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

    const existing = await prisma.rewardRule.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

    const updated = await prisma.rewardRule.update({
      where: { id },
      data: {
        label: data.label !== undefined ? data.label : existing.label,
        type: data.type !== undefined ? data.type : existing.type,
        value: data.value !== undefined ? parseFloat(data.value) : existing.value,
        weight: data.weight !== undefined ? parseInt(data.weight) : existing.weight,
        expiryDays: data.expiryDays !== undefined ? parseInt(data.expiryDays) : existing.expiryDays,
        active: data.active !== undefined ? Boolean(data.active) : existing.active,
      },
    });

    return NextResponse.json({ success: true, rule: updated });
  } catch (error) {
    console.error("Update rule error:", error);
    return NextResponse.json({ error: "Failed to update reward rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

    await prisma.rewardRule.deleteMany({
      where: { id, restaurantId: session.restaurantId },
    });

    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    console.error("Delete rule error:", error);
    return NextResponse.json({ error: "Failed to delete reward rule" }, { status: 500 });
  }
}

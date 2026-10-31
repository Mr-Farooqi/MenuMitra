import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const promoCodes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ promoCodes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { code, discountPercent, discountAmount, maxUses, expiresAt } = body;

    if (!code) {
      return NextResponse.json({ error: "Promo code required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return NextResponse.json({ error: "Promo code already exists" }, { status: 400 });
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: cleanCode,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        maxUses: maxUses ? parseInt(maxUses) : 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active: true,
      },
    });

    await logAuditEvent({
      action: "PROMO_CODE_CREATED",
      details: `Created promo code "${cleanCode}" (${discountPercent ? `${discountPercent}% off` : `₹${discountAmount} off`})`,
      actorEmail: session.email,
    });

    return NextResponse.json({ success: true, promoCode: promo });
  } catch (error) {
    console.error("Create promo code error:", error);
    return NextResponse.json({ error: "Failed to create promo code" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, active, maxUses } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        active: active !== undefined ? Boolean(active) : undefined,
        maxUses: maxUses !== undefined ? parseInt(maxUses) : undefined,
      },
    });

    return NextResponse.json({ success: true, promoCode: updated });
  } catch (error) {
    console.error("Update promo code error:", error);
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.promoCode.delete({ where: { id } });

    await logAuditEvent({
      action: "PROMO_CODE_DELETED",
      details: `Deleted promo code ID ${id}`,
      actorEmail: session.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete promo code error:", error);
    return NextResponse.json({ error: "Failed to delete promo code" }, { status: 500 });
  }
}

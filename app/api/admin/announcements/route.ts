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

  const announcements = await prisma.systemAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, message, type, targetPlan, active, expiresAt } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const announcement = await prisma.systemAnnouncement.create({
      data: {
        title,
        message,
        type: type || "INFO",
        targetPlan: targetPlan || "ALL",
        active: active !== undefined ? Boolean(active) : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await logAuditEvent({
      action: "ANNOUNCEMENT_CREATED",
      details: `Created broadcast: "${title}" (target: ${targetPlan || "ALL"})`,
      actorEmail: session.email,
    });

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, title, message, type, targetPlan, active, expiresAt } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updated = await prisma.systemAnnouncement.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        message: message !== undefined ? message : undefined,
        type: type !== undefined ? type : undefined,
        targetPlan: targetPlan !== undefined ? targetPlan : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (error) {
    console.error("Update announcement error:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
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

    await prisma.systemAnnouncement.delete({ where: { id } });

    await logAuditEvent({
      action: "ANNOUNCEMENT_DELETED",
      details: `Deleted announcement ID ${id}`,
      actorEmail: session.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}

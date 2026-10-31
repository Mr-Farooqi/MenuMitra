import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json({ tickets });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, reply, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        reply: reply !== undefined ? reply : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    console.error("Super admin update ticket error:", error);
    return NextResponse.json({ error: "Failed to update support ticket" }, { status: 500 });
  }
}

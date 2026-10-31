import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const action = searchParams.get("action") || "";

  const whereClause: Record<string, unknown> = {};

  if (action && action !== "ALL") {
    whereClause.action = action;
  }

  if (search) {
    whereClause.OR = [
      { details: { contains: search } },
      { actorEmail: { contains: search } },
      { action: { contains: search } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ logs });
}

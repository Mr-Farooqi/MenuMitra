import { NextResponse } from "next/server";
import { getSession, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session || !session.impersonatedBy) {
    return NextResponse.json({ error: "Not in an impersonated session" }, { status: 400 });
  }

  try {
    // Find original Super Admin
    const admin = await prisma.user.findFirst({
      where: { email: session.impersonatedBy, role: "SUPER_ADMIN" },
    });

    if (!admin) {
      return NextResponse.json({ error: "Original Super Admin account not found" }, { status: 404 });
    }

    // Re-create Super Admin session
    const token = await createSessionToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "SUPER_ADMIN",
    });

    await logAuditEvent({
      action: "IMPERSONATION_ENDED",
      details: `Super Admin ${admin.email} exited impersonation and returned to Admin Portal`,
      actorEmail: admin.email,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: "/admin",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Revert impersonation error:", error);
    return NextResponse.json({ error: "Failed to revert impersonation" }, { status: 500 });
  }
}

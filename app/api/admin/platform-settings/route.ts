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

  const settings = await prisma.platformSetting.findMany();
  const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  return NextResponse.json({
    businessUpiId: settingsMap["BUSINESS_UPI_ID"] || "menumitra@icici",
    businessUpiName: settingsMap["BUSINESS_UPI_NAME"] || "MenuMitra SaaS",
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const { businessUpiId, businessUpiName } = await req.json();

    if (!businessUpiId || !businessUpiId.includes("@")) {
      return NextResponse.json(
        { error: "A valid UPI ID is required (e.g. name@bank)" },
        { status: 400 }
      );
    }

    await prisma.platformSetting.upsert({
      where: { key: "BUSINESS_UPI_ID" },
      update: { value: businessUpiId.trim() },
      create: {
        key: "BUSINESS_UPI_ID",
        value: businessUpiId.trim(),
        description: "Official UPI VPA for receiving subscription payments",
      },
    });

    if (businessUpiName) {
      await prisma.platformSetting.upsert({
        where: { key: "BUSINESS_UPI_NAME" },
        update: { value: businessUpiName.trim() },
        create: {
          key: "BUSINESS_UPI_NAME",
          value: businessUpiName.trim(),
          description: "Official Payee Name displayed on UPI scan apps",
        },
      });
    }

    await logAuditEvent({
      action: "PLATFORM_SETTINGS_UPDATED",
      details: `Super Admin updated Business UPI ID to: ${businessUpiId}`,
      actorEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      businessUpiId: businessUpiId.trim(),
      businessUpiName: (businessUpiName || "MenuMitra SaaS").trim(),
    });
  } catch (error) {
    console.error("Failed to update platform settings:", error);
    return NextResponse.json({ error: "Failed to update platform settings" }, { status: 500 });
  }
}

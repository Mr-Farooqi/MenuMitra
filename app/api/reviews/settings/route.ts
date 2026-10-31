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

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  let settings = await prisma.reviewSettings.findUnique({
    where: { restaurantId: session.restaurantId },
  });

  if (!settings) {
    settings = await prisma.reviewSettings.create({
      data: {
        restaurantId: session.restaurantId,
        popupEnabled: true,
        popupDelaySeconds: 6,
        autoApprove: true,
        cooldownDays: 30,
        minBill: 0,
      },
    });
  }

  return NextResponse.json({ settings });
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
    const { popupEnabled, popupDelaySeconds, autoApprove, cooldownDays, minBill, googleReviewLink } =
      body;

    const updated = await prisma.reviewSettings.upsert({
      where: { restaurantId: session.restaurantId },
      update: {
        popupEnabled: popupEnabled !== undefined ? Boolean(popupEnabled) : undefined,
        popupDelaySeconds: popupDelaySeconds !== undefined ? parseInt(popupDelaySeconds) : undefined,
        autoApprove: autoApprove !== undefined ? Boolean(autoApprove) : undefined,
        cooldownDays: cooldownDays !== undefined ? parseInt(cooldownDays) : undefined,
        minBill: minBill !== undefined ? parseFloat(minBill) : undefined,
        googleReviewLink: googleReviewLink !== undefined ? googleReviewLink : undefined,
      },
      create: {
        restaurantId: session.restaurantId,
        popupEnabled: popupEnabled !== undefined ? Boolean(popupEnabled) : true,
        popupDelaySeconds: popupDelaySeconds !== undefined ? parseInt(popupDelaySeconds) : 6,
        autoApprove: autoApprove !== undefined ? Boolean(autoApprove) : true,
        cooldownDays: cooldownDays !== undefined ? parseInt(cooldownDays) : 30,
        minBill: minBill !== undefined ? parseFloat(minBill) : 0,
        googleReviewLink: googleReviewLink || "",
      },
    });

    // Also sync googleReviewLink to restaurant record
    if (googleReviewLink !== undefined) {
      await prisma.restaurant.update({
        where: { id: session.restaurantId },
        data: { googleReviewLink },
      });
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Update review settings error:", error);
    return NextResponse.json({ error: "Failed to update review settings" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireFeature } from "@/lib/feature-gate";
import { selectWeightedReward, generateCouponCode } from "@/lib/rewards";

export const dynamic = "force-dynamic";

// Public Polling Endpoint
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const submission = await prisma.reviewSubmission.findUnique({
      where: { id: params.id },
      include: {
        coupon: {
          include: {
            rewardRule: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: submission.status,
      reason: submission.reason,
      coupon: submission.coupon
        ? {
            code: submission.coupon.code,
            label: submission.coupon.rewardRule.label,
            type: submission.coupon.rewardRule.type,
            value: submission.coupon.rewardRule.value,
            expiresAt: submission.coupon.expiresAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Polling error:", error);
    return NextResponse.json({ error: "Failed to fetch submission status" }, { status: 500 });
  }
}

// Owner Approve / Reject action
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { action, reason } = await req.json(); // action: "APPROVE" | "REJECT"

    const submission = await prisma.reviewSubmission.findFirst({
      where: { id: params.id, restaurantId: session.restaurantId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found or unauthorized" }, { status: 404 });
    }

    if (action === "REJECT") {
      const updated = await prisma.reviewSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REJECTED",
          reason: reason || "Screenshot does not meet verification guidelines",
        },
      });
      return NextResponse.json({ success: true, submission: updated });
    }

    if (action === "APPROVE") {
      // Fetch active reward rules
      const rules = await prisma.rewardRule.findMany({
        where: { restaurantId: session.restaurantId, active: true },
      });

      const selectedRule = selectWeightedReward(rules);
      if (!selectedRule) {
        return NextResponse.json(
          { error: "No active reward rules configured. Please create a reward rule first." },
          { status: 400 }
        );
      }

      const rest = await prisma.restaurant.findUnique({
        where: { id: session.restaurantId! },
        select: { name: true },
      });
      const prefix = (rest?.name || "MITRA")
        .slice(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, "MITRA");
      const couponCode = generateCouponCode(prefix);
      const expiresAt = new Date(Date.now() + selectedRule.expiryDays * 24 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx) => {
        const sub = await tx.reviewSubmission.update({
          where: { id: submission.id },
          data: { status: "APPROVED" },
        });

        const coup = await tx.coupon.create({
          data: {
            restaurantId: session.restaurantId!,
            rewardRuleId: selectedRule.id,
            submissionId: sub.id,
            code: couponCode,
            phone: sub.phone,
            status: "ACTIVE",
            expiresAt,
          },
          include: {
            rewardRule: true,
          },
        });

        return { sub, coup };
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approve/reject error:", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }
}

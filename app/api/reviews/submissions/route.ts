import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireFeature } from "@/lib/feature-gate";
import { uploadFile, StorageError } from "@/lib/storage";
import { computeFileHash } from "@/lib/hash";
import { selectWeightedReward, generateCouponCode } from "@/lib/rewards";

export const dynamic = "force-dynamic";

// Basic in-memory rate limiting map per IP (10 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

// GET Submissions (For Restaurant Owner)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("reviewReward", session.restaurantId);
  if (gateError) return gateError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const whereClause: Record<string, unknown> = {
    restaurantId: session.restaurantId,
  };
  if (status) {
    whereClause.status = status;
  }

  const submissions = await prisma.reviewSubmission.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      coupon: {
        include: {
          rewardRule: true,
        },
      },
    },
  });

  return NextResponse.json({ submissions });
}

// POST Submission (Public Customer Endpoint)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const slug = formData.get("slug") as string | null;
    const name = (formData.get("name") as string | null)?.trim();
    const phone = (formData.get("phone") as string | null)?.trim();
    const file = formData.get("screenshot") as File | null;

    if (!slug || !name || !phone || !file) {
      return NextResponse.json(
        { error: "Name, phone, and screenshot are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Lookup restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        package: true,
        reviewSettings: true,
        rewardRules: {
          where: { active: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const features = JSON.parse(restaurant.package.features || "[]");
    if (!features.includes("reviewReward")) {
      return NextResponse.json(
        { error: "Review rewards are not enabled for this restaurant", code: "FEATURE_LOCKED" },
        { status: 403 }
      );
    }

    const settings = restaurant.reviewSettings || {
      autoApprove: false,
      cooldownDays: 30,
    };

    // 1. Phone Cooldown Check: only 1 reward per phone per cooldownDays
    const cooldownPeriod = new Date(Date.now() - settings.cooldownDays * 24 * 60 * 60 * 1000);
    const recentSubmissionForPhone = await prisma.reviewSubmission.findFirst({
      where: {
        restaurantId: restaurant.id,
        phone,
        status: { in: ["APPROVED", "PENDING"] },
        createdAt: { gte: cooldownPeriod },
      },
    });

    if (recentSubmissionForPhone) {
      return NextResponse.json(
        {
          error: `This phone number has already claimed a reward within the last ${settings.cooldownDays} days. Please visit again later!`,
          code: "PHONE_COOLDOWN_ACTIVE",
        },
        { status: 400 }
      );
    }

    // 2. Validate file and compute SHA-256 duplicate image hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageHash = await computeFileHash(buffer);

    // Check duplicate image hash in this restaurant
    const duplicateScreenshot = await prisma.reviewSubmission.findFirst({
      where: {
        restaurantId: restaurant.id,
        imageHash,
      },
    });

    if (duplicateScreenshot) {
      return NextResponse.json(
        {
          error: "This exact review screenshot has already been submitted and rewarded. Please upload your own original review screenshot.",
          code: "DUPLICATE_SCREENSHOT",
        },
        { status: 400 }
      );
    }

    // 3. Save screenshot to /public/uploads/reviews
    const uploadResult = await uploadFile(file, "reviews");

    // 4. Handle Auto-Approval & Reward Rule Selection
    if (settings.autoApprove) {
      // Pick reward using weighted random selection (server-side only)
      const selectedRule = selectWeightedReward(restaurant.rewardRules);

      if (!selectedRule) {
        return NextResponse.json(
          { error: "No active reward rules available right now. Please check with staff." },
          { status: 400 }
        );
      }

      // Generate unique coupon
      const couponCode = generateCouponCode(restaurant.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "MITRA"));
      const expiresAt = new Date(Date.now() + selectedRule.expiryDays * 24 * 60 * 60 * 1000);

      const submissionWithCoupon = await prisma.$transaction(async (tx) => {
        const sub = await tx.reviewSubmission.create({
          data: {
            restaurantId: restaurant.id,
            name,
            phone,
            screenshotUrl: uploadResult.url,
            imageHash,
            status: "APPROVED",
          },
        });

        const coup = await tx.coupon.create({
          data: {
            restaurantId: restaurant.id,
            rewardRuleId: selectedRule.id,
            submissionId: sub.id,
            code: couponCode,
            phone,
            status: "ACTIVE",
            expiresAt,
          },
          include: {
            rewardRule: true,
          },
        });

        return { sub, coup };
      });

      return NextResponse.json({
        success: true,
        status: "APPROVED",
        submissionId: submissionWithCoupon.sub.id,
        coupon: {
          code: submissionWithCoupon.coup.code,
          label: selectedRule.label,
          type: selectedRule.type,
          value: selectedRule.value,
          expiresAt: submissionWithCoupon.coup.expiresAt,
        },
      });
    } else {
      // Manual approval mode: create as PENDING
      const submission = await prisma.reviewSubmission.create({
        data: {
          restaurantId: restaurant.id,
          name,
          phone,
          screenshotUrl: uploadResult.url,
          imageHash,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        status: "PENDING",
        submissionId: submission.id,
        message: "Your review screenshot has been submitted for verification. Please wait a moment.",
      });
    }
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Failed to process review submission" }, { status: 500 });
  }
}

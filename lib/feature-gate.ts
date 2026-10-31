import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export type FeatureKey = "menu" | "qr" | "website" | "orders" | "reviewReward";

export const FEATURE_INFO: Record<
  FeatureKey,
  { name: string; description: string; requiredPlan: "BASIC" | "STANDARD" | "PREMIUM" }
> = {
  menu: {
    name: "Digital Menu",
    description: "Create and manage food categories and items",
    requiredPlan: "BASIC",
  },
  qr: {
    name: "QR Code Studio",
    description: "Generate and customize printable QR codes",
    requiredPlan: "BASIC",
  },
  website: {
    name: "Restaurant Website",
    description: "Build a responsive branded mini-site with templates",
    requiredPlan: "STANDARD",
  },
  orders: {
    name: "Online Orders & KOT",
    description: "Live table ordering and kitchen kanban management",
    requiredPlan: "STANDARD",
  },
  reviewReward: {
    name: "Google Review Rewards",
    description: "Gamified scratch cards and discount coupons for Google reviews",
    requiredPlan: "PREMIUM",
  },
};

export const PACKAGE_FEATURES: Record<string, FeatureKey[]> = {
  BASIC: ["menu", "qr"],
  STANDARD: ["menu", "qr", "website", "orders"],
  PREMIUM: ["menu", "qr", "website", "orders", "reviewReward"],
};

export function parseFeatures(featuresRaw: string | null | undefined): FeatureKey[] {
  if (!featuresRaw) return [];
  try {
    const parsed = JSON.parse(featuresRaw);
    return Array.isArray(parsed) ? (parsed as FeatureKey[]) : [];
  } catch {
    return [];
  }
}

export function hasFeature(features: string[] | string | undefined, feature: FeatureKey): boolean {
  if (!features) return false;
  const list = typeof features === "string" ? parseFeatures(features) : features;
  return list.includes(feature);
}

/**
 * Server-side feature check for API routes.
 * Returns null if allowed, or a 403 NextResponse if forbidden.
 */
export async function requireFeature(
  feature: FeatureKey,
  restaurantId: string
): Promise<NextResponse | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { package: true },
  });

  if (!restaurant) {
    return NextResponse.json(
      { error: "Restaurant not found", code: "RESTAURANT_NOT_FOUND" },
      { status: 404 }
    );
  }

  const features = parseFeatures(restaurant.package.features);
  if (!features.includes(feature)) {
    const info = FEATURE_INFO[feature];
    return NextResponse.json(
      {
        error: `The feature "${info.name}" is locked on your current plan (${restaurant.package.name}). Please upgrade to ${info.requiredPlan} to unlock.`,
        code: "FEATURE_LOCKED",
        requiredFeature: feature,
        requiredPlan: info.requiredPlan,
        currentPlan: restaurant.package.name,
      },
      { status: 403 }
    );
  }

  return null;
}

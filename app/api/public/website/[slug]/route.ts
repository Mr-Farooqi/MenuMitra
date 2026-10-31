import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFeatures } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.toLowerCase();

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: {
        package: true,
        websiteConfig: true,
        reviewSettings: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const features = parseFeatures(restaurant.package.features);
    if (!features.includes("website")) {
      return NextResponse.json(
        { error: "Website feature is not enabled for this restaurant", code: "FEATURE_LOCKED" },
        { status: 403 }
      );
    }

    const config = restaurant.websiteConfig;
    if (!config || !config.published) {
      return NextResponse.json(
        {
          unpublished: true,
          restaurant: { name: restaurant.name, slug: restaurant.slug },
          message: "This restaurant website is currently under construction.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo,
        cover: restaurant.cover,
        phone: restaurant.phone,
        timings: restaurant.timings,
        address: restaurant.address,
        city: restaurant.city,
      },
      template: config.template,
      sections: JSON.parse(config.sections || "{}"),
      reviewSettings: restaurant.reviewSettings
        ? {
            popupEnabled: restaurant.reviewSettings.popupEnabled,
            popupDelaySeconds: restaurant.reviewSettings.popupDelaySeconds,
            googleReviewLink: restaurant.reviewSettings.googleReviewLink,
          }
        : null,
      features,
    });
  } catch (error) {
    console.error("Public website fetch error:", error);
    return NextResponse.json({ error: "Failed to load website" }, { status: 500 });
  }
}

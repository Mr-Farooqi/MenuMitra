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

  const gateError = await requireFeature("website", session.restaurantId);
  if (gateError) return gateError;

  let config = await prisma.websiteConfig.findUnique({
    where: { restaurantId: session.restaurantId },
  });

  if (!config) {
    // Create default config if missing
    config = await prisma.websiteConfig.create({
      data: {
        restaurantId: session.restaurantId,
        template: "MODERN",
        published: true,
        sections: JSON.stringify({
          hero: {
            headline: "Authentic Charcoal Flavours & Warm Hospitality",
            subheadline: "Experience rich culinary traditions prepared by master chefs.",
            ctaText: "View Digital Menu",
            badge: "Award-Winning Dining",
          },
          about: {
            title: "Our Culinary Story",
            story: "We craft every dish with heritage spices, fresh local ingredients, and time-tested recipes.",
            signatureDish: "Chef's Special Clay-Oven Kebab Platter",
          },
          hours: {
            weekday: "11:00 AM – 11:00 PM",
            weekend: "11:00 AM – 11:30 PM",
            note: "Happy Hours: 4 PM to 7 PM on weekdays",
          },
          contact: {
            phone: "+91 98765 43210",
            email: "reservations@restaurant.com",
            address: "Main Market Street, City Center",
          },
          gallery: [],
        }),
      },
    });
  }

  return NextResponse.json({
    config: {
      ...config,
      sectionsData: JSON.parse(config.sections || "{}"),
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateError = await requireFeature("website", session.restaurantId);
  if (gateError) return gateError;

  try {
    const { template, sections, published } = await req.json();

    const updated = await prisma.websiteConfig.upsert({
      where: { restaurantId: session.restaurantId },
      update: {
        template: template || undefined,
        sections: sections ? JSON.stringify(sections) : undefined,
        published: published !== undefined ? Boolean(published) : undefined,
      },
      create: {
        restaurantId: session.restaurantId,
        template: template || "MODERN",
        published: published !== undefined ? Boolean(published) : true,
        sections: JSON.stringify(sections || {}),
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        ...updated,
        sectionsData: JSON.parse(updated.sections || "{}"),
      },
    });
  } catch (error) {
    console.error("Update website config error:", error);
    return NextResponse.json({ error: "Failed to update website settings" }, { status: 500 });
  }
}

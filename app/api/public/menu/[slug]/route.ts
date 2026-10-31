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
    const { searchParams } = new URL(req.url);
    const tableParam = searchParams.get("table");
    const tableNumber = tableParam ? parseInt(tableParam) : null;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: {
        package: true,
        reviewSettings: true,
        tables: {
          orderBy: { number: "asc" },
        },
        categories: {
          where: { active: true },
          orderBy: { order: "asc" },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (restaurant.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This restaurant menu is currently unavailable", code: "RESTAURANT_SUSPENDED" },
        { status: 403 }
      );
    }

    // Telemetry: Log scan event asynchronously
    try {
      await prisma.scanEvent.create({
        data: {
          restaurantId: restaurant.id,
          source: tableNumber ? "TABLE_QR" : "MENU_QR",
          tableNumber: tableNumber,
        },
      });
    } catch (e) {
      console.warn("Failed to log scan event asynchronously:", e);
    }

    const features = parseFeatures(restaurant.package.features);

    const formattedCategories = restaurant.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      items: cat.items.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price: it.price,
        image: it.image,
        isVeg: it.isVeg,
        isAvailable: it.isAvailable,
        tags: it.tags ? JSON.parse(it.tags) : [],
      })),
    }));

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
        status: restaurant.status,
      },
      features,
      reviewSettings: restaurant.reviewSettings
        ? {
            popupEnabled: restaurant.reviewSettings.popupEnabled,
            popupDelaySeconds: restaurant.reviewSettings.popupDelaySeconds,
            googleReviewLink: restaurant.reviewSettings.googleReviewLink,
            minBill: restaurant.reviewSettings.minBill,
          }
        : null,
      tables: restaurant.tables.map((t) => t.number),
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Public menu error:", error);
    return NextResponse.json({ error: "Failed to load restaurant menu" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recommendDishesWithGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { slug, query, language = "English" } = await req.json();

    if (!slug || !query) {
      return NextResponse.json({ error: "Slug and query are required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        categories: {
          where: { active: true },
          include: {
            items: {
              where: { isAvailable: true },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Flatten available menu items
    const menuItems = restaurant.categories.flatMap((cat) =>
      cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        isVeg: item.isVeg,
        categoryName: cat.name,
        description: item.description,
      }))
    );

    if (menuItems.length === 0) {
      return NextResponse.json({
        message: "Our kitchen is updating the menu right now. Please ask our server for today's special!",
        recommendedItemIds: [],
        chefTip: "Fresh food takes a little love and patience!",
      });
    }

    const aiRecommendation = await recommendDishesWithGemini({
      menuItems,
      customerQuery: query,
      restaurantName: restaurant.name,
      language,
    });

    return NextResponse.json({
      success: true,
      ...aiRecommendation,
      aiModel: "Google Gemini 1.5 Flash (DeepMind)",
    });
  } catch (error) {
    console.error("Chef Mitra Error:", error);
    return NextResponse.json({ error: "Failed to process culinary recommendation" }, { status: 500 });
  }
}

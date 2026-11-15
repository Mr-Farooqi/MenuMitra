import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enhanceMenuItemWithGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, categoryName = "Main Course", isVeg = true } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Dish name is required" }, { status: 400 });
    }

    const result = await enhanceMenuItemWithGemini({
      name,
      categoryName,
      isVeg,
    });

    return NextResponse.json({
      success: true,
      ...result,
      aiModel: "Google Gemini 1.5 Flash (DeepMind)",
    });
  } catch (error) {
    console.error("AI Enhance Item Error:", error);
    return NextResponse.json({ error: "Failed to enhance menu item" }, { status: 500 });
  }
}

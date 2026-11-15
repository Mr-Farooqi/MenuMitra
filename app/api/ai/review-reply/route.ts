import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateGeminiReviewReply } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewerName, stars = 5, reviewSnippet, tone = "warm" } = await req.json();

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { name: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const reply = await generateGeminiReviewReply({
      reviewerName: reviewerName || "Valued Guest",
      stars: Number(stars) || 5,
      reviewSnippet: reviewSnippet || "Loved the food and ambiance!",
      restaurantName: restaurant.name,
      tone,
    });

    return NextResponse.json({
      success: true,
      reply,
      aiModel: "Google Gemini 1.5 Flash (DeepMind)",
    });
  } catch (error) {
    console.error("AI Review Reply Error:", error);
    return NextResponse.json({ error: "Failed to generate AI reply" }, { status: 500 });
  }
}

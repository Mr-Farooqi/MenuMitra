import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFeatures } from "@/lib/feature-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });

    const formatted = packages.map((pkg) => ({
      ...pkg,
      featuresList: parseFeatures(pkg.features),
    }));

    return NextResponse.json({ packages: formatted });
  } catch (error) {
    console.error("Fetch packages error:", error);
    return NextResponse.json({ error: "Failed to load packages" }, { status: 500 });
  }
}

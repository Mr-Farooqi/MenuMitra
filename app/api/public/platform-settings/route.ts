import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: ["BUSINESS_UPI_ID", "BUSINESS_UPI_NAME"],
        },
      },
    });

    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return NextResponse.json({
      businessUpiId: settingsMap["BUSINESS_UPI_ID"] || "menumitra@icici",
      businessUpiName: settingsMap["BUSINESS_UPI_NAME"] || "MenuMitra SaaS",
    });
  } catch (error) {
    console.error("Failed to fetch public platform settings:", error);
    return NextResponse.json({
      businessUpiId: "menumitra@icici",
      businessUpiName: "MenuMitra SaaS",
    });
  }
}

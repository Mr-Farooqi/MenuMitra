import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const [
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    suspendedRestaurants,
    totalOrders,
    totalScans,
    packages,
    recentOrders,
    recentRestaurants,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { status: "ACTIVE" } }),
    prisma.restaurant.count({ where: { status: "PENDING" } }),
    prisma.restaurant.count({ where: { status: "SUSPENDED" } }),
    prisma.order.count(),
    prisma.scanEvent.count(),
    prisma.package.findMany({
      include: {
        _count: {
          select: { restaurants: true },
        },
      },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { restaurant: { select: { name: true } } },
    }),
    prisma.restaurant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { package: true },
    }),
  ]);

  // Calculate MRR from active restaurants
  const allActiveRestaurantsWithPkg = await prisma.restaurant.findMany({
    where: { status: "ACTIVE" },
    include: { package: true },
  });

  const mrr = allActiveRestaurantsWithPkg.reduce((sum, r) => sum + (r.package?.price || 0), 0);

  // Calculate GMV (Gross Merchandise Value of orders)
  const gmvAggregate = await prisma.order.aggregate({
    _sum: { total: true },
  });
  const gmv = gmvAggregate._sum.total || 0;

  // City-wise distribution
  const allRestaurants = await prisma.restaurant.findMany({
    select: { city: true },
  });
  const cityCounts: Record<string, number> = {};
  for (const r of allRestaurants) {
    const city = r.city ? r.city.trim() : "Unspecified";
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  }
  const topCities = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    stats: {
      totalRestaurants,
      activeRestaurants,
      pendingRestaurants,
      suspendedRestaurants,
      mrr,
      gmv,
      totalOrders,
      totalScans,
      topCities,
    },
    packages,
    recentOrders,
    recentRestaurants,
  });
}

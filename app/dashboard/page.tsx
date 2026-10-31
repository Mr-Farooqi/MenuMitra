import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR, formatDateTime } from "@/lib/utils";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import {
  QrCode,
  ShoppingBag,
  IndianRupee,
  Star,
  Gift,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const session = await getSession();
  if (!session || !session.restaurantId) {
    redirect("/login");
  }

  const restaurantId = session.restaurantId;

  // Start of today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Queries in parallel
  const [
    todayScans,
    totalScans,
    todayOrders,
    totalOrders,
    reviewStats,
    couponsIssued,
    couponsRedeemed,
    recentOrders,
    restaurant,
  ] = await Promise.all([
    prisma.scanEvent.count({
      where: { restaurantId, timestamp: { gte: startOfDay } },
    }),
    prisma.scanEvent.count({
      where: { restaurantId },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOfDay }, status: { not: "CANCELLED" } },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: { restaurantId, status: { not: "CANCELLED" } },
      select: { total: true },
    }),
    prisma.reviewSubmission.count({
      where: { restaurantId, status: "APPROVED" },
    }),
    prisma.coupon.count({
      where: { restaurantId },
    }),
    prisma.coupon.count({
      where: { restaurantId, status: "REDEEMED" },
    }),
    prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: true,
      },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { package: true },
    }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = totalOrders.reduce((sum, o) => sum + o.total, 0);
  const redemptionRate = couponsIssued > 0 ? Math.round((couponsRedeemed / couponsIssued) * 100) : 0;

  // Build 7-day trend data from real DB
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const [dayScans, dayOrders] = await Promise.all([
      prisma.scanEvent.count({
        where: { restaurantId, timestamp: { gte: d, lt: nextD } },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: d, lt: nextD }, status: { not: "CANCELLED" } },
        select: { total: true },
      }),
    ]);

    const dayRevenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
    trendData.push({
      day: daysOfWeek[d.getDay()],
      scans: dayScans,
      orders: dayOrders.length,
      revenue: Math.round(dayRevenue),
    });
  }

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700 border-blue-200",
    PREPARING: "bg-amber-100 text-amber-700 border-amber-200",
    READY: "bg-purple-100 text-purple-700 border-purple-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-stone-100 text-stone-600 border-stone-200",
  };

  return (
    <div className="space-y-8">
      <AnnouncementBanner />

      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Swagat Hai! Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Real-time analytics for <span className="font-semibold text-stone-700">{restaurant?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/menu">
            <Button size="sm" variant="outline" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Dish
            </Button>
          </Link>
          <Link href="/dashboard/qr">
            <Button size="sm" variant="outline" className="text-xs">
              <QrCode className="w-3.5 h-3.5 mr-1" />
              Print QR
            </Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button size="sm" className="text-xs shadow-sm">
              <ShoppingBag className="w-3.5 h-3.5 mr-1" />
              Kitchen Live
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Scans Card */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Scans Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900">{todayScans}</span>
            <span className="text-xs text-stone-500 font-medium">Total: {totalScans}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active table QR telemetry</span>
          </div>
        </div>

        {/* Orders & Revenue Card */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Today&apos;s Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900">{formatINR(todayRevenue)}</span>
            <span className="text-xs text-stone-500 font-medium">{todayOrders.length} orders</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500 font-medium">
            Total all-time: <span className="font-bold text-stone-700">{formatINR(totalRevenue)}</span>
          </div>
        </div>

        {/* Reviews Generated */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Google Reviews
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900">{reviewStats}</span>
            <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              5-Star Verified
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
            Powered by Review Scratch Cards
          </div>
        </div>

        {/* Coupons Issued vs Redeemed */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Coupons Redeemed
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900">{couponsRedeemed}</span>
            <span className="text-xs text-stone-500 font-medium">of {couponsIssued} issued</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Redemption Rate:</span>
            <span className="font-extrabold text-purple-700">{redemptionRate}%</span>
          </div>
        </div>
      </div>

      {/* Real Charts Section */}
      <OverviewCharts data={trendData} />

      {/* Recent Orders List */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">Recent Table Orders</h3>
            <p className="text-xs text-stone-500">Real-time dine-in orders placed via menu</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Open Kitchen Board
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-10 text-stone-400 text-sm">
            No orders placed yet. Scan Table 1 QR to place your first test order!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Table / Guest</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Total (₹)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/70">
                    <td className="py-3.5 font-bold text-stone-900">
                      Table {order.tableNumber || "-"}
                      <span className="block text-[11px] font-normal text-stone-500">
                        {order.customerName || "Dine-in Guest"}
                      </span>
                    </td>
                    <td className="py-3.5 text-stone-700 max-w-xs truncate">
                      {order.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                    </td>
                    <td className="py-3.5 font-black text-stone-900">
                      {formatINR(order.total)}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          statusColors[order.status] || "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-stone-400">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

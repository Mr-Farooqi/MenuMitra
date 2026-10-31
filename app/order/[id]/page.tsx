"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  ChefHat,
  Bell,
  XCircle,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatDateTime } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
}

interface OrderData {
  id: string;
  tableNumber: number | null;
  customerName: string | null;
  phone: string | null;
  notes: string | null;
  total: number;
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  paymentMode: string;
  createdAt: string;
  items: OrderItem[];
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    phone: string | null;
    address: string | null;
  };
}

const STATUS_STEPS = [
  { key: "NEW", label: "Order Received", icon: Clock, desc: "Sent to chef" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, desc: "Cooking in kitchen" },
  { key: "READY", label: "Ready to Serve", icon: Bell, desc: "Delivering to your table" },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle2, desc: "Enjoy your meal!" },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order not found");
      }
      setOrder(data.order);
    } catch (err: unknown) {
      setError((err as Error).message || "Could not track order");
    } finally {
      setLoading(false);
    }
  };

  // Poll order status every 5s
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center animate-spin">
          <Clock className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-stone-700">Connecting to Kitchen...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-stone-900">Order Not Found</h2>
        <p className="text-xs text-stone-500">{error || "Please check your order link."}</p>
        <Link href="/">
          <Button size="sm">Go to Home</Button>
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "CANCELLED";
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-200 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            {order.restaurant.logo ? (
              <img
                src={order.restaurant.logo}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover border border-stone-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            )}
            <h1 className="text-xl font-black text-stone-900">{order.restaurant.name}</h1>
          </div>

          <div className="inline-block px-4 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-black uppercase tracking-wider">
            Table {order.tableNumber || "-"} • Order #{order.id.slice(-6).toUpperCase()}
          </div>

          {/* Status Tracker */}
          {isCancelled ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-center space-y-1">
              <p className="font-bold text-sm">Order Cancelled</p>
              <p className="text-xs">Please contact your server or cashier for assistance.</p>
            </div>
          ) : (
            <div className="py-4">
              <div className="grid grid-cols-4 gap-2 relative">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = currentStepIdx >= idx;
                  const isCurrent = currentStepIdx === idx;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center space-y-1.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-brand-500 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-100 scale-110"
                            : isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold leading-tight ${
                          isCurrent ? "text-brand-700" : isDone ? "text-stone-900" : "text-stone-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
                {order.status === "NEW" && "Your order is confirmed and has been sent to the chef!"}
                {order.status === "PREPARING" && "The kitchen is actively preparing your fresh dishes!"}
                {order.status === "READY" && "Dishes are hot and ready! Your server is bringing them."}
                {order.status === "COMPLETED" && "Delivered! Swaad ka anand lein (Enjoy your meal)."}
              </div>
            </div>
          )}
        </div>

        {/* Order Items Breakdown */}
        <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-200 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-black text-stone-900">Dishes Ordered</h3>
            <span className="text-xs text-stone-400">{formatDateTime(order.createdAt)}</span>
          </div>

          <div className="divide-y divide-stone-100 space-y-2">
            {order.items.map((it) => (
              <div key={it.id} className="pt-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-stone-900">
                    {it.quantity}x {it.name}
                  </span>
                  {it.notes && (
                    <span className="block text-[11px] text-stone-500 italic mt-0.5">
                      Note: {it.notes}
                    </span>
                  )}
                </div>
                <span className="font-black text-stone-900">{formatINR(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="pt-3 border-t border-stone-100 text-xs text-stone-600">
              <span className="font-bold">Table Instructions:</span> {order.notes}
            </div>
          )}

          <div className="pt-3 border-t border-stone-200 flex items-center justify-between font-black text-base text-stone-900">
            <span>Total Bill:</span>
            <span className="text-brand-600 text-lg">{formatINR(order.total)}</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/m/${order.restaurant.slug}?table=${order.tableNumber || 1}`}
            className="flex-1"
          >
            <Button variant="outline" className="w-full font-bold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Order More Dishes
            </Button>
          </Link>
          <Link href={`/reward/${order.restaurant.slug}`} className="flex-1">
            <Button className="w-full font-bold shadow-md shadow-brand-500/25">
              Review & Win Scratch Card 🎁
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

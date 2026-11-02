"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
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
  CreditCard,
  QrCode,
  Receipt,
  Gift,
  Check,
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
  subtotal?: number | null;
  discount?: number | null;
  couponCode?: string | null;
  total: number;
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  paymentMode: string;
  paymentStatus?: string | null;
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order not found");
      }
      setOrder(data.order);

      // Persist active order in localStorage for continuous menu tracking
      if (data.order?.restaurant?.slug) {
        localStorage.setItem(
          `menumitra_active_order_${data.order.restaurant.slug}`,
          JSON.stringify({
            orderId: data.order.id,
            tableNumber: data.order.tableNumber,
            status: data.order.status,
            createdAt: data.order.createdAt,
            total: data.order.total,
          })
        );
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Could not track order");
    } finally {
      setLoading(false);
    }
  };

  // Generate UPI QR if payment is UPI
  useEffect(() => {
    if (!order || order.paymentMode !== "UPI" || order.paymentStatus === "PAID") return;
    const upiPayeeId = order.restaurant.phone
      ? `${order.restaurant.phone.replace(/[^0-9]/g, "")}@upi`
      : "menumitra@icici";
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiPayeeId)}&pn=${encodeURIComponent(
      order.restaurant.name
    )}&am=${order.total.toFixed(2)}&cu=INR&tn=Table${order.tableNumber || ""}_${order.id.slice(-6).toUpperCase()}`;

    QRCode.toDataURL(upiUri, {
      width: 180,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("UPI QR gen error:", err));
  }, [order]);

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

          {/* Pricing breakdown */}
          <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-stone-600">
              <span>Items Subtotal:</span>
              <span className="font-bold">{formatINR(order.subtotal || order.total)}</span>
            </div>

            {order.discount && order.discount > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span className="flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-emerald-600" />
                  Scratch Card Coupon ({order.couponCode || "Reward"}):
                </span>
                <span>-{formatINR(order.discount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between font-black text-base text-stone-900 pt-2 border-t border-stone-100">
              <span>Total Bill:</span>
              <span className="text-brand-600 text-lg">{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Option & Status Card */}
        <div className="bg-white rounded-3xl p-5 shadow-soft border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {order.paymentMode === "UPI" ? (
                <QrCode className="w-4 h-4 text-brand-600" />
              ) : order.paymentMode === "CASH" ? (
                <Receipt className="w-4 h-4 text-stone-700" />
              ) : (
                <CreditCard className="w-4 h-4 text-stone-700" />
              )}
              <span className="text-xs font-bold text-stone-900">
                {order.paymentMode === "UPI"
                  ? "UPI Digital Payment"
                  : order.paymentMode === "CASH"
                  ? "Cash on Table"
                  : "Pay at Counter (Cash / Card)"}
              </span>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                order.paymentStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {order.paymentStatus === "PAID" ? "PAID ✓" : "PAYMENT PENDING"}
            </span>
          </div>

          {/* If UPI and pending, show QR Code & Pay link */}
          {order.paymentMode === "UPI" && order.paymentStatus !== "PAID" && qrDataUrl && (
            <div className="p-3 bg-brand-50/50 rounded-2xl border border-brand-200/80 text-center space-y-2">
              <p className="text-xs font-bold text-stone-800">
                Scan to Pay {formatINR(order.total)}
              </p>
              <img
                src={qrDataUrl}
                alt="UPI QR Code"
                className="w-32 h-32 mx-auto rounded-xl border border-stone-200 shadow-sm"
              />
              <div className="flex items-center justify-center gap-2">
                <a
                  href={`upi://pay?pa=${encodeURIComponent(
                    order.restaurant.phone
                      ? `${order.restaurant.phone.replace(/[^0-9]/g, "")}@upi`
                      : "menumitra@icici"
                  )}&pn=${encodeURIComponent(order.restaurant.name)}&am=${order.total.toFixed(
                    2
                  )}&cu=INR`}
                  className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 shadow-sm"
                >
                  Open in UPI App
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const upiId = order.restaurant.phone
                      ? `${order.restaurant.phone.replace(/[^0-9]/g, "")}@upi`
                      : "menumitra@icici";
                    navigator.clipboard.writeText(upiId);
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200"
                >
                  {copiedUpi ? "Copied ✓" : "Copy UPI"}
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-stone-500 leading-relaxed">
            {order.paymentMode === "PAY_AT_COUNTER"
              ? "You can settle this bill at the counter after finishing your meal."
              : order.paymentMode === "CASH"
              ? "Your server will bring the bill and collect cash at Table " + (order.tableNumber || "-") + "."
              : "Show payment confirmation or UTR to your server once paid."}
          </p>
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

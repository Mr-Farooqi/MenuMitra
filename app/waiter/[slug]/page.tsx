"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  Key,
  Smartphone,
  Lock,
  Unlock,
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  QrCode,
  Gift,
  X,
  CreditCard,
  LogOut,
  UtensilsCrossed,
  Printer,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
}

interface Order {
  id: string;
  tableNumber: number | null;
  customerName: string | null;
  phone: string | null;
  notes: string | null;
  subtotal: number | null;
  discount: number | null;
  couponCode: string | null;
  total: number;
  status: string;
  paymentMode: string;
  paymentStatus: string | null;
  createdAt: string;
  items: OrderItem[];
}

interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  address: string | null;
}

export default function WaiterMobileStationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string)?.toLowerCase();

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Restaurant & Orders State
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Apply Coupon Modal State
  const [couponModalOrder, setCouponModalOrder] = useState<Order | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // UPI QR Modal State
  const [upiOrder, setUpiOrder] = useState<Order | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState<string>("");

  // Check existing token on mount
  useEffect(() => {
    if (!slug) return;
    const saved = localStorage.getItem(`menumitra_waiter_token_${slug}`);
    if (saved) {
      setToken(saved);
    }
  }, [slug]);

  // Authenticate PIN
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setPinError("Please enter the complete 4-digit PIN");
      return;
    }

    setVerifyingPin(true);
    setPinError("");

    try {
      const res = await fetch("/api/waiter/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Incorrect PIN. Check dashboard.");
        setPin("");
      } else {
        localStorage.setItem(`menumitra_waiter_token_${slug}`, data.token);
        setToken(data.token);
        setRestaurant(data.restaurant);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    } catch {
      setPinError("Unable to connect to server. Try again.");
    } finally {
      setVerifyingPin(false);
    }
  };

  // Dial pad helper
  const handleKeypadPress = (val: string) => {
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      setPinError("");
      if (nextPin.length === 4) {
        // Auto submit when 4th digit entered
        setTimeout(() => {
          verifyPinDirect(nextPin);
        }, 150);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const verifyPinDirect = async (pinValue: string) => {
    setVerifyingPin(true);
    setPinError("");
    try {
      const res = await fetch("/api/waiter/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin: pinValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Incorrect PIN");
        setPin("");
      } else {
        localStorage.setItem(`menumitra_waiter_token_${slug}`, data.token);
        setToken(data.token);
        setRestaurant(data.restaurant);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    } catch {
      setPinError("Connection error");
    } finally {
      setVerifyingPin(false);
    }
  };

  // Lock / Logout Waiter Station
  const handleLockStation = () => {
    localStorage.removeItem(`menumitra_waiter_token_${slug}`);
    setToken(null);
    setPin("");
    setPinError("");
  };

  // Fetch Orders
  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/waiter/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Token expired or PIN rotated by owner
        handleLockStation();
        setPinError("Station PIN was rotated by management. Please re-enter the new PIN.");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.restaurant) setRestaurant(data.restaurant);
      }
    } catch (err) {
      console.error("Waiter fetch error", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (token) {
      setLoadingOrders(true);
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000); // Live poll every 5s
      return () => clearInterval(interval);
    }
  }, [token]);

  // Serve Order
  const handleServe = async (orderId: string) => {
    if (!token) return;
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/waiter/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "SERVE", orderId }),
      });
      if (res.ok) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        await fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Collect Payment (Cash or UPI)
  const handlePayment = async (orderId: string, mode: "CASH" | "UPI") => {
    if (!token) return;
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/waiter/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "PAYMENT", orderId, paymentMode: mode, paymentStatus: "PAID" }),
      });
      if (res.ok) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        setUpiOrder(null);
        await fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Open UPI QR
  const handleOpenUpi = async (order: Order) => {
    setUpiOrder(order);
    const upiUri = `upi://pay?pa=restaurant@upi&pn=${encodeURIComponent(restaurant?.name || "Restaurant")}&am=${order.total}&cu=INR&tn=Table${order.tableNumber || 1}`;
    try {
      const qr = await QRCode.toDataURL(upiUri, { width: 220, margin: 1 });
      setUpiQrUrl(qr);
    } catch (err) {
      console.error(err);
    }
  };

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!token || !couponModalOrder || !couponCodeInput.trim()) return;
    setCouponSubmitting(true);
    setCouponError("");

    try {
      const res = await fetch("/api/waiter/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "APPLY_COUPON",
          orderId: couponModalOrder.id,
          couponCode: couponCodeInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Failed to apply coupon");
      } else {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        setCouponModalOrder(null);
        setCouponCodeInput("");
        await fetchOrders();
      }
    } catch {
      setCouponError("Redemption failed unexpectedly");
    } finally {
      setCouponSubmitting(false);
    }
  };

  // Thermal Print Slip
  const handlePrint = (order: Order) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Slip - Table ${order.tableNumber}</title>
          <style>
            body { font-family: monospace; padding: 10px; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${restaurant?.name || "MenuMitra"}</div>
          <div class="center">TABLE ${order.tableNumber || "Dine-in"} RECEIPT</div>
          <div class="center">${new Date(order.createdAt).toLocaleTimeString("en-IN")}</div>
          <div class="divider"></div>
          ${order.items.map((i) => `<div class="flex"><span>${i.quantity}x ${i.name}</span><span>₹${i.price * i.quantity}</span></div>`).join("")}
          <div class="divider"></div>
          <div class="flex"><span>Subtotal:</span><span>₹${order.subtotal || order.total}</span></div>
          ${order.discount ? `<div class="flex bold"><span>Discount:</span><span>-₹${order.discount}</span></div>` : ""}
          <div class="flex bold" style="font-size: 16px;"><span>TOTAL:</span><span>₹${order.total}</span></div>
          <div class="divider"></div>
          <div class="center">Payment: ${order.paymentMode} (${order.paymentStatus || "PENDING"})</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Filter Tables
  const uniqueTables = Array.from(
    new Set(orders.map((o) => o.tableNumber).filter((n): n is number => n !== null))
  ).sort((a, b) => a - b);

  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");

  const displayedOrders = (statusFilter === "ACTIVE" ? activeOrders : completedOrders).filter(
    (order) => {
      if (selectedTable === "ALL") return true;
      return order.tableNumber?.toString() === selectedTable;
    }
  );

  // ==========================================
  // VIEW 1: PIN UNLOCK SCREEN (BEFORE LOGIN)
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center items-center p-4">
        <div className="max-w-xs w-full bg-white rounded-3xl p-6 shadow-soft-lg border-2 border-amber-300 text-center space-y-5 animate-in fade-in">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Floor Captain / Waiter Portal
              </span>
              <h2 className="text-xl font-black text-stone-900 mt-1 capitalize">
                {slug.replace(/-/g, " ")}
              </h2>
              <p className="text-xs text-stone-500">
                Enter the 4-digit PIN shown on the Restaurant Dashboard
              </p>
            </div>
          </div>

          {/* PIN Digit Indicators */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => {
              const digit = pin[index];
              return (
                <div
                  key={index}
                  className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                    digit
                      ? "border-brand-500 bg-brand-50/50 text-stone-900 scale-105 shadow-sm"
                      : "border-stone-200 bg-stone-50 text-transparent"
                  }`}
                >
                  {digit ? "●" : ""}
                </div>
              );
            })}
          </div>

          {pinError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {pinError}
            </p>
          )}

          {/* Numeric Touch Dial Pad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="h-13 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-amber-100 text-stone-900 font-black text-xl flex items-center justify-center transition shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin("")}
              className="h-13 rounded-2xl bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 font-bold text-xs flex items-center justify-center transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="h-13 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-amber-100 text-stone-900 font-black text-xl flex items-center justify-center transition shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-13 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-black text-base flex items-center justify-center transition"
            >
              ⌫
            </button>
          </div>

          <Button
            onClick={() => handlePinSubmit()}
            isLoading={verifyingPin}
            disabled={pin.length !== 4 || verifyingPin}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-black text-sm rounded-2xl shadow-md"
          >
            <Unlock className="w-4 h-4 mr-1.5" />
            Unlock Waiter Station
          </Button>

          <p className="text-[10px] text-stone-400">
            🔒 Secure Staff Access. Management PIN rotates periodically.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: UNLOCKED WAITER OPERATIONS PORTAL
  // ==========================================
  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 pb-20">
      {/* Mobile Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-4 py-3 shadow-2xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-black text-xs shadow-xs">
              👨‍🍳
            </div>
            <div>
              <h1 className="text-sm font-black text-stone-900 leading-snug truncate max-w-[180px]">
                {restaurant?.name || "Waiter Station"}
              </h1>
              <p className="text-[10px] text-stone-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Floor &bull; {activeOrders.length} Active Tables
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
              title="Refresh Orders"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLockStation}
              className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition"
              title="Lock Station"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs (Active vs Served) */}
        <div className="max-w-2xl mx-auto mt-2.5 flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition ${
              statusFilter === "ACTIVE"
                ? "bg-stone-900 text-white shadow-2xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Active Orders ({activeOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter("COMPLETED")}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition ${
              statusFilter === "COMPLETED"
                ? "bg-stone-900 text-white shadow-2xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Served / Closed ({completedOrders.length})
          </button>
        </div>

        {/* Table Filter Pills */}
        <div className="max-w-2xl mx-auto mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedTable("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
              selectedTable === "ALL"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Tables
          </button>
          {uniqueTables.map((tNum) => (
            <button
              key={tNum}
              onClick={() => setSelectedTable(tNum.toString())}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedTable === tNum.toString()
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Table {tNum}
            </button>
          ))}
        </div>
      </header>

      {/* Main Orders List */}
      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {loadingOrders && orders.length === 0 ? (
          <div className="p-10 text-center text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
            <p className="text-xs font-bold">Syncing floor orders...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 space-y-2">
            <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-bold text-stone-800">
              {statusFilter === "ACTIVE"
                ? "No pending orders on tables!"
                : "No served orders yet."}
            </h3>
            <p className="text-xs text-stone-400">
              {statusFilter === "ACTIVE"
                ? "When customers place orders from QR code, they appear here live."
                : "Orders you mark as Served will be listed here."}
            </p>
          </div>
        ) : (
          displayedOrders.map((order) => {
            const isCompleted = order.status === "COMPLETED";
            const isPaid = order.paymentStatus === "PAID";

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-soft transition-all space-y-3.5 ${
                  isCompleted
                    ? "border-stone-200 opacity-80"
                    : "border-brand-200 ring-1 ring-brand-100"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-stone-900 text-amber-400 font-black text-base flex items-center justify-center shadow-xs">
                      T-{order.tableNumber || "?"}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-stone-900 leading-snug">
                        Table {order.tableNumber || "Dine-in"} &bull; {order.customerName || "Guest"}
                      </h3>
                      <p className="text-[10px] text-stone-400 font-medium">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isCompleted
                        ? "bg-stone-100 text-stone-600"
                        : "bg-emerald-100 text-emerald-800 animate-pulse"
                    }`}
                  >
                    {isCompleted ? "✓ Served" : order.status}
                  </span>
                </div>

                {/* Cooking Note if any */}
                {order.notes && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-950">
                    <strong>Note:</strong> {order.notes}
                  </div>
                )}

                {/* Items Ordered */}
                <div className="divide-y divide-stone-100">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">
                        <span className="text-brand-600 mr-1.5 font-black">{item.quantity}&times;</span>
                        {item.name}
                      </span>
                      <span className="font-semibold text-stone-600">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bill Breakdown */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-stone-800">
                      {formatINR(order.subtotal || order.total)}
                    </span>
                  </div>

                  {order.discount ? (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" /> Coupon Discount ({order.couponCode}):
                      </span>
                      <span>-{formatINR(order.discount)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-stone-900 font-black text-sm pt-1 border-t border-stone-200">
                    <span>Grand Total:</span>
                    <span className="text-brand-600">{formatINR(order.total)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-stone-500 font-medium">
                      Mode: <strong>{order.paymentMode}</strong>
                    </span>
                    <span
                      className={`font-black uppercase px-2 py-0.5 rounded ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isPaid ? "PAID ✓" : "PAYMENT PENDING"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Waiter */}
                <div className="space-y-2 pt-1">
                  {/* Mark as Served */}
                  {!isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => handleServe(order.id)}
                      isLoading={actionLoading === order.id}
                      className="w-full py-3 bg-stone-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Mark as Served to Table ✓</span>
                    </Button>
                  )}

                  {/* Payment Actions */}
                  {!isPaid ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePayment(order.id, "CASH")}
                        isLoading={actionLoading === order.id}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl"
                      >
                        <span>💵 Collect Cash</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenUpi(order)}
                        className="py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>UPI QR</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800">
                      ✓ Payment Cleared ({order.paymentMode})
                    </div>
                  )}

                  {/* Coupon & Print Actions */}
                  <div className="flex items-center gap-2">
                    {!order.couponCode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCouponModalOrder(order);
                          setCouponCodeInput("");
                          setCouponError("");
                        }}
                        className="flex-1 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        <span>Apply Coupon Code</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs font-bold text-stone-600">
                        Coupon Applied ({order.couponCode})
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePrint(order)}
                      className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition flex items-center justify-center gap-1"
                      title="Print Table Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* MODAL 1: APPLY COUPON CODE */}
      {couponModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-stone-900">
                  Apply Customer Coupon
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCouponModalOrder(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
              <div className="flex justify-between text-stone-700">
                <span>Table:</span>
                <span className="font-bold">Table {couponModalOrder.tableNumber}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Bill Amount:</span>
                <span className="font-black text-stone-900">
                  {formatINR(couponModalOrder.subtotal || couponModalOrder.total)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Enter Scratch Card Voucher Code
              </label>
              <input
                type="text"
                value={couponCodeInput}
                onChange={(e) => {
                  setCouponCodeInput(e.target.value.toUpperCase());
                  setCouponError("");
                }}
                placeholder="e.g. RAJW-DBE23"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[10px] text-stone-400">
                Type the coupon code from the customer's scratched reward card.
              </p>
            </div>

            {couponError && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {couponError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCouponModalOrder(null)}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCoupon}
                isLoading={couponSubmitting}
                disabled={!couponCodeInput.trim() || couponSubmitting}
                className="flex-1 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white"
              >
                Apply Discount
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPI QR CODE */}
      {upiOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-brand-200 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand-600" />
                Table {upiOrder.tableNumber} &bull; UPI QR Payment
              </h3>
              <button
                type="button"
                onClick={() => setUpiOrder(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-stone-500 font-medium">Customer Scans:</span>
              <div className="text-2xl font-black text-stone-900">{formatINR(upiOrder.total)}</div>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-brand-200 shadow-sm inline-block">
              {upiQrUrl ? (
                <img
                  src={upiQrUrl}
                  alt="UPI QR Code"
                  className="w-44 h-44 mx-auto rounded-xl"
                />
              ) : (
                <div className="w-44 h-44 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-400">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-[11px] text-stone-500">
              Customer can scan this directly using GPay, PhonePe, Paytm, or BHIM.
            </p>

            <Button
              onClick={() => handlePayment(upiOrder.id, "UPI")}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md rounded-xl"
            >
              ✓ Confirm Received UPI Payment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

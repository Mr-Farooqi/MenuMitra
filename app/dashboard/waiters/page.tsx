"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  Smartphone,
  Key,
  RefreshCw,
  QrCode,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Receipt,
  CreditCard,
  Gift,
  Search,
  Filter,
  AlertCircle,
  Printer,
  X,
  Sparkles,
  UtensilsCrossed,
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

export default function WaiterStationDashboardPage() {
  const [pinData, setPinData] = useState<{
    pin: string;
    updatedAt: string | null;
    slug: string;
    name: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [regeneratingPin, setRegeneratingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");

  // Modals & Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [couponModalOrder, setCouponModalOrder] = useState<Order | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // UPI QR Modal
  const [upiModalOrder, setUpiModalOrder] = useState<Order | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");

  // 1. Fetch Waiter PIN and generate station QR
  const loadPinInfo = async () => {
    try {
      const res = await fetch("/api/waiter/pin");
      if (res.ok) {
        const data = await res.json();
        setPinData(data);

        // Generate QR Code for waiters to scan
        const stationUrl = `${window.location.origin}/waiter/${data.slug}`;
        const qr = await QRCode.toDataURL(stationUrl, {
          width: 240,
          margin: 1,
          color: { dark: "#1c1917", light: "#ffffff" },
        });
        setQrDataUrl(qr);
      }
    } catch (err) {
      console.error("Failed to load waiter PIN", err);
    }
  };

  // 2. Fetch Orders
  const loadOrders = async () => {
    try {
      const res = await fetch("/api/waiter/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load waiter orders", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadPinInfo();
    loadOrders();
    const interval = setInterval(loadOrders, 6000); // Poll every 6 seconds
    return () => clearInterval(interval);
  }, []);

  // Regenerate Security PIN
  const handleRegeneratePin = async () => {
    if (!confirm("Are you sure you want to generate a new Waiter PIN? Any currently active waiter sessions will be required to enter the new PIN.")) {
      return;
    }

    setRegeneratingPin(true);
    setPinMessage(null);
    try {
      const res = await fetch("/api/waiter/pin", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.pin) {
        setPinData((prev) => (prev ? { ...prev, pin: data.pin, updatedAt: data.updatedAt } : null));
        setPinMessage(`New PIN generated: ${data.pin}`);
        setTimeout(() => setPinMessage(null), 5000);
      }
    } catch (err) {
      console.error("Failed to regenerate PIN", err);
    } finally {
      setRegeneratingPin(false);
    }
  };

  // Copy Station Link
  const handleCopyLink = () => {
    if (!pinData) return;
    const url = `${window.location.origin}/waiter/${pinData.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Serve Order
  const handleServeOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/waiter/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SERVE", orderId }),
      });
      if (res.ok) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        await loadOrders();
      }
    } catch (err) {
      console.error("Serve order failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Mark Payment as Paid (Cash or UPI)
  const handleCollectPayment = async (orderId: string, mode: "CASH" | "UPI") => {
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/waiter/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PAYMENT", orderId, paymentMode: mode, paymentStatus: "PAID" }),
      });
      if (res.ok) {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
        setUpiModalOrder(null);
        await loadOrders();
      }
    } catch (err) {
      console.error("Payment collection failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Open UPI QR Modal
  const openUpiModal = async (order: Order) => {
    setUpiModalOrder(order);
    const upiUri = `upi://pay?pa=restaurant@upi&pn=${encodeURIComponent(pinData?.name || "Restaurant")}&am=${order.total}&cu=INR&tn=Table${order.tableNumber || 1}_Order`;
    try {
      const qr = await QRCode.toDataURL(upiUri, { width: 220, margin: 1 });
      setUpiQrDataUrl(qr);
    } catch (err) {
      console.error(err);
    }
  };

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponModalOrder || !couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/waiter/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPLY_COUPON",
          orderId: couponModalOrder.id,
          couponCode: couponInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Failed to apply coupon");
      } else {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setCouponModalOrder(null);
        setCouponInput("");
        await loadOrders();
      }
    } catch {
      setCouponError("Something went wrong");
    } finally {
      setCouponLoading(false);
    }
  };

  // Print Table Slip
  const handlePrintSlip = (order: Order) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill Slip - Table ${order.tableNumber || "Order"}</title>
          <style>
            body { font-family: monospace; padding: 15px; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${pinData?.name || "MenuMitra Restaurant"}</div>
          <div class="center">TABLE ${order.tableNumber || "Dine-in"} BILL RECEIPT</div>
          <div class="center">${new Date(order.createdAt).toLocaleString("en-IN")}</div>
          <div class="divider"></div>
          <div>Guest: ${order.customerName || "Dine-in Guest"}</div>
          <div class="divider"></div>
          ${order.items.map((i) => `<div class="flex"><span>${i.quantity}x ${i.name}</span><span>₹${i.price * i.quantity}</span></div>`).join("")}
          <div class="divider"></div>
          <div class="flex"><span>Subtotal:</span><span>₹${order.subtotal || order.total}</span></div>
          ${order.discount ? `<div class="flex bold"><span>Discount (${order.couponCode || "Coupon"}):</span><span>-₹${order.discount}</span></div>` : ""}
          <div class="flex bold" style="font-size: 15px;"><span>TOTAL:</span><span>₹${order.total}</span></div>
          <div class="divider"></div>
          <div class="center">Payment: ${order.paymentMode} (${order.paymentStatus || "PENDING"})</div>
          <div class="center" style="margin-top: 15px;">Thank you for dining with us!</div>
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

  const filteredOrders = orders.filter((order) => {
    // Table filter
    if (selectedTable !== "ALL") {
      if (order.tableNumber?.toString() !== selectedTable) return false;
    }
    // Tab status filter
    if (activeTab === "ACTIVE") {
      return order.status !== "COMPLETED" && order.status !== "CANCELLED";
    }
    if (activeTab === "COMPLETED") {
      return order.status === "COMPLETED";
    }
    return true;
  });

  const activeOrdersCount = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-brand-500" />
          Waiter & Captain Station
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Manage floor orders, food delivery, cash/UPI payment collection & scratch card coupon discounts. Connect waitstaff mobile devices using dynamic PIN.
        </p>
      </div>

      {/* TOP SECTION: CONNECT WAITER PHONES CARD */}
      <div className="bg-gradient-to-br from-amber-500/10 via-brand-500/5 to-white rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* QR Code */}
          <div className="md:col-span-4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-amber-200/80 pb-5 md:pb-0 md:pr-6">
            <div className="p-3 bg-white rounded-2xl border-2 border-amber-300 shadow-sm inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Waiter Station QR"
                  className="w-36 h-36 mx-auto rounded-xl"
                />
              ) : (
                <div className="w-36 h-36 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-400">
                  Generating QR...
                </div>
              )}
            </div>
            <p className="text-xs font-black text-stone-900 mt-2 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-brand-600" />
              Scan with Waiter Mobile Phone
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Opens the restricted Waiter Station on mobile (no dashboard access)
            </p>
          </div>

          {/* PIN & Control Panel */}
          <div className="md:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-600" /> Dynamic Security PIN
                </span>
                <h3 className="text-sm font-bold text-stone-800 mt-1">
                  Active Shift Access PIN for Waiters
                </h3>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRegeneratePin}
                isLoading={regeneratingPin}
                className="text-xs font-bold border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-950"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Regenerate PIN
              </Button>
            </div>

            {/* Giant 4-Digit Display */}
            <div className="flex items-center gap-3">
              {(pinData?.pin || "1234").split("").map((digit, idx) => (
                <div
                  key={idx}
                  className="w-14 h-16 sm:w-16 sm:h-20 bg-stone-900 text-amber-400 text-3xl sm:text-4xl font-mono font-black rounded-2xl flex items-center justify-center shadow-md border-2 border-amber-400/40 select-all"
                >
                  {digit}
                </div>
              ))}
            </div>

            {pinMessage && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-block animate-in fade-in">
                ✓ {pinMessage}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Waiter Station Link"}</span>
              </button>

              {pinData && (
                <Link
                  href={`/waiter/${pinData.slug}`}
                  target="_blank"
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Waiter Screen in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <p className="text-[11px] text-stone-500">
              💡 <strong>Security Note:</strong> Waiters who scan this QR and enter this PIN can ONLY see active table orders, mark items as served, record cash/UPI payments, and apply coupons. They <strong>cannot</strong> see restaurant revenue, bills, or settings.
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & TABS */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
              activeTab === "ACTIVE"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Active Orders ({activeOrdersCount})
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
              activeTab === "COMPLETED"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Completed / Served
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
              activeTab === "ALL"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-1">
            Table:
          </span>
          <button
            onClick={() => setSelectedTable("ALL")}
            className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
              selectedTable === "ALL"
                ? "bg-stone-900 border-stone-900 text-white"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            All Tables
          </button>
          {uniqueTables.map((tNum) => (
            <button
              key={tNum}
              onClick={() => setSelectedTable(tNum.toString())}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                selectedTable === tNum.toString()
                  ? "bg-brand-500 border-brand-500 text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              T-{tNum}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS GRID */}
      {loadingOrders ? (
        <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-xs font-bold">Loading table orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-2">
          <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-800">No Orders in this view</h3>
          <p className="text-xs text-stone-400">
            {activeTab === "ACTIVE"
              ? "All table orders have been served and completed! Great job."
              : "No orders match your current table filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isCompleted = order.status === "COMPLETED";
            const isPaid = order.paymentStatus === "PAID";

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3.5 transition flex flex-col justify-between ${
                  isCompleted
                    ? "border-stone-200 opacity-80"
                    : "border-brand-200 ring-1 ring-brand-100"
                }`}
              >
                {/* Top Row: Table & Status */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-stone-900 text-amber-400 font-black text-sm flex items-center justify-center shadow-xs">
                        T-{order.tableNumber || "?"}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-stone-900 leading-snug">
                          {order.customerName || "Dine-in Guest"}
                        </h4>
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

                  {/* Notes if any */}
                  {order.notes && (
                    <div className="mt-2.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                      <strong>Cooking Note:</strong> {order.notes}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="mt-3 divide-y divide-stone-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800">
                          <span className="text-brand-600 mr-1.5 font-black">{item.quantity}&times;</span>
                          {item.name}
                        </span>
                        <span className="text-stone-500 font-semibold">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Row: Bill, Payment & Actions */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  {/* Bill Breakdown */}
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 space-y-1 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal:</span>
                      <span className="font-bold">{formatINR(order.subtotal || order.total)}</span>
                    </div>

                    {order.discount ? (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" /> Coupon ({order.couponCode}):
                        </span>
                        <span>-{formatINR(order.discount)}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between text-stone-900 font-black text-sm pt-1 border-t border-stone-200">
                      <span>Grand Total:</span>
                      <span className="text-brand-600">{formatINR(order.total)}</span>
                    </div>

                    {/* Payment Mode & Status */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-stone-500 font-medium">
                        Payment: <strong>{order.paymentMode}</strong>
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

                  {/* Floor Operations Action Buttons */}
                  <div className="space-y-2">
                    {/* Serve Button */}
                    {!isCompleted && (
                      <Button
                        size="sm"
                        onClick={() => handleServeOrder(order.id)}
                        isLoading={actionLoading === order.id}
                        className="w-full text-xs font-black bg-stone-900 hover:bg-black text-white shadow-sm flex items-center justify-center gap-1.5 py-2.5 rounded-xl"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Mark Order as Served ✓</span>
                      </Button>
                    )}

                    {/* Payment & Coupon Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {!isPaid ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCollectPayment(order.id, "CASH")}
                            className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <span>💵 Collect Cash</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openUpiModal(order)}
                            className="px-2.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-black transition flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>UPI QR</span>
                          </button>
                        </>
                      ) : (
                        <div className="col-span-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800">
                          ✓ Payment Cleared ({order.paymentMode})
                        </div>
                      )}
                    </div>

                    {/* Coupon & Print Buttons */}
                    <div className="flex items-center gap-2">
                      {!order.couponCode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCouponModalOrder(order);
                            setCouponInput("");
                            setCouponError("");
                          }}
                          className="flex-1 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-600" />
                          <span>Apply Coupon</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-center text-[11px] font-bold text-stone-600">
                          Coupon Applied ({order.couponCode})
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePrintSlip(order)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold transition flex items-center justify-center gap-1"
                        title="Print Bill Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Slip</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPLY COUPON MODAL */}
      {couponModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
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
                <span>Current Order Total:</span>
                <span className="font-black text-stone-900">
                  {formatINR(couponModalOrder.subtotal || couponModalOrder.total)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Scratch Card Voucher Code
              </label>
              <input
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  setCouponError("");
                }}
                placeholder="e.g. RAJW-DBE23"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[10px] text-stone-400">
                Enter the code from the customer's Google review scratch card.
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
                isLoading={couponLoading}
                disabled={!couponInput.trim() || couponLoading}
                className="flex-1 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white"
              >
                Apply Discount
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR MODAL */}
      {upiModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-brand-200 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand-600" />
                Table {upiModalOrder.tableNumber} &bull; UPI Payment
              </h3>
              <button
                type="button"
                onClick={() => setUpiModalOrder(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-stone-500 font-medium">Customer Scans to Pay:</span>
              <div className="text-2xl font-black text-stone-900">{formatINR(upiModalOrder.total)}</div>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-brand-200 shadow-sm inline-block">
              {upiQrDataUrl ? (
                <img
                  src={upiQrDataUrl}
                  alt="UPI QR"
                  className="w-44 h-44 mx-auto rounded-xl"
                />
              ) : (
                <div className="w-44 h-44 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-400">
                  Generating UPI QR...
                </div>
              )}
            </div>

            <p className="text-[11px] text-stone-500">
              Customer can scan with GPay, PhonePe, Paytm, or BHIM.
            </p>

            <Button
              onClick={() => handleCollectPayment(upiModalOrder.id, "UPI")}
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

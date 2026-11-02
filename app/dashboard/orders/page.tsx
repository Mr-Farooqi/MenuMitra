"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  Clock,
  ChefHat,
  Bell,
  CheckCircle2,
  XCircle,
  Printer,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  Filter,
  User,
  Phone,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FeatureGate } from "@/components/ui/feature-gate";
import { formatINR, formatDateTime } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
}

interface Order {
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
}

export default function KitchenKanbanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userFeatures, setUserFeatures] = useState<string[]>([]);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Selected Order for Modal / KOT
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [printingKotOrder, setPrintingKotOrder] = useState<Order | null>(null);

  const prevNewCount = useRef(0);

  // Load User & Orders
  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);

        // Check if new orders arrived to trigger chime
        const newCount = data.orders.filter((o: Order) => o.status === "NEW").length;
        if (newCount > prevNewCount.current && prevNewCount.current !== 0) {
          playOrderChime();
        }
        prevNewCount.current = newCount;
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.user?.restaurant) {
          setUserFeatures(meData.user.restaurant.features || []);
          setRestaurantName(meData.user.restaurant.name);
        }
        await loadOrders();
      } catch (err) {
        console.error(err);
      }
    }
    init();

    // Auto-refresh polling every 10s
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Chime generator (No external MP3 file needed!)
  const playOrderChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio chime unsupported", e);
    }
  };

  // Status transitions
  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
        );
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus as Order["status"] } : null));
        }
      }
    } catch (err) {
      console.error("Status update error", err);
    }
  };

  const printKot = (order: Order) => {
    setPrintingKotOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Group orders by status
  const newOrders = orders.filter((o) => o.status === "NEW");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");
  const historyOrders = orders.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm font-medium text-stone-500">Loading kitchen orders...</p>
      </div>
    );
  }

  return (
    <FeatureGate feature="orders" features={userFeatures}>
      <div className="space-y-6">
        {/* Printable Kitchen Order Ticket (KOT) Layout (Screen Hidden, Print Only) */}
        {printingKotOrder && (
          <div className="hidden print:block font-mono text-black text-xs max-w-xs mx-auto p-4 border-2 border-dashed border-black">
            <div className="text-center pb-2 border-b-2 border-black space-y-1">
              <h2 className="text-base font-black uppercase tracking-wider">
                *** KITCHEN ORDER TICKET ***
              </h2>
              <p className="font-bold text-sm">{restaurantName}</p>
              <div className="text-lg font-black bg-black text-white py-1 rounded">
                TABLE: {printingKotOrder.tableNumber || "TAKEAWAY"}
              </div>
            </div>

            <div className="py-2 border-b border-black text-[11px] flex justify-between">
              <span>TICKET: #{printingKotOrder.id.slice(-6).toUpperCase()}</span>
              <span>{formatDateTime(printingKotOrder.createdAt)}</span>
            </div>

            <div className="py-2 border-b-2 border-black space-y-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black text-[10px] uppercase font-bold">
                    <th className="pb-1 w-10">QTY</th>
                    <th className="pb-1">ITEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {printingKotOrder.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 text-base font-black align-top">{it.quantity}x</td>
                      <td className="py-2 align-top">
                        <span className="font-bold text-sm block">{it.name}</span>
                        {it.notes && (
                          <span className="text-[10px] italic block text-stone-600">
                            &gt;&gt; NOTE: {it.notes}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {printingKotOrder.notes && (
              <div className="py-2 border-b border-black text-xs">
                <span className="font-bold">INSTRUCTIONS:</span> {printingKotOrder.notes}
              </div>
            )}

            <div className="py-2 border-b border-black text-[11px] flex justify-between font-bold">
              <span>PAYMENT: {printingKotOrder.paymentMode || "COUNTER"}</span>
              {printingKotOrder.discount && printingKotOrder.discount > 0 ? (
                <span>DISCOUNT: -{formatINR(printingKotOrder.discount)}</span>
              ) : null}
            </div>

            <div className="pt-3 text-center text-[10px]">
              <p>Server Signature: ___________________</p>
            </div>
          </div>
        )}

        {/* Screen Interface */}
        <div className="print:hidden space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  Live Kitchen Kanban & Orders
                </h1>
                {newOrders.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-500 text-white text-xs font-black animate-pulse">
                    {newOrders.length} New
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Real-time table orders feed. Auto-refreshes every 10s with audio alerts.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  soundEnabled
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-stone-200 text-stone-400"
                }`}
                title={soundEnabled ? "Sound Alert On" : "Sound Alert Muted"}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span className="hidden sm:inline">Chime On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span className="hidden sm:inline">Muted</span>
                  </>
                )}
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={loadOrders}
                className="bg-white border-stone-300 font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* COLUMN 1: NEW ORDERS */}
            <div className="bg-stone-100/80 rounded-3xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                    New Orders
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                  {newOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[450px]">
                {newOrders.length === 0 ? (
                  <div className="py-16 text-center text-stone-400 text-xs font-medium">
                    No new orders waiting
                  </div>
                ) : (
                  newOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailsModalOpen(true);
                      }}
                      className="cursor-pointer bg-white rounded-2xl p-4 border-2 border-blue-200 shadow-soft hover:shadow-soft-lg transition-all space-y-3 group"
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-stone-900">
                            Table {order.tableNumber || "-"}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              order.paymentMode === "UPI"
                                ? "bg-blue-100 text-blue-700"
                                : order.paymentMode === "CASH"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {order.paymentMode === "UPI"
                              ? "UPI"
                              : order.paymentMode === "CASH"
                              ? "Cash"
                              : "Counter"}
                          </span>
                          {order.discount && order.discount > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                              🎁 -₹{order.discount}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-stone-700">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span className="font-bold">
                              {it.quantity}x {it.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="p-2 bg-amber-50 rounded-xl text-[11px] text-amber-900 font-medium">
                          Note: {order.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-xs">
                        <span className="font-black text-stone-900">{formatINR(order.total)}</span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, "PREPARING");
                          }}
                          className="text-[11px] h-7 px-3 bg-blue-600 hover:bg-blue-700 font-bold"
                        >
                          Start Cooking &rarr;
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: PREPARING */}
            <div className="bg-stone-100/80 rounded-3xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                    Preparing
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-black">
                  {preparingOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[450px]">
                {preparingOrders.length === 0 ? (
                  <div className="py-16 text-center text-stone-400 text-xs font-medium">
                    Kitchen station is clear
                  </div>
                ) : (
                  preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailsModalOpen(true);
                      }}
                      className="cursor-pointer bg-white rounded-2xl p-4 border border-amber-200 shadow-soft hover:shadow-soft-lg transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-stone-900">
                            Table {order.tableNumber || "-"}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              order.paymentMode === "UPI"
                                ? "bg-blue-100 text-blue-700"
                                : order.paymentMode === "CASH"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {order.paymentMode === "UPI"
                              ? "UPI"
                              : order.paymentMode === "CASH"
                              ? "Cash"
                              : "Counter"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printKot(order);
                          }}
                          className="text-[11px] font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1"
                          title="Print Kitchen Ticket"
                        >
                          <Printer className="w-3.5 h-3.5" /> KOT
                        </button>
                      </div>

                      <div className="space-y-1 text-xs text-stone-700">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span className="font-bold">
                              {it.quantity}x {it.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-xs">
                        <span className="font-black text-stone-900">{formatINR(order.total)}</span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, "READY");
                          }}
                          className="text-[11px] h-7 px-3 bg-amber-600 hover:bg-amber-700 font-bold"
                        >
                          Mark Ready &rarr;
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: READY TO SERVE */}
            <div className="bg-stone-100/80 rounded-3xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                    Ready to Serve
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-black">
                  {readyOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[450px]">
                {readyOrders.length === 0 ? (
                  <div className="py-16 text-center text-stone-400 text-xs font-medium">
                    No orders waiting on pass
                  </div>
                ) : (
                  readyOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailsModalOpen(true);
                      }}
                      className="cursor-pointer bg-white rounded-2xl p-4 border border-purple-200 shadow-soft hover:shadow-soft-lg transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="text-sm font-black text-stone-900">
                          Table {order.tableNumber || "-"}
                        </span>
                        <span className="text-[10px] text-purple-600 font-bold">Waiting for Server</span>
                      </div>

                      <div className="space-y-1 text-xs text-stone-700">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span className="font-bold">
                              {it.quantity}x {it.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-xs">
                        <span className="font-black text-stone-900">{formatINR(order.total)}</span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, "COMPLETED");
                          }}
                          className="text-[11px] h-7 px-3 bg-purple-600 hover:bg-purple-700 font-bold"
                        >
                          Served & Done &rarr;
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 4: RECENT ARCHIVE */}
            <div className="bg-stone-100/80 rounded-3xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                    Completed ({historyOrders.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
                {historyOrders.slice(0, 10).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailsModalOpen(true);
                    }}
                    className="cursor-pointer bg-white rounded-2xl p-3 border border-stone-200/80 text-xs hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">
                        Table {order.tableNumber || "-"}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-stone-500 text-[11px]">
                      <span>{order.items.length} items</span>
                      <span className="font-black text-stone-800">{formatINR(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <Modal
            isOpen={detailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            title={`Order Details — Table ${selectedOrder.tableNumber || "-"}`}
            maxWidth="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                <div>
                  <p className="text-stone-400">Order ID:</p>
                  <p className="font-mono font-bold text-stone-800">#{selectedOrder.id.slice(-6).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-stone-400">Guest:</p>
                  <p className="font-bold text-stone-800">{selectedOrder.customerName || "Dine-in"}</p>
                </div>
                <div>
                  <p className="text-stone-400">Payment Option:</p>
                  <p className="font-bold text-stone-800">
                    {selectedOrder.paymentMode === "UPI"
                      ? "UPI QR"
                      : selectedOrder.paymentMode === "CASH"
                      ? "Cash on Table"
                      : "Pay at Counter"}
                  </p>
                </div>
                <div>
                  <p className="text-stone-400">Time:</p>
                  <p className="font-bold text-stone-800">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {selectedOrder.phone && (
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone: {selectedOrder.phone}</span>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-bold">Cooking Notes:</span> {selectedOrder.notes}
                </div>
              )}

              <div className="border-t border-stone-100 pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Items Breakdown
                </h4>
                <div className="divide-y divide-stone-100">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-stone-900">{it.quantity}x {it.name}</span>
                        {it.notes && (
                          <span className="block text-[11px] text-stone-500 italic">
                            Special: {it.notes}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-stone-800">{formatINR(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Items Subtotal:</span>
                  <span className="font-bold">{formatINR(selectedOrder.subtotal || selectedOrder.total)}</span>
                </div>
                {selectedOrder.discount && selectedOrder.discount > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700 font-bold">
                    <span>Coupon Reward ({selectedOrder.couponCode || "Discount"}):</span>
                    <span>-{formatINR(selectedOrder.discount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm font-black text-stone-900 pt-1 border-t border-stone-100">
                  <span>Grand Total:</span>
                  <span className="text-brand-600 text-base">{formatINR(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printKot(selectedOrder)}
                  className="font-bold"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Print KOT
                </Button>

                <div className="flex items-center gap-2">
                  {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        updateStatus(selectedOrder.id, "CANCELLED");
                        setDetailsModalOpen(false);
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Cancel Order
                    </Button>
                  )}

                  {selectedOrder.status === "NEW" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateStatus(selectedOrder.id, "PREPARING");
                        setDetailsModalOpen(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Start Cooking
                    </Button>
                  )}

                  {selectedOrder.status === "PREPARING" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateStatus(selectedOrder.id, "READY");
                        setDetailsModalOpen(false);
                      }}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Mark Ready
                    </Button>
                  )}

                  {selectedOrder.status === "READY" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateStatus(selectedOrder.id, "COMPLETED");
                        setDetailsModalOpen(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Mark Served
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </FeatureGate>
  );
}

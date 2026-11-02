"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  Gift,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  Clock,
  ShieldCheck,
  ArrowLeft,
  QrCode,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/utils";

interface CouponDetails {
  code: string;
  label: string;
  type: string;
  value: number;
  status: "ACTIVE" | "REDEEMED" | "EXPIRED";
  expiresAt: string;
  redeemedAt: string | null;
  minBill: number;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
}

interface CurrentUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  restaurantId?: string;
}

export default function CustomerCouponPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [coupon, setCoupon] = useState<CouponDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Staff POS verification states
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [staffBill, setStaffBill] = useState("");
  const [staffPreview, setStaffPreview] = useState<{
    bill: number;
    discount: number;
    final: number;
  } | null>(null);
  const [redeemingStaff, setRedeemingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");

  // Check current session to see if staff/owner is logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Not logged in or anonymous customer
      }
    }
    checkAuth();
  }, []);

  // Load Coupon Details & Generate QR Code
  useEffect(() => {
    async function loadCoupon() {
      try {
        const res = await fetch(`/api/public/coupon/${code}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Coupon not found");
        }
        setCoupon(data.coupon);

        // Generate QR code encoding direct link for staff to scan & confirm
        const qrTarget =
          typeof window !== "undefined"
            ? `${window.location.origin}/coupon/${data.coupon.code}`
            : `https://menumitra.com/coupon/${data.coupon.code}`;

        try {
          const qr = await QRCode.toDataURL(qrTarget, {
            width: 260,
            margin: 1,
            color: {
              dark: "#1c1917",
              light: "#ffffff",
            },
          });
          setQrDataUrl(qr);
        } catch (qrErr) {
          console.error("Failed to generate QR data URL", qrErr);
        }
      } catch (err: unknown) {
        setError((err as Error).message || "Could not load coupon details");
      } finally {
        setLoading(false);
      }
    }
    if (code) loadCoupon();
  }, [code]);

  // Live bill & discount calculation for staff
  useEffect(() => {
    if (!coupon) return;
    const billVal = parseFloat(staffBill);
    if (!isNaN(billVal) && billVal > 0) {
      let discount = 0;
      if (coupon.type === "PERCENT") {
        discount = Math.round(((billVal * coupon.value) / 100) * 100) / 100;
      } else if (coupon.type === "FLAT") {
        discount = Math.min(billVal, coupon.value);
      } else if (coupon.type === "FREE_ITEM") {
        discount = Math.min(billVal, coupon.value);
      }
      const final = Math.max(0, billVal - discount);
      setStaffPreview({ bill: billVal, discount, final });
    } else {
      setStaffPreview(null);
    }
  }, [staffBill, coupon]);

  // Copy code helper
  const copyCode = () => {
    if (!coupon) return;
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Staff executes coupon redemption directly from scan
  const handleStaffRedeem = async () => {
    if (!staffPreview || !coupon) return;
    if (coupon.minBill > 0 && staffPreview.bill < coupon.minBill) {
      setStaffError(`Minimum bill of ₹${coupon.minBill} is required for this reward.`);
      return;
    }

    setRedeemingStaff(true);
    setStaffError("");
    setStaffSuccess("");

    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon.code,
          billAmount: staffPreview.bill,
          action: "REDEEM",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || "Failed to redeem reward");
      } else {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
        setStaffSuccess(
          `🎉 Coupon successfully REDEEMED! Applied discount: ₹${data.discountApplied}. Final Bill: ₹${data.finalBill}.`
        );
        // Update local coupon status
        setCoupon((prev) =>
          prev
            ? {
                ...prev,
                status: "REDEEMED",
                redeemedAt: new Date().toISOString(),
              }
            : null
        );
      }
    } catch {
      setStaffError("Redemption failed unexpectedly. Please try again.");
    } finally {
      setRedeemingStaff(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-stone-500 gap-2">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading coupon pass...</p>
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-stone-900">Coupon Not Found</h2>
        <p className="text-xs text-stone-500">{error || "Invalid coupon code."}</p>
        <Link href="/">
          <Button size="sm">Go to Home</Button>
        </Link>
      </div>
    );
  }

  const isRedeemed = coupon.status === "REDEEMED";
  const isExpired = coupon.status === "EXPIRED";
  const isActive = coupon.status === "ACTIVE";

  // Check if current user is an authorized staff/owner of this restaurant
  const isAuthorizedStaff =
    currentUser &&
    (currentUser.role === "SUPER_ADMIN" ||
      currentUser.restaurantId === coupon.restaurant.id);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Pass Card Container */}
        <div className="bg-white rounded-3xl shadow-soft-lg border-2 border-amber-200 overflow-hidden">
          {/* Card Header */}
          <div className="p-6 bg-gradient-to-br from-brand-500 to-amber-500 text-white text-center space-y-2 relative">
            <div className="flex items-center justify-center gap-2">
              {coupon.restaurant.logo ? (
                <img
                  src={coupon.restaurant.logo}
                  alt={coupon.restaurant.name}
                  className="w-8 h-8 rounded-lg object-cover border border-white/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
              )}
              <h1 className="text-base font-black tracking-tight">{coupon.restaurant.name}</h1>
            </div>

            <div className="py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 block">
                REWARD RECOGNISED
              </span>
              <h2 className="text-2xl font-black text-white mt-0.5 leading-tight">
                {coupon.label}
              </h2>
            </div>

            {/* Status Pill */}
            <div>
              <span
                className={`inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                  isActive
                    ? "bg-white text-emerald-800"
                    : isRedeemed
                    ? "bg-stone-900 text-stone-300"
                    : "bg-red-800 text-white"
                }`}
              >
                {isActive ? "● Active Pass" : isRedeemed ? "✓ Redeemed" : "✕ Expired"}
              </span>
            </div>
          </div>

          {/* Jagged Coupon Edge Divider */}
          <div className="relative h-4 bg-white flex items-center justify-between px-[-8px]">
            <div className="w-4 h-8 bg-[#faf8f5] rounded-r-full -ml-2" />
            <div className="border-t-2 border-dashed border-stone-200 w-full mx-2" />
            <div className="w-4 h-8 bg-[#faf8f5] rounded-l-full -mr-2" />
          </div>

          {/* Card Body */}
          <div className="p-6 text-center space-y-5">
            {/* Coupon Code Block */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Coupon Voucher Code
              </span>
              <div className="inline-flex items-center gap-2 p-2 px-4 rounded-2xl bg-stone-50 border-2 border-stone-200 font-mono text-xl font-black text-brand-700 tracking-wider">
                <span>{coupon.code}</span>
                <button
                  onClick={copyCode}
                  className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  title="Copy Code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* QR Code Card for Staff to Scan */}
            <div className="space-y-2">
              <div className="inline-block p-3 bg-white rounded-3xl border-2 border-stone-200/90 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Scan QR Code - ${coupon.code}`}
                    className="w-44 h-44 mx-auto rounded-xl"
                  />
                ) : (
                  <div className="w-44 h-44 mx-auto rounded-xl bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                    Generating QR...
                  </div>
                )}
              </div>
              <p className="text-xs text-stone-500 font-semibold flex items-center justify-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-brand-600" />
                <span>Staff can scan this code to apply your discount</span>
              </p>
            </div>

            {/* Expiry & Rules Info */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-stone-700 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Valid Until:</span>
                <span className="font-bold text-stone-900">{formatDate(coupon.expiresAt)}</span>
              </div>

              {coupon.minBill > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">Minimum Bill:</span>
                  <span className="font-bold text-stone-900">₹{coupon.minBill}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Usage:</span>
                <span className="font-bold text-stone-900">
                  {isRedeemed ? "Already Redeemed" : "One-time single redemption"}
                </span>
              </div>

              {isRedeemed && coupon.redeemedAt && (
                <div className="flex items-center justify-between text-emerald-700 font-bold pt-1 border-t border-amber-200/60">
                  <span>Redeemed On:</span>
                  <span>{formatDate(coupon.redeemedAt)}</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified MenuMitra Google Review Pass</span>
            </div>
          </div>
        </div>

        {/* STAFF CONFIRMATION SECTION */}
        {isAuthorizedStaff ? (
          <div className="p-5 bg-gradient-to-br from-amber-50/90 to-orange-50/90 rounded-3xl border-2 border-amber-300 shadow-soft-lg space-y-3.5 text-left">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  👨‍🍳
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                    Staff POS Confirmation
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium">
                    {coupon.restaurant.name} &bull; {currentUser.name || currentUser.email}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Staff Verified
              </span>
            </div>

            {isActive ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Customer Food Bill Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={staffBill}
                      onChange={(e) => setStaffBill(e.target.value)}
                      placeholder={`e.g. 500 (Minimum ₹${coupon.minBill || 1})`}
                      className="w-full pl-8 pr-4 py-2.5 text-sm font-bold rounded-xl border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Calculation preview */}
                {staffPreview && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Original Food Bill:</span>
                      <span className="font-bold text-stone-900">₹{staffPreview.bill}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Reward Discount ({coupon.label}):</span>
                      <span>-₹{staffPreview.discount}</span>
                    </div>
                    <div className="flex justify-between text-stone-900 font-black text-sm pt-1 border-t border-stone-100">
                      <span>Final Bill to Collect:</span>
                      <span className="text-brand-600 text-base">₹{staffPreview.final}</span>
                    </div>
                  </div>
                )}

                {staffError && (
                  <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {staffError}
                  </p>
                )}

                {staffSuccess && (
                  <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{staffSuccess}</span>
                  </div>
                )}

                <Button
                  onClick={handleStaffRedeem}
                  isLoading={redeemingStaff}
                  disabled={!staffPreview || redeemingStaff}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Confirm & Apply Discount (Save ₹{staffPreview?.discount || 0}) &rarr;
                  </span>
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-stone-100 rounded-xl text-xs text-stone-600 font-semibold text-center">
                This coupon is already {isRedeemed ? "REDEEMED" : "EXPIRED"} and cannot be processed again.
              </div>
            )}
          </div>
        ) : (
          !currentUser &&
          isActive && (
            <div className="p-4 bg-stone-100 rounded-3xl border border-stone-200 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-800">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span>Restaurant Staff / Cashier</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Scan this QR code with your phone camera to confirm and apply the customer's discount.
              </p>
              <div className="pt-1">
                <Link
                  href={`/login?redirect=/coupon/${coupon.code}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Staff Login to Confirm Discount &rarr;
                </Link>
              </div>
            </div>
          )
        )}

        {/* Back Links */}
        <div className="flex items-center justify-center gap-4 text-xs font-bold text-stone-500 pt-2">
          <Link
            href={`/m/${coupon.restaurant.slug}`}
            className="hover:text-stone-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Restaurant Menu
          </Link>
          {isAuthorizedStaff && (
            <>
              <span>&bull;</span>
              <Link
                href="/dashboard/reviews"
                className="hover:text-stone-900 inline-flex items-center gap-1 text-brand-600"
              >
                Dashboard POS &rarr;
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

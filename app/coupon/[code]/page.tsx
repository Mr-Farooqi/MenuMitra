"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

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
    name: string;
    slug: string;
    logo: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
}

export default function CustomerCouponPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [coupon, setCoupon] = useState<CouponDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function loadCoupon() {
      try {
        const res = await fetch(`/api/public/coupon/${code}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Coupon not found");
        }
        setCoupon(data.coupon);

        // Generate QR code for staff to scan
        if (canvasRef.current) {
          QRCode.toCanvas(canvasRef.current, data.coupon.code, {
            width: 180,
            margin: 2,
            color: {
              dark: "#1c1917",
              light: "#ffffff",
            },
          });
        }
      } catch (err: unknown) {
        setError((err as Error).message || "Could not load coupon details");
      } finally {
        setLoading(false);
      }
    }
    if (code) loadCoupon();
  }, [code]);

  const copyCode = () => {
    if (!coupon) return;
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-stone-400">
        Loading coupon pass...
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

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 py-10 px-4">
      <div className="max-w-md mx-auto space-y-6">
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
                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isActive
                    ? "bg-white text-emerald-800 shadow-sm"
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

            {/* QR Code Canvas for Cashier to Scan */}
            <div className="space-y-1">
              <div className="flex justify-center p-2 bg-stone-50 rounded-2xl border border-stone-100 max-w-[200px] mx-auto">
                <canvas ref={canvasRef} className="rounded-xl" />
              </div>
              <p className="text-[10px] text-stone-400 font-semibold">
                Staff can scan this code to apply your discount
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
                <span className="font-bold text-stone-900">One-time single redemption</span>
              </div>
            </div>

            <div className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified MenuMitra Google Review Pass</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href={`/m/${coupon.restaurant.slug}`}
            className="text-xs font-bold text-stone-600 hover:text-stone-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Restaurant Menu
          </Link>
        </div>
      </div>
    </div>
  );
}

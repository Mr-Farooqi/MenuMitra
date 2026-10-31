"use client";

import React, { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Sparkles, Check, ShieldCheck, Zap } from "lucide-react";
import { FeatureKey, FEATURE_INFO } from "@/lib/feature-gate";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: FeatureKey;
  onSuccess?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  featureKey,
  onSuccess,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feature = featureKey ? FEATURE_INFO[featureKey] : null;
  const targetPlan = feature ? feature.requiredPlan : "PREMIUM";

  const planDetails = {
    STANDARD: {
      name: "Standard Plan",
      slug: "standard",
      price: "₹1,499",
      period: "/month",
      highlights: [
        "Digital Menu & Custom QR Studio",
        "Branded Mini-Website with 3 Templates",
        "Online Table Ordering & Kitchen Kanban",
        "Printable Kitchen Order Tickets (KOT)",
      ],
    },
    PREMIUM: {
      name: "Premium Growth Suite",
      slug: "premium",
      price: "₹2,999",
      period: "/month",
      highlights: [
        "Everything in Standard",
        "Google Review Scratch & Win Reward System",
        "Weighted Discounts & Free Items Generator",
        "Live POS Staff Coupon Validator & Bill Ledger",
        "Unlimited Scans, Tables & Orders",
      ],
    },
  }[targetPlan as "STANDARD" | "PREMIUM"] || {
    name: "Premium Growth Suite",
    slug: "premium",
    price: "₹2,999",
    period: "/month",
    highlights: ["Unlock all features with full access"],
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanSlug: planDetails.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upgrade plan");
      }
      if (onSuccess) onSuccess();
      onClose();
      // Reload page to refresh all entitlements and sidebar state
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong during payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unlock Premium Features"
      description={
        feature
          ? `The feature "${feature.name}" requires an active ${targetPlan} plan.`
          : "Elevate your restaurant with higher conversion and customer retention."
      }
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Plan Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 border-2 border-brand-200 relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Zap className="w-3 h-3" /> Recommended
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-900">{planDetails.price}</span>
            <span className="text-sm font-medium text-stone-500">{planDetails.period}</span>
          </div>
          <h4 className="text-lg font-bold text-brand-700 mt-1">{planDetails.name}</h4>

          <div className="mt-4 pt-4 border-t border-brand-200/60 space-y-2.5">
            {planDetails.highlights.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-stone-700 font-medium">
                <div className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleUpgrade}
            isLoading={loading}
            className="w-full py-3 text-base font-bold shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-amber-200" />
            Upgrade Instantly to {targetPlan}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Simulated Instant Payment (Safe Test Mode)</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

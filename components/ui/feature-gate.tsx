"use client";

import React, { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { FeatureKey, FEATURE_INFO } from "@/lib/feature-gate";
import { Button } from "./button";
import { UpgradeModal } from "./upgrade-modal";

interface FeatureGateProps {
  feature: FeatureKey;
  features?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  feature,
  features,
  children,
  fallback,
}: FeatureGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // If features is undefined, we assume it's loaded by parent or default to []
  const isUnlocked = features ? features.includes(feature) : true;

  if (isUnlocked) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const info = FEATURE_INFO[feature];

  return (
    <div className="relative rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/70 p-12 text-center overflow-hidden">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-stone-900">{info.name} is Locked</h3>
          <p className="text-sm text-stone-500 mt-1">{info.description}</p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="shadow-md shadow-brand-500/20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to {info.requiredPlan} Plan
          </Button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureKey={feature}
      />
    </div>
  );
}

"use client";

import React from "react";
import { FeatureKey, FEATURE_INFO } from "@/lib/feature-gate";
import { UpiPaymentModal } from "@/components/billing/upi-payment-modal";

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
  const feature = featureKey ? FEATURE_INFO[featureKey] : null;
  const targetPlan = feature ? feature.requiredPlan : "PREMIUM";

  const plan = {
    STANDARD: {
      id: "standard",
      name: "Standard",
      slug: "standard",
      price: 1499,
      description: "Digital Menu + Branded Mini-Website + Online Table Ordering & Kitchen Kanban",
    },
    PREMIUM: {
      id: "premium",
      name: "Premium Growth Suite",
      slug: "premium",
      price: 2999,
      description: "All-in-one Growth Suite with Google Review Scratch & Win rewards",
    },
  }[targetPlan as "STANDARD" | "PREMIUM"] || {
    id: "premium",
    name: "Premium Growth Suite",
    slug: "premium",
    price: 2999,
    description: "Unlock all features with full access",
  };

  return (
    <UpiPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      plan={plan}
      onPaymentSubmitted={onSuccess}
    />
  );
}

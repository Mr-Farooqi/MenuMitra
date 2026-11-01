"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: string;
    name: string;
    slug: string;
    price: number;
    description?: string;
  } | null;
  onPaymentSubmitted?: () => void;
}

export function UpiPaymentModal({
  isOpen,
  onClose,
  plan,
  onPaymentSubmitted,
}: UpiPaymentModalProps) {
  const [businessUpiId, setBusinessUpiId] = useState("menumitra@icici");
  const [businessUpiName, setBusinessUpiName] = useState("MenuMitra SaaS");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Form state
  const [utrReference, setUtrReference] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payerName, setPayerName] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Fetch UPI settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/public/platform-settings");
        if (res.ok) {
          const data = await res.json();
          if (data.businessUpiId) setBusinessUpiId(data.businessUpiId);
          if (data.businessUpiName) setBusinessUpiName(data.businessUpiName);
        }
      } catch (err) {
        console.error("Failed to load UPI settings:", err);
      }
    }
    if (isOpen) {
      fetchSettings();
      setError(null);
      setSubmittedSuccess(false);
      setUtrReference("");
    }
  }, [isOpen]);

  const basePrice = plan?.price || 0;
  const finalAmount = Math.max(0, basePrice - discountAmount);

  // Generate QR Code whenever UPI ID or finalAmount changes
  useEffect(() => {
    if (!plan || !businessUpiId) return;

    const upiUri = `upi://pay?pa=${encodeURIComponent(
      businessUpiId
    )}&pn=${encodeURIComponent(businessUpiName)}&am=${finalAmount.toFixed(
      2
    )}&cu=INR&tn=MenuMitra_${plan.slug.toUpperCase()}`;

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 1,
      color: {
        dark: "#1c1917",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [businessUpiId, businessUpiName, finalAmount, plan]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(businessUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !plan) return;
    setValidatingPromo(true);
    setPromoMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/billing/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), planSlug: plan.slug }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo(data.code);
        setDiscountAmount(data.discountSaved || 0);
        setPromoMessage(data.message || `Code ${data.code} applied! You save ₹${data.discountSaved}.`);
      } else {
        setError(data.error || "Invalid promo code");
      }
    } catch {
      setError("Error validating promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    const cleanUtr = utrReference.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setError("Please enter a valid 12-digit UPI Reference / UTR Number");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPlanSlug: plan.slug,
          utrReference: cleanUtr,
          promoCode: appliedPromo || undefined,
          payerPhone: payerPhone.trim() || undefined,
          payerName: payerName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment");
      }

      setSubmittedSuccess(true);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });

      if (onPaymentSubmitted) {
        onPaymentSubmitted();
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong submitting payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={submittedSuccess ? "Payment Details Submitted" : `Upgrade to ${plan.name} Plan`}
      description={
        submittedSuccess
          ? "Our admin team is verifying your payment. Your features will activate shortly."
          : "Scan the UPI QR code using any UPI app and enter the 12-digit UTR reference number."
      }
      maxWidth="lg"
    >
      {submittedSuccess ? (
        <div className="py-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-stone-900">
              Payment Request Received!
            </h3>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              We received your transaction reference{" "}
              <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                {utrReference}
              </span>{" "}
              for the <span className="font-bold text-brand-600">{plan.name}</span> plan (₹{finalAmount}).
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Our team verifies transactions within 15–30 minutes. Once approved, all features will unlock automatically.
            </p>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Button
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitPayment} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Selected Plan
              </span>
              <h4 className="text-base font-bold text-stone-900">
                {plan.name} Plan
              </h4>
              <p className="text-xs text-stone-500">Billed monthly (GST included)</p>
            </div>
            <div className="text-right">
              {discountAmount > 0 ? (
                <div>
                  <span className="text-sm text-stone-400 line-through mr-2">
                    ₹{basePrice}
                  </span>
                  <span className="text-2xl font-black text-brand-600">
                    ₹{finalAmount}
                  </span>
                  <span className="text-xs text-emerald-600 block font-semibold">
                    Saved ₹{discountAmount}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-black text-brand-600">
                  ₹{finalAmount}
                </span>
              )}
            </div>
          </div>

          {/* Promo Code Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Have a promo code? (e.g. SAVE20)"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              disabled={validatingPromo || !!appliedPromo}
              className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase font-mono"
            />
            <Button
              type="button"
              variant="outline"
              disabled={validatingPromo || !promoInput.trim() || !!appliedPromo}
              onClick={handleApplyPromo}
              className="shrink-0 text-xs"
            >
              {validatingPromo ? "Checking..." : appliedPromo ? "Applied ✓" : "Apply"}
            </Button>
          </div>
          {promoMessage && (
            <p className="text-xs text-emerald-600 font-medium">{promoMessage}</p>
          )}

          {/* Payment Section (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2 border-t border-stone-200">
            {/* Dynamic UPI QR Code */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border-2 border-dashed border-stone-200 shadow-sm">
              <span className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand-500" /> Scan to Pay with Any UPI App
              </span>

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="UPI QR Code"
                  className="w-48 h-48 rounded-xl shadow-sm border border-stone-100"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl bg-stone-100 animate-pulse flex items-center justify-center text-stone-400 text-xs">
                  Generating QR...
                </div>
              )}

              {/* UPI ID with Copy Button */}
              <div className="mt-3 w-full">
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                  <span className="font-mono text-stone-700 truncate">{businessUpiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-brand-600 hover:text-brand-700 font-bold shrink-0 flex items-center gap-1"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Supported apps */}
              <div className="flex items-center gap-2 mt-2.5 text-[11px] text-stone-500 font-medium">
                <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
              </div>
            </div>

            {/* Step-by-step & UTR Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Step-by-Step Instructions:
                </h5>
                <ol className="text-xs text-stone-600 space-y-1.5 list-decimal list-inside">
                  <li>Open Google Pay, PhonePe, Paytm, or BHIM.</li>
                  <li>Scan the QR code and pay exactly <strong>₹{finalAmount}</strong>.</li>
                  <li>Find the <strong>12-digit UPI Ref / UTR No.</strong> in payment receipt.</li>
                  <li>Enter the UTR number below and submit.</li>
                </ol>
              </div>

              {/* UTR Input Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                  <span>12-Digit UPI Reference / UTR Number <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 430123456789"
                  value={utrReference}
                  onChange={(e) => setUtrReference(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                  maxLength={22}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                />
                <span className="text-[11px] text-stone-500 block">
                  Check your bank SMS or UPI transaction details for the 12-digit number.
                </span>
              </div>

              {/* Payer Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  Payment Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="Mobile number used to pay"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !utrReference.trim()}
              className="bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20"
            >
              {submitting ? "Submitting..." : `Submit Payment (₹${finalAmount})`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

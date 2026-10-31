"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Download,
  AlertCircle,
  Clock,
} from "lucide-react";
import confetti from "canvas-confetti";

interface PackageItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  features: string;
}

interface InvoiceItem {
  id: string;
  amount: number;
  status: string;
  paymentId: string;
  createdAt: string;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [currentPackage, setCurrentPackage] = useState<PackageItem | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscountMsg, setPromoDiscountMsg] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setValidatingPromo(true);
    setPromoDiscountMsg("");

    try {
      const res = await fetch("/api/billing/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), planSlug: "premium" }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo(data.code);
        setPromoDiscountMsg(data.message || `Code ${data.code} applied! You save ₹${data.discountSaved}.`);
      } else {
        alert(data.error || "Invalid promo code");
      }
    } catch {
      alert("Error applying promo code");
    } finally {
      setValidatingPromo(false);
    }
  }

  async function fetchBillingData() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/invoices");
      if (res.ok) {
        const data = await res.json();
        setCurrentPackage(data.currentPackage);
        setPackages(data.packages || []);
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to load billing:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchPlan(pkg: PackageItem) {
    if (pkg.id === currentPackage?.id) return;
    if (!confirm(`Are you sure you want to switch to the ${pkg.name} plan (₹${pkg.price}/month)?`)) return;

    setActionLoading(pkg.id);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPlanSlug: pkg.slug,
          promoCode: appliedPromo || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
        setMessage({ type: "success", text: `Successfully switched to ${pkg.name} plan!` });
        await fetchBillingData();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to switch plan" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error processing plan switch" });
    } finally {
      setActionLoading(null);
    }
  }

  const parseFeatures = (featuresJson: string): string[] => {
    try {
      return typeof featuresJson === "string" ? JSON.parse(featuresJson) : featuresJson;
    } catch {
      return [];
    }
  };

  const featureLabels: Record<string, string> = {
    menu: "Digital Menu with Categories & Items",
    qr: "Table & Menu QR Codes Generator",
    website: "Custom Branded Restaurant Website Builder",
    orders: "Online Table Ordering & Kitchen Kanban KOT",
    reviewReward: "Google Reviews Gamified Scratch Cards & Coupons",
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl shadow-md">
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Subscription & Billing
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your MenuMitra plan, upgrade features, and view invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-800">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span>Active Subscription</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Plan Overview Card */}
      {currentPackage && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                Current Plan
              </span>
              <h2 className="text-3xl font-black mt-2">{currentPackage.name} Plan</h2>
              <p className="text-white/80 text-sm mt-1 max-w-md">
                Your restaurant has full access to all features included under the {currentPackage.name} package.
              </p>
            </div>

            <div className="text-left md:text-right bg-black/15 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">Pricing</div>
              <div className="text-3xl font-black mt-0.5">
                ₹{currentPackage.price}
                <span className="text-sm font-normal text-white/80"> / month</span>
              </div>
              <div className="text-xs text-white/80 mt-1 flex items-center md:justify-end gap-1">
                <Clock className="w-3.5 h-3.5" /> Renews Monthly
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promo Code Input Card */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" /> Have a Platform Promo Code / Coupon?
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter your special discount voucher before upgrading your subscription plan.
          </p>
          {promoDiscountMsg && (
            <p className="text-xs font-bold text-green-700 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {promoDiscountMsg}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="e.g. DIWALI50"
            className="w-full sm:w-40 px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            disabled={validatingPromo || !promoInput.trim()}
            onClick={handleApplyPromo}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 shrink-0"
          >
            {validatingPromo ? "Verifying..." : "Apply"}
          </button>
        </div>
      </div>

      {/* Available Plans Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Change Subscription Plan</h2>
          <p className="text-xs text-gray-500">
            Switch plans anytime. Upgrades take effect instantly with immediate access to unlocked features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const isCurrent = pkg.id === currentPackage?.id;
            const features = parseFeatures(pkg.features);
            const isPopular = pkg.slug === "premium";

            return (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "border-amber-500 shadow-md ring-2 ring-amber-500/20"
                    : isPopular
                    ? "border-orange-300 shadow-sm hover:border-orange-400"
                    : "border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
                    Most Popular
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pkg.slug === "basic" && "Essential digital QR menu"}
                        {pkg.slug === "standard" && "Menu + Online Orders + Website"}
                        {pkg.slug === "premium" && "All-in-one Growth & Google Review System"}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pb-4 border-b border-gray-100">
                    <span className="text-3xl font-extrabold text-gray-900">₹{pkg.price}</span>
                    <span className="text-xs text-gray-500"> / month</span>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {["menu", "qr", "website", "orders", "reviewReward"].map((feat) => {
                      const hasFeature = features.includes(feat);
                      return (
                        <li key={feat} className="flex items-start gap-2.5 text-xs">
                          {hasFeature ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-200 shrink-0 mt-0.5" />
                          )}
                          <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400 line-through"}>
                            {featureLabels[feat]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="p-6 pt-0 mt-auto">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 cursor-default flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Active Plan
                    </button>
                  ) : (
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleSwitchPlan(pkg)}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {actionLoading === pkg.id ? (
                        "Processing..."
                      ) : (
                        <>
                          <span>Switch to {pkg.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-gray-900">Billing & Invoice History</h3>
          </div>
          <span className="text-xs text-gray-400">{invoices.length} invoices recorded</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No invoices generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50/50 text-xs text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Invoice ID</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Payment ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-amber-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-gray-900">
                      INV-{inv.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-xs">
                      ₹{inv.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-gray-500">
                      {inv.paymentId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" /> {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => alert(`Invoice INV-${inv.id.substring(0, 8).toUpperCase()} paid via ${inv.paymentId}. Amount: ₹${inv.amount}.`)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

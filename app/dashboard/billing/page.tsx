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
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { UpiPaymentModal } from "@/components/billing/upi-payment-modal";

interface PackageItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  features: string;
  description?: string;
}

interface InvoiceItem {
  id: string;
  amount: number;
  status: string;
  paymentId: string;
  createdAt: string;
}

interface PendingPaymentItem {
  id: string;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  promoCode?: string;
  utrReference?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string;
  createdAt: string;
  package: {
    name: string;
    slug: string;
  };
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<{ id: string; name: string; status: string } | null>(null);
  const [currentPackage, setCurrentPackage] = useState<PackageItem | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentItem[]>([]);

  // UPI Checkout Modal state
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<PackageItem | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/invoices");
      if (res.ok) {
        const data = await res.json();
        setRestaurant(data.restaurant);
        setCurrentPackage(data.currentPackage);
        setPackages(data.packages || []);
        setInvoices(data.invoices || []);
        setPendingPayments(data.pendingPayments || []);
      }
    } catch (err) {
      console.error("Failed to load billing:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenUpgrade = (pkg: PackageItem) => {
    setSelectedPlanForUpgrade(pkg);
    setShowUpiModal(true);
  };

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

  const isPendingVerification = restaurant?.status === "PENDING_PAYMENT";

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
            Manage your MenuMitra plan, scan UPI QR to upgrade, and track payments.
          </p>
        </div>

        {isPendingVerification ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-800 animate-pulse">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Payment Verification Pending</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-800">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Active Subscription</span>
          </div>
        )}
      </div>

      {/* Pending Payment Requests Card (If any) */}
      {pendingPayments.length > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Recent UPI Payment Submissions ({pendingPayments.length})
                </h3>
                <p className="text-xs text-amber-800/80">
                  Super Admin verifies payments with your bank reference UTR number.
                </p>
              </div>
            </div>
            <button
              onClick={fetchBillingData}
              className="text-xs font-bold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
            >
              Refresh Status
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-bold">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">UTR Reference</th>
                  <th className="px-5 py-3">Date Submitted</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/20">
                    <td className="px-5 py-3.5 font-bold text-stone-900">
                      {p.package.name} Plan
                      {p.promoCode && (
                        <span className="ml-2 text-[10px] font-mono font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                          {p.promoCode}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-black text-stone-900">
                      ₹{p.amount}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-700">
                      {p.utrReference || "N/A"}
                    </td>
                    <td className="px-5 py-3.5 text-stone-500">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
                        </span>
                      )}
                      {p.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Active
                        </span>
                      )}
                      {p.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200" title={p.rejectReason || undefined}>
                          <AlertCircle className="w-3 h-3 text-red-600" /> Rejected {p.rejectReason ? `(${p.rejectReason})` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {isPendingVerification
                  ? "Your payment is currently being verified by our team. Features will activate automatically once verified."
                  : `Your restaurant has full access to all features included under the ${currentPackage.name} package.`}
              </p>
            </div>

            <div className="text-left md:text-right bg-black/15 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">Pricing</div>
              <div className="text-3xl font-black mt-0.5">
                ₹{currentPackage.price}
                <span className="text-sm font-normal text-white/80"> / month</span>
              </div>
              <div className="text-xs text-white/80 mt-1 flex items-center md:justify-end gap-1">
                <Clock className="w-3.5 h-3.5" /> Renews Monthly via UPI
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Change / Upgrade Subscription Plan</h2>
          <p className="text-xs text-gray-500">
            Scan UPI QR with Google Pay, PhonePe, or Paytm and submit your 12-digit UTR to upgrade your plan.
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
                      const hasFeat = features.includes(feat);
                      return (
                        <li key={feat} className="flex items-start gap-2.5 text-xs">
                          {hasFeat ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-200 shrink-0 mt-0.5" />
                          )}
                          <span className={hasFeat ? "text-gray-700 font-medium" : "text-gray-400 line-through"}>
                            {featureLabels[feat]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="p-6 pt-0 mt-auto">
                  {isCurrent && !isPendingVerification ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 cursor-default flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenUpgrade(pkg)}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 shadow-amber-500/20"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{isCurrent ? "Complete UPI Payment" : `Pay & Switch to ${pkg.name}`}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
            <h3 className="text-base font-bold text-gray-900">Official GST Invoices</h3>
          </div>
          <span className="text-xs text-gray-400">{invoices.length} invoices recorded</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No official invoices generated yet. Invoices appear here once subscription payments are approved.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50/50 text-xs text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Invoice ID</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Payment Reference</th>
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
                        onClick={() =>
                          alert(
                            `MenuMitra Tax Invoice\n\nInvoice ID: INV-${inv.id.substring(0, 8).toUpperCase()}\nAmount: ₹${inv.amount}\nReference: ${inv.paymentId}\nStatus: ${inv.status}\nDate: ${new Date(inv.createdAt).toLocaleDateString("en-IN")}`
                          )
                        }
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

      {/* UPI Scan & Pay Modal */}
      <UpiPaymentModal
        isOpen={showUpiModal}
        onClose={() => setShowUpiModal(false)}
        plan={selectedPlanForUpgrade}
        onPaymentSubmitted={() => {
          fetchBillingData();
        }}
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { FeatureGate } from "@/components/ui/feature-gate";
import {
  Sparkles,
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Receipt,
  Eye,
  Settings,
  Ticket,
  Percent,
  Coins,
  Smile,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertTriangle,
} from "lucide-react";
import confetti from "canvas-confetti";

interface ReviewSettings {
  id: string;
  popupEnabled: boolean;
  popupDelaySeconds: number;
  autoApprove: boolean;
  cooldownDays: number;
  minBill: number;
  googleReviewLink?: string;
}

interface RewardRule {
  id: string;
  label: string;
  type: "PERCENT" | "FLAT" | "FREE_ITEM" | "NONE";
  value: number;
  weight: number;
  expiryDays: number;
  usageLimit: number;
  active: boolean;
}

interface ReviewSubmission {
  id: string;
  name: string;
  phone: string;
  screenshotUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
  createdAt: string;
  coupon?: {
    code: string;
    expiresAt: string;
    rewardRule: {
      label: string;
      type: string;
      value: number;
    };
  } | null;
}

interface CouponItem {
  id: string;
  code: string;
  phone: string;
  status: "ACTIVE" | "REDEEMED" | "EXPIRED";
  expiresAt: string;
  redeemedAt?: string;
  billAmount?: number;
  discountApplied?: number;
  createdAt: string;
  rewardRule: {
    label: string;
    type: string;
    value: number;
  };
  submission?: {
    name: string;
    phone: string;
  } | null;
}

export default function ReviewsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"submissions" | "redeem" | "rules" | "coupons" | "settings">("submissions");
  const [loading, setLoading] = useState(true);
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [userFeatures, setUserFeatures] = useState<string[]>([]);

  // Submissions State
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [subFilter, setSubFilter] = useState<string>("ALL");
  const [selectedSubmission, setSelectedSubmission] = useState<ReviewSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // POS Redeem State
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBill, setRedeemBill] = useState("");
  const [redeemPreview, setRedeemPreview] = useState<{
    originalBill: number;
    discountApplied: number;
    finalBill: number;
    coupon: {
      code: string;
      label: string;
      type: string;
      value: number;
      phone: string;
    };
  } | null>(null);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");
  const [posLoading, setPosLoading] = useState(false);

  // Reward Rules State
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [editingRule, setEditingRule] = useState<Partial<RewardRule> | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponFilter, setCouponFilter] = useState("ALL");

  // Settings State
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    popupEnabled: true,
    popupDelaySeconds: 6,
    autoApprove: false,
    cooldownDays: 30,
    minBill: 0,
    googleReviewLink: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      // 1. Restaurant profile for slug & package features
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        const restaurant = meData.user?.restaurant || meData.restaurant;
        if (restaurant) {
          if (restaurant.slug) {
            setRestaurantSlug(restaurant.slug);
          }
          if (restaurant.features && Array.isArray(restaurant.features)) {
            setUserFeatures(restaurant.features);
          } else if (restaurant.package?.features) {
            try {
              const parsed = typeof restaurant.package.features === "string"
                ? JSON.parse(restaurant.package.features)
                : restaurant.package.features;
              setUserFeatures(parsed || []);
            } catch {
              setUserFeatures([]);
            }
          }
        }
      }

      // 2. Submissions
      const subRes = await fetch("/api/reviews/submissions");
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData.submissions || []);
      }

      // 3. Rules
      const rulesRes = await fetch("/api/reviews/rules");
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
      }

      // 4. Coupons
      const couponsRes = await fetch("/api/coupons");
      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(couponsData.coupons || []);
      }

      // 5. Settings
      const setRes = await fetch("/api/reviews/settings");
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(setData.settings);
        if (setData.settings) {
          setSettingsForm({
            popupEnabled: setData.settings.popupEnabled,
            popupDelaySeconds: setData.settings.popupDelaySeconds,
            autoApprove: setData.settings.autoApprove,
            cooldownDays: setData.settings.cooldownDays,
            minBill: setData.settings.minBill,
            googleReviewLink: setData.settings.googleReviewLink || "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to load review data:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- SUBMISSIONS ACTIONS ---
  async function handleApproveSubmission(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reviews/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      if (res.ok) {
        setSelectedSubmission(null);
        await fetchInitialData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmission(id: string) {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection (e.g. Not a valid Google review)");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reviews/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", reason: rejectReason }),
      });
      if (res.ok) {
        setSelectedSubmission(null);
        setRejectReason("");
        await fetchInitialData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reject");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // --- POS REDEMPTION ACTIONS ---
  async function handlePreviewRedeem() {
    setRedeemError("");
    setRedeemSuccess("");
    setRedeemPreview(null);

    if (!redeemCode.trim()) {
      setRedeemError("Please enter a coupon code");
      return;
    }
    const bill = parseFloat(redeemBill);
    if (isNaN(bill) || bill <= 0) {
      setRedeemError("Please enter a valid bill amount greater than ₹0");
      return;
    }

    setPosLoading(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: redeemCode.trim(),
          billAmount: bill,
          action: "PREVIEW",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemError(data.error || "Failed to validate coupon");
      } else {
        setRedeemPreview({
          originalBill: data.originalBill,
          discountApplied: data.discountApplied,
          finalBill: data.finalBill,
          coupon: data.coupon,
        });
      }
    } catch {
      setRedeemError("Error contacting redemption server");
    } finally {
      setPosLoading(false);
    }
  }

  async function handleExecuteRedeem() {
    if (!redeemPreview) return;
    setPosLoading(true);
    setRedeemError("");

    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: redeemCode.trim(),
          billAmount: redeemPreview.originalBill,
          action: "REDEEM",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemError(data.error || "Failed to redeem coupon");
      } else {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        setRedeemSuccess(`🎉 Coupon ${data.coupon.code} REDEEMED successfully! Applied discount: ₹${data.discountApplied}. Final Bill: ₹${data.finalBill}`);
        setRedeemPreview(null);
        setRedeemCode("");
        setRedeemBill("");
        // Refresh coupons
        const refreshed = await fetch("/api/coupons");
        if (refreshed.ok) {
          const cData = await refreshed.json();
          setCoupons(cData.coupons || []);
        }
      }
    } catch {
      setRedeemError("Redemption failed unexpectedly");
    } finally {
      setPosLoading(false);
    }
  }

  // --- REWARD RULES ACTIONS ---
  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const isEdit = !!editingRule.id;
      const url = "/api/reviews/rules";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRule),
      });

      if (res.ok) {
        setIsRuleModalOpen(false);
        setEditingRule(null);
        const rulesRes = await fetch("/api/reviews/rules");
        if (rulesRes.ok) {
          const rData = await rulesRes.json();
          setRules(rData.rules || []);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save rule");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Are you sure you want to delete this reward rule?")) return;
    try {
      const res = await fetch(`/api/reviews/rules?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete rule");
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --- SETTINGS ACTIONS ---
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedMsg("");

    try {
      const res = await fetch("/api/reviews/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });

      if (res.ok) {
        setSettingsSavedMsg("Settings saved successfully!");
        setTimeout(() => setSettingsSavedMsg(""), 4000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save settings");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  }

  // Calculations
  const pendingSubmissionsCount = submissions.filter((s) => s.status === "PENDING").length;
  const filteredSubmissions = submissions.filter((s) => {
    if (subFilter === "ALL") return true;
    return s.status === subFilter;
  });

  const totalRuleWeight = rules.reduce((acc, r) => acc + (r.active ? r.weight : 0), 0);

  const filteredCoupons = coupons.filter((c) => {
    if (couponFilter === "ALL") return true;
    return c.status === couponFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-medium text-stone-500">Loading Reviews & Rewards...</p>
      </div>
    );
  }

  return (
    <FeatureGate feature="reviewReward" features={userFeatures}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-amber-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl shadow-md">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Google Reviews & Scratch Rewards
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Automate 5-star customer reviews on Google with gamified scratch cards & coupon discounts.
            </p>
          </div>

          {restaurantSlug && (
            <div className="flex items-center gap-2">
              <a
                href={`/reward/${restaurantSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                Customer Reward Page
              </a>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-px">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
              activeTab === "submissions"
                ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Eye className="w-4 h-4" />
            Review Submissions
            {pendingSubmissionsCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {pendingSubmissionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("redeem")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
              activeTab === "redeem"
                ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Receipt className="w-4 h-4" />
            POS Redeem Counter
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
              activeTab === "rules"
                ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Gift className="w-4 h-4" />
            Reward Pool & Odds
          </button>

          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
              activeTab === "coupons"
                ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Coupons Log
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Review Settings
          </button>
        </div>

        {/* ================= TAB 1: SUBMISSIONS ================= */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSubFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      subFilter === st
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {st === "ALL" ? "All Submissions" : st}
                    {st === "PENDING" && pendingSubmissionsCount > 0 && (
                      <span className="ml-1.5 bg-white text-amber-700 px-1.5 py-0.2 rounded-full text-[10px]">
                        {pendingSubmissionsCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchInitialData}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Submissions Table */}
            {filteredSubmissions.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <Smile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-800">No review submissions found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  When customers review your restaurant on Google and upload a screenshot, their submission will appear here for verification.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-amber-50/50 text-xs text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Screenshot</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Reward Issued</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-amber-50/20 transition">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 block"
                            >
                              <img
                                src={sub.screenshotUrl}
                                alt="Screenshot"
                                className="w-full h-full object-cover group-hover:scale-110 transition"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{sub.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{sub.phone}</td>
                          <td className="px-4 py-3">
                            {sub.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {sub.status === "APPROVED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {sub.status === "REJECTED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {sub.coupon ? (
                              <div>
                                <span className="font-semibold text-amber-700 text-xs">
                                  {sub.coupon.rewardRule.label}
                                </span>
                                <div className="text-[11px] font-mono text-gray-500">
                                  {sub.coupon.code}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(sub.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition"
                            >
                              View / Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Submission Detail Modal */}
            {selectedSubmission && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Review Screenshot Verification</h3>
                      <p className="text-xs text-gray-500">Submitted by {selectedSubmission.name} ({selectedSubmission.phone})</p>
                    </div>
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Full screenshot preview */}
                    <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex justify-center max-h-96">
                      <img
                        src={selectedSubmission.screenshotUrl}
                        alt="Proof screenshot"
                        className="object-contain max-h-96 w-auto"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <div>
                        <span className="text-gray-500 block">Submitted At:</span>
                        <span className="font-semibold text-gray-800">
                          {new Date(selectedSubmission.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Current Status:</span>
                        <span className="font-bold uppercase tracking-wider text-amber-800">
                          {selectedSubmission.status}
                        </span>
                      </div>
                      {selectedSubmission.coupon && (
                        <div className="col-span-2 pt-2 border-t border-amber-200">
                          <span className="text-gray-500 block">Reward Generated:</span>
                          <span className="font-bold text-amber-900 text-sm">
                            {selectedSubmission.coupon.rewardRule.label} (Code: {selectedSubmission.coupon.code})
                          </span>
                        </div>
                      )}
                      {selectedSubmission.reason && (
                        <div className="col-span-2 pt-2 border-t border-amber-200 text-red-600">
                          <span className="font-semibold">Rejection Reason:</span> {selectedSubmission.reason}
                        </div>
                      )}
                    </div>

                    {/* Pending Action Buttons */}
                    {selectedSubmission.status === "PENDING" && (
                      <div className="space-y-4 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Rejection Reason (if rejecting):
                          </label>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Screenshot does not show a Google review for our restaurant"
                            className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-3 justify-end">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRejectSubmission(selectedSubmission.id)}
                            className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition disabled:opacity-50"
                          >
                            Reject Submission
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApproveSubmission(selectedSubmission.id)}
                            className="px-5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Approve & Issue Reward
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: POS REDEEM ================= */}
        {activeTab === "redeem" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Staff POS Coupon Redemption</h2>
                  <p className="text-xs text-gray-500">
                    Verify coupon code, preview discount against table bill, and execute atomic redemption.
                  </p>
                </div>
              </div>

              {redeemError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{redeemError}</span>
                </div>
              )}

              {redeemSuccess && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-800 text-sm font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{redeemSuccess}</span>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MM-7A3B9C"
                    className="w-full text-base font-mono uppercase tracking-widest px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Customer Food Bill Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={redeemBill}
                      onChange={(e) => setRedeemBill(e.target.value)}
                      placeholder="e.g. 850"
                      className="w-full text-base pl-9 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={posLoading}
                  onClick={handlePreviewRedeem}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Percent className="w-4 h-4" />
                  {posLoading ? "Verifying..." : "Calculate Discount"}
                </button>
              </div>

              {/* Preview Bill Breakdown */}
              {redeemPreview && (
                <div className="mt-6 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                    <div>
                      <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Valid Reward</span>
                      <h4 className="text-base font-bold text-gray-900">{redeemPreview.coupon.label}</h4>
                      <p className="text-xs text-gray-600 font-mono">Issued to: {redeemPreview.coupon.phone}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Original Food Bill:</span>
                      <span className="font-semibold text-gray-900">₹{redeemPreview.originalBill.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Reward Discount Applied:</span>
                      <span>- ₹{redeemPreview.discountApplied.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-amber-200 flex justify-between items-center">
                      <span className="font-bold text-gray-900 text-base">Final Customer Payable:</span>
                      <span className="text-2xl font-black text-amber-900">
                        ₹{redeemPreview.finalBill.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={posLoading}
                    onClick={handleExecuteRedeem}
                    className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Confirm & Mark Redeemed (Atomic)
                  </button>
                  <p className="text-[11px] text-center text-gray-500">
                    This action is final. Once marked redeemed, this coupon code can never be reused.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: REWARD POOL RULES ================= */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Weighted Probability Reward Pool</h3>
                <p className="text-xs text-gray-500">
                  When a customer scratches their reward card, the backend selects an outcome using weighted random odds.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingRule({
                    label: "",
                    type: "PERCENT",
                    value: 10,
                    weight: 30,
                    expiryDays: 30,
                    usageLimit: 1,
                    active: true,
                  });
                  setIsRuleModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Reward Rule
              </button>
            </div>

            {/* Rules Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50/50 text-xs text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Reward Label</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Discount Value</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Win Chance</th>
                    <th className="px-4 py-3">Validity</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule) => {
                    const probability = totalRuleWeight > 0 && rule.active
                      ? ((rule.weight / totalRuleWeight) * 100).toFixed(1)
                      : "0.0";

                    return (
                      <tr key={rule.id} className="hover:bg-amber-50/20 transition">
                        <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-amber-600" />
                          {rule.label}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                            {rule.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {rule.type === "PERCENT" && `${rule.value}%`}
                          {rule.type === "FLAT" && `₹${rule.value}`}
                          {rule.type === "FREE_ITEM" && "Free Item"}
                          {rule.type === "NONE" && "No Discount"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{rule.weight}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-700 text-xs">{probability}%</span>
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, parseFloat(probability))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{rule.expiryDays} days</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rule.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {rule.active ? "ACTIVE" : "PAUSED"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingRule(rule);
                                setIsRuleModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-100 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rule Modal */}
            {isRuleModalOpen && editingRule && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleSaveRule}
                  className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-900">
                      {editingRule.id ? "Edit Reward Rule" : "New Reward Rule"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsRuleModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Reward Label (Shown to customer)
                    </label>
                    <input
                      type="text"
                      required
                      value={editingRule.label || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, label: e.target.value })}
                      placeholder="e.g. 15% OFF Entire Bill"
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                      <select
                        value={editingRule.type || "PERCENT"}
                        onChange={(e) => setEditingRule({ ...editingRule, type: e.target.value as any })}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="PERCENT">Percentage Discount (%)</option>
                        <option value="FLAT">Flat Cash Discount (₹)</option>
                        <option value="FREE_ITEM">Free Item / Dessert</option>
                        <option value="NONE">Better Luck Next Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Value (₹ or %)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRule.value ?? 0}
                        onChange={(e) => setEditingRule({ ...editingRule, value: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Odds Weight (Higher = More frequent)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingRule.weight ?? 10}
                        onChange={(e) => setEditingRule({ ...editingRule, weight: parseInt(e.target.value) || 1 })}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Expiry (Days)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingRule.expiryDays ?? 30}
                        onChange={(e) => setEditingRule({ ...editingRule, expiryDays: parseInt(e.target.value) || 30 })}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="active-rule"
                      checked={editingRule.active ?? true}
                      onChange={(e) => setEditingRule({ ...editingRule, active: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <label htmlFor="active-rule" className="text-xs font-semibold text-gray-800">
                      Rule Active in Pool
                    </label>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsRuleModalOpen(false)}
                      className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: COUPONS LOG ================= */}
        {activeTab === "coupons" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {["ALL", "ACTIVE", "REDEEMED", "EXPIRED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCouponFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      couponFilter === st
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {st === "ALL" ? "All Coupons" : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50/50 text-xs text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Coupon Code</th>
                    <th className="px-4 py-3">Customer Phone</th>
                    <th className="px-4 py-3">Reward Details</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Redemption Info</th>
                    <th className="px-4 py-3 text-right">Pass View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/20 transition">
                      <td className="px-4 py-3 font-mono font-bold text-amber-700">{c.code}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.phone}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.rewardRule.label}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(c.expiresAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : c.status === "REDEEMED"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {c.status === "REDEEMED" ? (
                          <span>
                            Bill: ₹{c.billAmount} (Saved: ₹{c.discountApplied})
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/coupon/${c.code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-amber-600 hover:text-amber-800 inline-flex items-center gap-1"
                        >
                          Digital Pass <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSaveSettings}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6"
            >
              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Google Review Reward Settings</h3>
                <p className="text-xs text-gray-500">
                  Control how the feedback prompt appears to your customers and configure anti-abuse limits.
                </p>
              </div>

              {settingsSavedMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{settingsSavedMsg}</span>
                </div>
              )}

              {/* Google Review Link */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Google Maps / Business Review URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settingsForm.googleReviewLink}
                    onChange={(e) => setSettingsForm({ ...settingsForm, googleReviewLink: e.target.value })}
                    placeholder="https://g.page/r/YOUR_RESTAURANT_ID/review"
                    className="flex-1 text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {settingsForm.googleReviewLink && (
                    <a
                      href={settingsForm.googleReviewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1"
                    >
                      Test <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Get this from Google Business Profile: &quot;Ask for reviews&quot; &rarr; copy review link.
                </p>
              </div>

              {/* Popup Toggle */}
              <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Enable Review Popup on Customer Menu</h4>
                  <p className="text-[11px] text-gray-500">
                    Displays &quot;Enjoyed your meal? Share feedback on Google & win a reward&quot; popup to diners.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.popupEnabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, popupEnabled: e.target.checked })}
                  className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {/* Auto Approve Toggle */}
              <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Instant Auto-Approve Screenshots</h4>
                  <p className="text-[11px] text-gray-500">
                    If enabled, customers immediately unlock their scratch card upon screenshot upload. If disabled, they wait in your review queue.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoApprove}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoApprove: e.target.checked })}
                  className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {/* Number parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Popup Delay (Seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settingsForm.popupDelaySeconds}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, popupDelaySeconds: parseInt(e.target.value) || 6 })
                    }
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Default: 6 seconds</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cooldown (Days / Phone)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settingsForm.cooldownDays}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, cooldownDays: parseInt(e.target.value) || 30 })
                    }
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Anti-abuse frequency limit</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Bill to Redeem (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settingsForm.minBill}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, minBill: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">0 for no minimum</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

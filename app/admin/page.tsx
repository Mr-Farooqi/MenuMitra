"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  DollarSign,
  QrCode,
  ShoppingBag,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Save,
  MessageSquare,
  LogOut,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowUpRight,
  Megaphone,
  Tag,
  FileText,
  UserCheck,
  CreditCard,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Eye,
} from "lucide-react";

interface AdminStats {
  totalRestaurants: number;
  activeRestaurants: number;
  pendingRestaurants: number;
  suspendedRestaurants: number;
  mrr: number;
  gmv: number;
  totalOrders: number;
  totalScans: number;
  topCities?: Array<{ city: string; count: number }>;
}

interface RestaurantItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  phone: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  packageId: string;
  package: {
    id: string;
    name: string;
    slug: string;
    price: number;
  };
  users: Array<{ id: string; name: string; email: string }>;
  _count: {
    orders: number;
    scanEvents: number;
    categories: number;
  };
}

interface PackageItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  features: string;
  _count: {
    restaurants: number;
  };
}

interface SupportTicketItem {
  id: string;
  subject: string;
  message: string;
  reply?: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone: string;
  };
}

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: string;
  targetPlan: string;
  active: boolean;
  createdAt: string;
}

interface PromoCodeItem {
  id: string;
  code: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  maxUses: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  details: string;
  actorEmail: string;
  restaurantId?: string | null;
  createdAt: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "analytics" | "restaurants" | "announcements" | "promos" | "logs" | "packages" | "tickets"
  >("analytics");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Manual Payment Modal
  const [manualPayModal, setManualPayModal] = useState<RestaurantItem | null>(null);
  const [manualPlanId, setManualPlanId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [manualMethod, setManualMethod] = useState("DIRECT_UPI");
  const [processingManualPay, setProcessingManualPay] = useState(false);

  // New Announcement Modal
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [newAnnounce, setNewAnnounce] = useState({
    title: "",
    message: "",
    type: "PROMO",
    targetPlan: "ALL",
  });

  // New Promo Modal
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: "",
    type: "PERCENT",
    value: 20,
    maxUses: 100,
  });

  // Editing Package
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);

  // Ticket Reply
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAllAdminData();
  }, []);

  async function loadAllAdminData() {
    setLoading(true);
    try {
      const [statsRes, restRes, pkgRes, tktRes, annRes, promoRes, logRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/restaurants"),
        fetch("/api/admin/packages"),
        fetch("/api/admin/tickets"),
        fetch("/api/admin/announcements"),
        fetch("/api/admin/promo-codes"),
        fetch("/api/admin/audit-logs"),
      ]);

      if (statsRes.status === 403 || statsRes.status === 401) {
        router.push("/login?error=SuperAdminRequired");
        return;
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats);
      }
      if (restRes.ok) {
        const rData = await restRes.json();
        setRestaurants(rData.restaurants || []);
      }
      if (pkgRes.ok) {
        const pData = await pkgRes.json();
        setPackages(pData.packages || []);
      }
      if (tktRes.ok) {
        const tData = await tktRes.json();
        setTickets(tData.tickets || []);
      }
      if (annRes.ok) {
        const aData = await annRes.json();
        setAnnouncements(aData.announcements || []);
      }
      if (promoRes.ok) {
        const prData = await promoRes.json();
        setPromos(prData.promoCodes || []);
      }
      if (logRes.ok) {
        const lData = await logRes.json();
        setAuditLogs(lData.logs || []);
      }
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 1-Click Impersonation (Login as Owner)
  async function handleImpersonate(restaurantId: string) {
    if (!confirm("Login as this restaurant owner? You can exit back to Admin at any time.")) return;
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = await res.json();
      if (res.ok && data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        alert(data.error || "Failed to impersonate");
      }
    } catch {
      alert("Error starting impersonation session");
    }
  }

  // Manual Payment / Subscription Activation
  async function handleSaveManualPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!manualPayModal) return;
    setProcessingManualPay(true);

    try {
      const res = await fetch("/api/admin/subscriptions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: manualPayModal.id,
          packageId: manualPlanId,
          amount: parseFloat(manualAmount),
          paymentReference: manualRef,
          paymentMethod: manualMethod,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Manual payment recorded & plan activated!");
        setManualPayModal(null);
        await loadAllAdminData();
      } else {
        alert(data.error || "Failed to process manual payment");
      }
    } catch {
      alert("Error processing payment");
    } finally {
      setProcessingManualPay(false);
    }
  }

  // Create Announcement
  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnnounce),
      });
      if (res.ok) {
        setIsAnnounceModalOpen(false);
        setNewAnnounce({ title: "", message: "", type: "PROMO", targetPlan: "ALL" });
        await loadAllAdminData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create announcement");
      }
    } catch {
      alert("Error creating announcement");
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!confirm("Delete this broadcast announcement?")) return;
    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnnouncements(announcements.filter((a) => a.id !== id));
      }
    } catch {
      alert("Error deleting announcement");
    }
  }

  // Create Promo Code
  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        code: newPromo.code,
        maxUses: newPromo.maxUses,
      };
      if (newPromo.type === "PERCENT") {
        payload.discountPercent = newPromo.value;
      } else {
        payload.discountAmount = newPromo.value;
      }

      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsPromoModalOpen(false);
        setNewPromo({ code: "", type: "PERCENT", value: 20, maxUses: 100 });
        await loadAllAdminData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create promo code");
      }
    } catch {
      alert("Error creating promo code");
    }
  }

  async function handleDeletePromo(id: string) {
    if (!confirm("Delete this promo code?")) return;
    try {
      const res = await fetch(`/api/admin/promo-codes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPromos(promos.filter((p) => p.id !== id));
      }
    } catch {
      alert("Error deleting promo code");
    }
  }

  // Toggle Restaurant Status (Approve / Suspend)
  async function handleUpdateRestaurantStatus(id: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        await loadAllAdminData();
      } else {
        alert("Failed to update restaurant status");
      }
    } catch {
      alert("Error contacting admin server");
    }
  }

  // Delete Restaurant Permanently
  async function handleDeleteRestaurant(id: string, name: string) {
    const confirmation = window.prompt(
      `⚠️ PERMANENT DELETION WARNING:\n\nAre you sure you want to PERMANENTLY delete "${name}"?\n\nThis will remove all menus, orders, tables, QR codes, website settings, review coupons, and owner accounts.\n\nType "DELETE" below to confirm:`,
      ""
    );
    if (confirmation !== "DELETE") {
      if (confirmation !== null) {
        alert("Deletion cancelled. You must type DELETE in all caps to confirm.");
      }
      return;
    }

    try {
      const res = await fetch(`/api/admin/restaurants?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Restaurant "${name}" deleted permanently.`);
        setRestaurants(restaurants.filter((r) => r.id !== id));
        await loadAllAdminData();
      } else {
        alert(data.error || "Failed to delete restaurant");
      }
    } catch {
      alert("Error contacting admin server to delete restaurant");
    }
  }

  // Change Restaurant Package
  async function handleChangeRestaurantPackage(id: string, packageId: string) {
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, packageId }),
      });
      if (res.ok) {
        await loadAllAdminData();
      } else {
        alert("Failed to change restaurant package");
      }
    } catch {
      alert("Error contacting admin server");
    }
  }

  // Save Package Price / Features
  async function handleSavePackage(pkg: PackageItem) {
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pkg.id,
          price: editPrice,
          features: editFeatures,
        }),
      });
      if (res.ok) {
        setEditingPkgId(null);
        await loadAllAdminData();
      } else {
        alert("Failed to save package");
      }
    } catch {
      alert("Error saving package");
    }
  }

  // Reply / Resolve Ticket
  async function handleTicketAction(ticketId: string, status?: string) {
    try {
      const reply = replyText[ticketId];
      const res = await fetch("/api/admin/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, reply, status }),
      });
      if (res.ok) {
        await loadAllAdminData();
      }
    } catch {
      alert("Error updating ticket");
    }
  }

  // Filtered Restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      (r.city && r.city.toLowerCase().includes(search.toLowerCase())) ||
      (r.phone && r.phone.includes(search));
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Super Admin Nav */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">MenuMitra Super Admin</h1>
                <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-extrabold uppercase rounded-full">
                  ROOT ACCESS
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Master control panel for multi-tenant restaurants, subscription billing, and platform health.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllAdminData}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition"
              title="Refresh platform data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-800 gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            KPIs & City Analytics
          </button>

          <button
            onClick={() => setActiveTab("restaurants")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "restaurants"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            Restaurants ({restaurants.length})
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "announcements"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Megaphone className="w-4 h-4 text-purple-400" />
            Announcements ({announcements.length})
          </button>

          <button
            onClick={() => setActiveTab("promos")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "promos"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Tag className="w-4 h-4 text-green-400" />
            Promo Codes ({promos.length})
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 text-stone-300" />
            Security & Audit Logs
          </button>

          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "packages"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            SaaS Packages & Pricing
          </button>

          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "tickets"
                ? "bg-stone-800 text-white border-t-2 border-amber-500"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Support Desk
            {tickets.filter((t) => t.status === "OPEN").length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full">
                {tickets.filter((t) => t.status === "OPEN").length}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB 1: ANALYTICS & CITY GROWTH ================= */}
        {activeTab === "analytics" && stats && (
          <div className="space-y-6">
            {/* Platform KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Restaurants</span>
                  <Building2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white mt-2">{stats.totalRestaurants}</div>
                <div className="text-[11px] text-stone-400 mt-1 flex gap-2">
                  <span className="text-green-400 font-bold">{stats.activeRestaurants} Active</span>
                  <span>•</span>
                  <span className="text-amber-400">{stats.pendingRestaurants} Pending</span>
                </div>
              </div>

              <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Monthly Recurring Rev</span>
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-3xl font-black text-white mt-2">
                  ₹{stats.mrr.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">Platform ARR: ₹{(stats.mrr * 12).toLocaleString("en-IN")}</div>
              </div>

              <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Orders & GMV</span>
                  <ShoppingBag className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white mt-2">{stats.totalOrders}</div>
                <div className="text-[11px] text-stone-400 mt-1">
                  GMV: ₹{stats.gmv.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">QR Scans Tracked</span>
                  <QrCode className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white mt-2">{stats.totalScans}</div>
                <div className="text-[11px] text-stone-400 mt-1">Live customer scans</div>
              </div>
            </div>

            {/* City-wise & Regional Growth breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">City-wise Restaurant Footprint</h3>
                </div>
                {stats.topCities && stats.topCities.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topCities.map((item, idx) => {
                      const percentage = stats.totalRestaurants > 0
                        ? Math.round((item.count / stats.totalRestaurants) * 100)
                        : 0;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs text-stone-300">
                            <span className="font-semibold">{item.city}</span>
                            <span className="text-stone-400 font-mono">
                              {item.count} restaurants ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">No city telemetry recorded yet.</p>
                )}
              </div>

              {/* Package Subscribers share */}
              <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-bold text-white">SaaS Package Subscription Share</h3>
                </div>
                <div className="space-y-4">
                  {packages.map((pkg) => {
                    const count = pkg._count.restaurants;
                    const percentage = stats.totalRestaurants > 0
                      ? Math.round((count / stats.totalRestaurants) * 100)
                      : 0;

                    return (
                      <div key={pkg.id} className="space-y-1">
                        <div className="flex justify-between text-xs text-stone-300">
                          <span className="font-semibold">{pkg.name} (₹{pkg.price}/mo)</span>
                          <span className="font-mono text-stone-400">{count} restaurants</span>
                        </div>
                        <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              pkg.slug === "premium"
                                ? "bg-amber-500"
                                : pkg.slug === "standard"
                                ? "bg-orange-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: RESTAURANTS DIRECTORY ================= */}
        {activeTab === "restaurants" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search restaurant, slug, city..."
                  className="w-full pl-9 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                {["ALL", "ACTIVE", "PENDING", "SUSPENDED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      statusFilter === st
                        ? "bg-amber-600 text-white"
                        : "bg-stone-800 text-stone-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-stone-300">
                  <thead className="bg-stone-900/60 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-700/60">
                    <tr>
                      <th className="px-5 py-3">Restaurant</th>
                      <th className="px-5 py-3">Owner Contact</th>
                      <th className="px-5 py-3">Current Plan</th>
                      <th className="px-5 py-3">Telemetry</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Owner Shadow & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-700/50">
                    {filteredRestaurants.map((r) => {
                      const owner = r.users[0];
                      return (
                        <tr key={r.id} className="hover:bg-stone-700/20 transition">
                          <td className="px-5 py-4">
                            <div className="font-bold text-white text-xs">{r.name}</div>
                            <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1 mt-0.5">
                              <span>/{r.slug}</span>
                              <a
                                href={`/m/${r.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5">{r.city || "India"}</div>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="text-stone-200">{owner ? owner.name : "No owner"}</div>
                            <div className="font-mono text-[11px] text-stone-400">{owner?.email}</div>
                            <div className="text-[11px] text-stone-400">{r.phone}</div>
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={r.packageId}
                              onChange={(e) => handleChangeRestaurantPackage(r.id, e.target.value)}
                              className="bg-stone-900 border border-stone-700 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {packages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>
                                  {pkg.name} (₹{pkg.price})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-5 py-4 text-xs text-stone-300">
                            <div>{r._count.orders} orders</div>
                            <div className="text-stone-500 text-[11px]">{r._count.scanEvents} scans</div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                r.status === "ACTIVE"
                                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                  : r.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-red-500/20 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1-Click Impersonation button */}
                              <button
                                onClick={() => handleImpersonate(r.id)}
                                className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                                title="Shadow login into owner dashboard"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Login as Owner
                              </button>

                              {/* Manual Payment / Invoice modal trigger */}
                              <button
                                onClick={() => {
                                  setManualPayModal(r);
                                  setManualPlanId(r.packageId);
                                  setManualAmount(r.package.price.toString());
                                  setManualRef(`OFFLINE_${Date.now()}`);
                                }}
                                className="px-2.5 py-1 bg-stone-700 hover:bg-stone-600 text-stone-200 text-[11px] font-semibold rounded-lg transition flex items-center gap-1"
                                title="Record manual cash / UPI payment & activate plan"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Manual Payment
                              </button>

                              {r.status !== "ACTIVE" && (
                                <button
                                  onClick={() => handleUpdateRestaurantStatus(r.id, "ACTIVE")}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-lg transition"
                                >
                                  Activate
                                </button>
                              )}
                              {r.status !== "SUSPENDED" && (
                                <button
                                  onClick={() => handleUpdateRestaurantStatus(r.id, "SUSPENDED")}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg transition"
                                >
                                  Suspend
                                </button>
                              )}

                              {/* Permanent Delete Button */}
                              <button
                                onClick={() => handleDeleteRestaurant(r.id, r.name)}
                                className="px-2.5 py-1 bg-red-950/70 hover:bg-red-700 text-red-300 hover:text-white border border-red-800/70 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                                title="Permanently delete restaurant and all its data"
                              >
                                <Trash2 className="w-3 h-3 text-red-400 group-hover:text-white" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Payment Modal */}
            {manualPayModal && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleSaveManualPayment}
                  className="bg-stone-800 border border-stone-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-700">
                    <div>
                      <h3 className="text-base font-bold text-white">Manual Payment & Plan Activation</h3>
                      <p className="text-xs text-stone-400">For {manualPayModal.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualPayModal(null)}
                      className="text-stone-400 hover:text-white"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Select Package</label>
                    <select
                      value={manualPlanId}
                      onChange={(e) => {
                        setManualPlanId(e.target.value);
                        const sel = packages.find((p) => p.id === e.target.value);
                        if (sel) setManualAmount(sel.price.toString());
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — ₹{pkg.price}/month
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Received Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={manualMethod}
                      onChange={(e) => setManualMethod(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="DIRECT_UPI">Direct UPI / QR Transfer</option>
                      <option value="BANK_NEFT_IMPS">Bank NEFT / IMPS</option>
                      <option value="CASH_RECEIVED">Cash Handover</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      UTR / Reference Number / Receipt Note
                    </label>
                    <input
                      type="text"
                      required
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      placeholder="e.g. UPI-9837428472 or CASH-RECEIPT-01"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-stone-700">
                    <button
                      type="button"
                      onClick={() => setManualPayModal(null)}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processingManualPay}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
                    >
                      {processingManualPay ? "Recording..." : "Record Payment & Activate"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: SYSTEM ANNOUNCEMENTS ================= */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-bold text-white">System Broadcast Announcements</h3>
                <p className="text-xs text-stone-400">
                  Broadcast notices, promotional offers, or maintenance alerts across restaurant dashboards.
                </p>
              </div>

              <button
                onClick={() => setIsAnnounceModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Broadcast
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center text-sm text-stone-400 bg-stone-800/80 rounded-2xl border border-stone-700/60">
                No system announcements posted yet. Click &quot;Create Broadcast&quot; above to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-5 bg-stone-800/80 border border-stone-700/60 rounded-2xl flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.type === "PROMO"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : a.type === "WARNING"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {a.type} • Target: {a.targetPlan}
                        </span>
                        <button
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="text-stone-400 hover:text-red-400 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{a.title}</h4>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed">{a.message}</p>
                    </div>

                    <div className="pt-2 border-t border-stone-700/50 flex justify-between items-center text-[11px] text-stone-500">
                      <span>Posted: {new Date(a.createdAt).toLocaleDateString("en-IN")}</span>
                      <span className="text-green-400 font-bold">Active in dashboards</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Announcement Modal */}
            {isAnnounceModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateAnnouncement}
                  className="bg-stone-800 border border-stone-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-700">
                    <h3 className="text-base font-bold text-white">Create Broadcast Announcement</h3>
                    <button
                      type="button"
                      onClick={() => setIsAnnounceModalOpen(false)}
                      className="text-stone-400 hover:text-white"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Headline</label>
                    <input
                      type="text"
                      required
                      value={newAnnounce.title}
                      onChange={(e) => setNewAnnounce({ ...newAnnounce, title: e.target.value })}
                      placeholder="e.g. Diwali Offer: Upgrade to Premium at 20% OFF!"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Message Body</label>
                    <textarea
                      rows={3}
                      required
                      value={newAnnounce.message}
                      onChange={(e) => setNewAnnounce({ ...newAnnounce, message: e.target.value })}
                      placeholder="Enter announcement text that owners will see..."
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">Type</label>
                      <select
                        value={newAnnounce.type}
                        onChange={(e) => setNewAnnounce({ ...newAnnounce, type: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="PROMO">Promotional / Special</option>
                        <option value="INFO">General Information</option>
                        <option value="WARNING">Maintenance Alert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">Target Plan</label>
                      <select
                        value={newAnnounce.targetPlan}
                        onChange={(e) => setNewAnnounce({ ...newAnnounce, targetPlan: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="ALL">All Restaurants</option>
                        <option value="BASIC">Basic Plan Only</option>
                        <option value="STANDARD">Standard Plan Only</option>
                        <option value="PREMIUM">Premium Plan Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-stone-700">
                    <button
                      type="button"
                      onClick={() => setIsAnnounceModalOpen(false)}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
                    >
                      Publish Broadcast
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PROMO CODES ENGINE ================= */}
        {activeTab === "promos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-bold text-white">SaaS Subscription Promo Codes</h3>
                <p className="text-xs text-stone-400">
                  Create discount codes for restaurants upgrading their subscription plans.
                </p>
              </div>

              <button
                onClick={() => setIsPromoModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Promo Code
              </button>
            </div>

            <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-stone-300">
                <thead className="bg-stone-900/60 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-700/60">
                  <tr>
                    <th className="px-5 py-3">Promo Code</th>
                    <th className="px-5 py-3">Discount Value</th>
                    <th className="px-5 py-3">Usage</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-700/50">
                  {promos.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-700/20 transition">
                      <td className="px-5 py-4 font-mono font-bold text-amber-400 text-sm">
                        {p.code}
                      </td>
                      <td className="px-5 py-4 font-bold text-white text-xs">
                        {p.discountPercent ? `${p.discountPercent}% OFF` : `₹${p.discountAmount} FLAT OFF`}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono">
                        {p.usedCount} / {p.maxUses} used
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.active ? "bg-green-500/20 text-green-300" : "bg-stone-700 text-stone-400"
                          }`}
                        >
                          {p.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-stone-400">
                        {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeletePromo(p.id)}
                          className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create Promo Modal */}
            {isPromoModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreatePromo}
                  className="bg-stone-800 border border-stone-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-700">
                    <h3 className="text-base font-bold text-white">Create Platform Promo Code</h3>
                    <button
                      type="button"
                      onClick={() => setIsPromoModalOpen(false)}
                      className="text-stone-400 hover:text-white"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Promo Code</label>
                    <input
                      type="text"
                      required
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. DIWALI50 or WELCOME20"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase tracking-widest"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">Discount Type</label>
                      <select
                        value={newPromo.type}
                        onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="PERCENT">Percentage (%)</option>
                        <option value="FLAT">Flat Cash (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">Discount Value</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newPromo.value}
                        onChange={(e) => setNewPromo({ ...newPromo, value: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Max Redemptions</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newPromo.maxUses}
                      onChange={(e) => setNewPromo({ ...newPromo, maxUses: parseInt(e.target.value) || 100 })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-stone-700">
                    <button
                      type="button"
                      onClick={() => setIsPromoModalOpen(false)}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl"
                    >
                      Create Code
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: AUDIT LOGS ================= */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Platform Security & Audit Trail</h3>
              <p className="text-xs text-stone-400">
                Immutable activity logs of admin actions, plan upgrades, status changes, and shadow sessions.
              </p>
            </div>

            <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-stone-300">
                <thead className="bg-stone-900/60 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-700/60">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Action Event</th>
                    <th className="px-5 py-3">Details</th>
                    <th className="px-5 py-3">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-700/50">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-700/20 transition text-xs">
                      <td className="px-5 py-3 text-stone-400 font-mono">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-stone-700 text-stone-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-stone-200">{log.details}</td>
                      <td className="px-5 py-3 font-mono text-stone-400">{log.actorEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: PACKAGES & PRICING ================= */}
        {activeTab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const isEditing = editingPkgId === pkg.id;
              const features: string[] = (() => {
                try {
                  return typeof pkg.features === "string" ? JSON.parse(pkg.features) : pkg.features;
                } catch {
                  return [];
                }
              })();

              return (
                <div
                  key={pkg.id}
                  className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                      <span className="px-2 py-0.5 bg-stone-700 text-stone-300 rounded text-[10px] font-mono">
                        {pkg._count.restaurants} restaurants
                      </span>
                    </div>

                    <div className="mt-4 pb-4 border-b border-stone-700/50">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                            className="w-32 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-white font-bold text-lg"
                          />
                          <span className="text-xs text-stone-400">/ mo</span>
                        </div>
                      ) : (
                        <div className="text-2xl font-black text-white">
                          ₹{pkg.price}
                          <span className="text-xs font-normal text-stone-400"> / month</span>
                        </div>
                      )}
                    </div>

                    {/* Features checklist */}
                    <div className="mt-4 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                        Package Entitlements:
                      </span>
                      {["menu", "qr", "website", "orders", "reviewReward"].map((feat) => {
                        const checked = isEditing ? editFeatures.includes(feat) : features.includes(feat);

                        return (
                          <label
                            key={feat}
                            className={`flex items-center gap-2 text-xs ${
                              isEditing ? "cursor-pointer" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditFeatures([...editFeatures, feat]);
                                } else {
                                  setEditFeatures(editFeatures.filter((f) => f !== feat));
                                }
                              }}
                              className="rounded border-stone-600 text-amber-500 focus:ring-amber-500 bg-stone-900"
                            />
                            <span className={checked ? "text-stone-200" : "text-stone-500"}>
                              {feat === "menu" && "Digital Menu Catalog"}
                              {feat === "qr" && "Table & Menu QR Codes"}
                              {feat === "website" && "Branded Website Builder"}
                              {feat === "orders" && "Online Orders & Kanban KOT"}
                              {feat === "reviewReward" && "Google Reviews & Scratch Rewards"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-stone-700/50">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPkgId(null)}
                          className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSavePackage(pkg)}
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Changes
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPkgId(pkg.id);
                          setEditPrice(pkg.price);
                          setEditFeatures(features);
                        }}
                        className="w-full py-2 bg-stone-700/80 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Package Price & Features
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= TAB 7: SUPPORT TICKETS ================= */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-sm text-stone-400 bg-stone-800/80 rounded-2xl border border-stone-700/60">
                No support tickets raised yet.
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 bg-stone-800/80 border border-stone-700/60 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === "OPEN"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-green-500/20 text-green-300 border border-green-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{t.subject}</h4>
                        <p className="text-xs text-stone-400">
                          From: {t.restaurant.name} ({t.restaurant.phone}) •{" "}
                          {new Date(t.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleTicketAction(t.id, t.status === "OPEN" ? "RESOLVED" : "OPEN")
                        }
                        className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-xs text-stone-200 font-semibold rounded-lg"
                      >
                        Mark as {t.status === "OPEN" ? "Resolved" : "Open"}
                      </button>
                    </div>

                    <div className="p-3 bg-stone-900/60 rounded-xl text-xs text-stone-300 border border-stone-800">
                      {t.message}
                    </div>

                    {t.reply && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                        <span className="font-bold">Super Admin Reply: </span>
                        {t.reply}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Type reply to restaurant..."
                        value={replyText[t.id] || ""}
                        onChange={(e) => setReplyText({ ...replyText, [t.id]: e.target.value })}
                        className="flex-1 bg-stone-900 border border-stone-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        onClick={() => handleTicketAction(t.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

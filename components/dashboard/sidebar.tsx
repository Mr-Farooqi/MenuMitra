"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  LayoutDashboard,
  MenuSquare,
  QrCode,
  Globe,
  ShoppingBag,
  Gift,
  CreditCard,
  Settings,
  Shield,
  Lock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
  Smartphone,
} from "lucide-react";
import { FeatureKey, FEATURE_INFO } from "@/lib/feature-gate";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    restaurant: {
      id: string;
      name: string;
      slug: string;
      logo?: string | null;
      status?: string;
      package: {
        name: string;
        slug: string;
      };
      features: string[];
      pendingPayment?: any;
    } | null;
  };
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function DashboardSidebar({ user, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const [lockedModalFeature, setLockedModalFeature] = useState<FeatureKey | null>(null);

  const features = user.restaurant?.features || [];
  const planName = user.restaurant?.package?.name || "BASIC";

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Menu Manager",
      href: "/dashboard/menu",
      icon: MenuSquare,
      feature: "menu" as FeatureKey,
    },
    {
      label: "QR Codes",
      href: "/dashboard/qr",
      icon: QrCode,
      feature: "qr" as FeatureKey,
    },
    {
      label: "Website Builder",
      href: "/dashboard/website",
      icon: Globe,
      feature: "website" as FeatureKey,
      planLabel: "Standard+",
    },
    {
      label: "Orders & KOT",
      href: "/dashboard/orders",
      icon: ShoppingBag,
      feature: "orders" as FeatureKey,
      planLabel: "Standard+",
    },
    {
      label: "Waiter Station",
      href: "/dashboard/waiters",
      icon: Smartphone,
      feature: "orders" as FeatureKey,
      planLabel: "Standard+",
    },
    {
      label: "Reviews & Rewards",
      href: "/dashboard/reviews",
      icon: Gift,
      feature: "reviewReward" as FeatureKey,
      planLabel: "Premium",
    },
    {
      label: "Billing & Plan",
      href: "/dashboard/billing",
      icon: CreditCard,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-stone-900 text-stone-300 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="h-18 px-5 flex items-center justify-between border-b border-stone-800">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-amber-500 flex items-center justify-center text-white shadow-soft">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black text-white">
                  Menu<span className="text-brand-500">Mitra</span>
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-500 -mt-1">
                  Owner Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Restaurant switcher info card */}
          {user.restaurant && (
            <div className="p-3 mx-3 my-3 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.restaurant.logo ? (
                  <img
                    src={user.restaurant.logo}
                    alt={user.restaurant.name}
                    className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center text-stone-300 shrink-0 font-bold text-xs">
                    {user.restaurant.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.restaurant.name}</p>
                  <span
                    className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      planName === "PREMIUM"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : planName === "STANDARD"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-stone-700 text-stone-300"
                    }`}
                  >
                    {planName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLockedModalFeature("reviewReward")}
                title="Upgrade Plan"
                className="text-stone-400 hover:text-amber-400 p-1 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nav Items */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const isLocked = item.feature && !features.includes(item.feature);

              if (isLocked) {
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setLockedModalFeature(item.feature!);
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-stone-400 hover:bg-stone-800/60 hover:text-stone-300 transition-colors text-xs font-semibold group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-stone-800 text-amber-400/90 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{item.planLabel}</span>
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                    isActive
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25 font-bold"
                      : "text-stone-300 hover:bg-stone-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-stone-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              );
            })}

            {/* Super admin link if applicable */}
            {user.role === "SUPER_ADMIN" && (
              <div className="pt-2 mt-2 border-t border-stone-800">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-400 hover:bg-stone-800 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Super Admin Portal</span>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="p-3 border-t border-stone-800">
          <div className="p-2 rounded-xl bg-stone-800/50 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-700/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Upgrade modal for locked features */}
      <UpgradeModal
        isOpen={lockedModalFeature !== null}
        onClose={() => setLockedModalFeature(null)}
        featureKey={lockedModalFeature || undefined}
      />
    </>
  );
}

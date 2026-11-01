"use client";

import React, { useState } from "react";
import { Menu, ExternalLink, Sparkles, QrCode, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

interface HeaderProps {
  user: {
    id: string;
    name: string;
    role: string;
    impersonatedBy?: string | null;
    restaurant: {
      id: string;
      name: string;
      slug: string;
      status?: string;
      package: {
        name: string;
      };
      features: string[];
      pendingPayment?: any;
    } | null;
  };
  setMobileOpen: (open: boolean) => void;
}

export function DashboardHeader({ user, setMobileOpen }: HeaderProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [exitingImpersonation, setExitingImpersonation] = useState(false);
  const restaurant = user.restaurant;
  const isPremium = restaurant?.package?.name === "PREMIUM";

  const handleExitImpersonation = async () => {
    setExitingImpersonation(true);
    try {
      const res = await fetch("/api/admin/revert-impersonate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.location.href = data.redirectTo || "/admin";
      } else {
        alert("Failed to revert impersonation");
        setExitingImpersonation(false);
      }
    } catch {
      alert("Error reverting to admin");
      setExitingImpersonation(false);
    }
  };

  return (
    <header className="h-18 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-extrabold text-stone-900 hidden sm:block">
            {restaurant ? restaurant.name : "Dashboard"}
          </h2>
          <span className="text-[11px] text-stone-400 hidden sm:block">
            Role: <span className="font-semibold text-stone-600">{user.role}</span>
          </span>
        </div>

        {user.impersonatedBy && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
            <span>🕵️ Impersonating (Super Admin: {user.impersonatedBy})</span>
            <button
              onClick={handleExitImpersonation}
              disabled={exitingImpersonation}
              className="bg-black/25 hover:bg-black/40 px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-wider underline disabled:opacity-50"
            >
              {exitingImpersonation ? "Exiting..." : "Exit to Admin ↗"}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {restaurant && (
          <>
            {/* Quick customer menu link */}
            <a
              href={`/m/${restaurant.slug}?table=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden md:inline">Customer Menu</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>

            {/* Quick website link if unlocked */}
            {restaurant.features.includes("website") && (
              <a
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Public Site</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            )}

            {/* Plan Badge / Upgrade button */}
            {!isPremium ? (
              <Button
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-bold shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-200" />
                Upgrade Plan
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-800 text-[11px] font-black tracking-wide uppercase">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>PREMIUM</span>
              </div>
            )}
          </>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </header>
  );
}

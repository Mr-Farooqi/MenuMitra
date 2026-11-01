"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, ShieldAlert } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

interface UserProp {
  id: string;
  name: string;
  email: string;
  role: string;
  impersonatedBy?: string | null;
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
    pendingPayment?: {
      id: string;
      amount: number;
      utrReference?: string | null;
      packageName: string;
      createdAt: string;
    } | null;
  } | null;
}

export function DashboardShell({
  user,
  children,
}: {
  user: UserProp;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPendingPayment = user.restaurant?.status === "PENDING_PAYMENT";
  const isSuspended = user.restaurant?.status === "SUSPENDED";

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <DashboardSidebar
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <DashboardHeader user={user} setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Pending Payment Alert Banner */}
          {isPendingPayment && (
            <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-amber-900">
                        Payment Verification in Progress
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">
                        Pending Admin Approval
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/80 mt-1">
                      {user.restaurant?.pendingPayment ? (
                        <>
                          We received your payment request for the{" "}
                          <strong className="font-semibold text-amber-950">
                            {user.restaurant.pendingPayment.packageName}
                          </strong>{" "}
                          plan (₹{user.restaurant.pendingPayment.amount}).
                          {user.restaurant.pendingPayment.utrReference && (
                            <span>
                              {" "}
                              UTR Reference:{" "}
                              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">
                                {user.restaurant.pendingPayment.utrReference}
                              </code>
                              .
                            </span>
                          )}{" "}
                          Our team verifies transactions within 15–30 minutes. Once approved, your digital menu, QR codes, website & ordering features will unlock automatically!
                        </>
                      ) : (
                        <>
                          Your subscription payment is awaiting verification. Once verified by Super Admin, all features will unlock automatically.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    href="/dashboard/billing"
                    className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 px-3.5 py-2 rounded-xl transition"
                  >
                    View Billing Status
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Suspended Alert Banner */}
          {isSuspended && (
            <div className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-4 sm:p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-900">Account Suspended</h3>
                  <p className="text-xs text-red-800/80 mt-1">
                    Your restaurant account is currently suspended. Please contact platform support to resolve this issue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

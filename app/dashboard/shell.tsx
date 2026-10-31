"use client";

import React, { useState } from "react";
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
    package: {
      name: string;
      slug: string;
    };
    features: string[];
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
          {children}
        </main>
      </div>
    </div>
  );
}

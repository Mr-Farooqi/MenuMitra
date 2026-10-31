"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Info, AlertTriangle, X, Gift } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  async function fetchAnnouncement() {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        if (data.announcement) {
          const isDismissed = sessionStorage.getItem(`dismiss_ann_${data.announcement.id}`);
          if (!isDismissed) {
            setAnnouncement(data.announcement);
            setDismissed(false);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  function handleDismiss() {
    if (announcement) {
      sessionStorage.setItem(`dismiss_ann_${announcement.id}`, "true");
      setDismissed(true);
    }
  }

  if (!announcement || dismissed) return null;

  const typeConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    PROMO: {
      bg: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white",
      border: "border-amber-400",
      text: "text-white",
      icon: <Gift className="w-5 h-5 text-amber-200 shrink-0" />,
    },
    WARNING: {
      bg: "bg-red-50 border-red-200 text-red-900",
      border: "border-red-200",
      text: "text-red-900",
      icon: <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />,
    },
    INFO: {
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      border: "border-blue-200",
      text: "text-blue-900",
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
  };

  const style = typeConfig[announcement.type] || typeConfig.INFO;

  return (
    <div
      className={`mb-6 p-4 rounded-2xl shadow-sm border flex items-center justify-between gap-4 transition-all ${style.bg} ${style.border}`}
    >
      <div className="flex items-center gap-3">
        {style.icon}
        <div>
          <h4 className="text-sm font-bold leading-tight">{announcement.title}</h4>
          <p className="text-xs opacity-90 mt-0.5">{announcement.message}</p>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-black/10 transition"
        title="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

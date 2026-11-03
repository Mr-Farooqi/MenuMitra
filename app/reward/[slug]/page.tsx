"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Gift,
  Upload,
  ExternalLink,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScratchCard } from "@/components/reward/scratch-card";

interface RestaurantInfo {
  name: string;
  slug: string;
  logo: string | null;
  googleReviewLink: string | null;
}

interface ApprovedCoupon {
  code: string;
  label: string;
  type: string;
  value: number;
  expiresAt: string;
}

export default function ReviewRewardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string)?.toLowerCase();

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  // Flow steps: 1: Instructions & Form, 2: Waiting/Pending Approval, 3: Scratch Card Revealed
  const [step, setStep] = useState<"form" | "pending" | "scratched">("form");

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approved reward data
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [rewardCoupon, setRewardCoupon] = useState<ApprovedCoupon | null>(null);

  // Check for any pending review submission in progress on this device
  useEffect(() => {
    if (!slug) return;
    try {
      const savedSubId = localStorage.getItem(`menumitra_pending_reward_${slug}`);
      if (savedSubId) {
        setSubmissionId(savedSubId);
        setStep("pending");
      }
    } catch {
      // ignore localStorage errors
    }
  }, [slug]);

  // Fetch restaurant details & review link
  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch(`/api/public/menu/${slug}`);
        const data = await res.json();
        if (data.restaurant) {
          setRestaurant({
            name: data.restaurant.name,
            slug: data.restaurant.slug,
            logo: data.restaurant.logo,
            googleReviewLink: data.reviewSettings?.googleReviewLink || null,
          });
        }
      } catch (err) {
        console.error("Failed to load restaurant info", err);
      } finally {
        setLoadingRestaurant(false);
      }
    }
    if (slug) loadInfo();
  }, [slug]);

  // Handle Screenshot selection & preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot file size must be less than 5MB");
      return;
    }

    setScreenshotFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Review Screenshot
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotFile) {
      setError("Please select a screenshot of your Google review");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("slug", slug);
      data.append("name", name);
      data.append("phone", phone);
      data.append("screenshot", screenshotFile);

      const res = await fetch("/api/reviews/submissions", {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to submit screenshot");
      }

      setSubmissionId(result.submissionId);

      if (result.status === "APPROVED" && result.coupon) {
        // Instant approval! Show scratch card
        try {
          localStorage.removeItem(`menumitra_pending_reward_${slug}`);
        } catch {}
        setRewardCoupon(result.coupon);
        setStep("scratched");
      } else {
        // Pending approval: save in localStorage & poll status
        try {
          localStorage.setItem(`menumitra_pending_reward_${slug}`, result.submissionId);
        } catch {}
        setStep("pending");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Polling for manual approval if status was PENDING
  useEffect(() => {
    if (step !== "pending" || !submissionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reviews/submissions/${submissionId}`);
        const data = await res.json();

        if (data.status === "APPROVED" && data.coupon) {
          try {
            localStorage.removeItem(`menumitra_pending_reward_${slug}`);
          } catch {}
          setRewardCoupon(data.coupon);
          setStep("scratched");
          clearInterval(interval);
        } else if (data.status === "REJECTED") {
          try {
            localStorage.removeItem(`menumitra_pending_reward_${slug}`);
          } catch {}
          setError(data.reason || "Review screenshot was rejected by restaurant staff.");
          setStep("form");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, submissionId, slug]);

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-stone-400">
        Loading rewards...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 py-10 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-brand-500 to-amber-400 text-white flex items-center justify-center mx-auto shadow-soft">
            <Gift className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-stone-900">
            {restaurant?.name || "Restaurant"} Rewards
          </h1>
          <p className="text-xs text-stone-500">
            Google Review Reward & Scratch Card Program
          </p>
        </div>

        {/* STEP 1: Instructions & Upload Form */}
        {step === "form" && (
          <div className="bg-white rounded-3xl p-6 shadow-soft-lg border border-stone-200 space-y-6">
            {/* 3 Step Instruction Guide */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                How to Win Your Reward
              </span>

              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <span className="font-bold">Post a 5-Star Review:</span> Tap below to open our Google Maps page and leave your review.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <span className="font-bold">Take a Screenshot:</span> Capture your posted review on your phone screen.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <span className="font-bold">Scratch & Win:</span> Upload the screenshot below to unlock your secret discount coupon!
                  </div>
                </div>
              </div>

              {restaurant?.googleReviewLink && (
                <div className="pt-2">
                  <a
                    href={restaurant.googleReviewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-stone-900 border border-amber-300 font-extrabold text-xs hover:bg-amber-100/60 transition-colors shadow-2xs"
                  >
                    <span>Open Google Review Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Mobile / WhatsApp Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  We use your phone number to securely attach your discount coupon
                </p>
              </div>

              {/* Screenshot Upload with Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Google Review Screenshot
                </label>

                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-brand-300 max-h-48">
                    <img
                      src={screenshotPreview}
                      alt="Review Screenshot"
                      className="w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotFile(null);
                        setScreenshotPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-lg px-2 py-1 text-xs"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center hover:border-brand-500 hover:bg-brand-50/20 transition-all space-y-2">
                      <Upload className="w-8 h-8 text-brand-500 mx-auto" />
                      <p className="text-xs font-bold text-stone-700">
                        Tap here to select screenshot
                      </p>
                      <p className="text-[10px] text-stone-400">PNG, JPG, or WEBP (Max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              <Button
                type="submit"
                isLoading={submitting}
                className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25 mt-2"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-200" />
                Submit & Reveal Scratch Card
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Anti-fraud verified duplicate image protection</span>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Pending Verification State */}
        {step === "pending" && (
          <div className="bg-white rounded-3xl p-8 shadow-soft-lg border border-stone-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-spin">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-stone-900">
              Verifying Your Review...
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              Our restaurant team is quickly reviewing your screenshot. Once approved, your scratch card will automatically appear here!
            </p>
            <div className="p-3 bg-stone-50 rounded-2xl text-[11px] font-mono text-stone-500">
              Polling live status every 3 seconds...
            </div>
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`menumitra_pending_reward_${slug}`);
                  } catch {}
                  setStep("form");
                  setSubmissionId(null);
                }}
                className="text-xs font-semibold text-stone-400 hover:text-stone-700 underline"
              >
                Upload a different screenshot
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Scratch Card Revealed! */}
        {step === "scratched" && rewardCoupon && (
          <div className="bg-white rounded-3xl p-6 shadow-soft-lg border border-stone-200 text-center space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-600">
                You Won a Reward!
              </span>
              <h2 className="text-xl font-black text-stone-900 mt-0.5">
                Scratch Your Surprise Card
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Rub the silver layer to reveal your coupon code!
              </p>
            </div>

            {/* Interactive Canvas Scratch Card Component */}
            <ScratchCard
              rewardLabel={rewardCoupon.label}
              couponCode={rewardCoupon.code}
            />

            {/* View Full Coupon Pass Link */}
            <div className="pt-2 border-t border-stone-100">
              <Link href={`/coupon/${rewardCoupon.code}`} className="block">
                <Button className="w-full font-black text-sm py-3 shadow-md shadow-brand-500/20">
                  <QrCode className="w-4 h-4 mr-2" />
                  View & Save My Coupon Pass &rarr;
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Back to Menu Link */}
        <div className="text-center">
          <Link
            href={`/m/${slug}`}
            className="text-xs font-bold text-stone-500 hover:text-stone-800"
          >
            &larr; Return to Restaurant Menu
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UtensilsCrossed,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Upload,
  Globe,
  Clock,
  MapPin,
  Phone,
  Gift,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PackageData {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  featuresList: string[];
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanSlug = searchParams.get("plan") || "premium";

  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    name: "",
    email: "",
    password: "",
    restaurantName: "",
    slug: "",
    // Step 2
    packageId: "",
    // Step 3
    phone: "",
    city: "Mumbai",
    address: "",
    timings: "11:00 AM - 11:00 PM",
    googleReviewLink: "",
    logo: "",
    cover: "",
    firstCategoryName: "Chef's Specials",
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch packages
  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch("/api/public/packages");
        const data = await res.json();
        if (data.packages && data.packages.length > 0) {
          setPackages(data.packages);
          // Set initial package
          const matching = data.packages.find((p: PackageData) => p.slug === initialPlanSlug.toLowerCase());
          if (matching) {
            setFormData((prev) => ({ ...prev, packageId: matching.id }));
          } else {
            setFormData((prev) => ({ ...prev, packageId: data.packages[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load packages", err);
      } finally {
        setLoadingPackages(false);
      }
    }
    loadPackages();
  }, [initialPlanSlug]);

  // Auto slug generator
  const handleRestaurantNameChange = (name: string) => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({
      ...prev,
      restaurantName: name,
      slug: prev.slug === "" || prev.slug === prev.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-") ? generatedSlug : prev.slug,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers event
    e.target.value = "";

    // Upfront format & size checks
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP, GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    const setter = type === "logo" ? setUploadingLogo : setUploadingCover;
    setter(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", type);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }
      setFormData((prev) => ({ ...prev, [type]: result.url }));
    } catch (err: unknown) {
      console.warn("Upload endpoint failed, using client-side reader fallback:", err);
      // Fallback: Read file locally as Data URL so user is never blocked
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            setFormData((prev) => ({ ...prev, [type]: dataUrl }));
            setError(null);
          }
        };
        reader.readAsDataURL(file);
      } catch {
        setError((err as Error).message || "File upload failed");
      }
    } finally {
      setter(false);
    }
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) return "Please enter your name";
    if (!formData.email.trim() || !formData.email.includes("@")) return "Please enter a valid email address";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    if (!formData.restaurantName.trim()) return "Please enter your restaurant name";
    if (!formData.slug.trim()) return "Please provide a valid URL slug";
    return null;
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push(data.redirectTo || "/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-soft">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-stone-900">
              Menu<span className="text-brand-500">Mitra</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-4">
            Register Your Restaurant
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Setup your digital menu, QR codes, and review rewards in 3 quick steps
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-3 mt-8 max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 1 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                1
              </span>
              <span className="text-xs font-semibold text-stone-700">Account</span>
            </div>
            <div className="w-8 h-0.5 bg-stone-200"></div>
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 2 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                2
              </span>
              <span className="text-xs font-semibold text-stone-700">Package</span>
            </div>
            <div className="w-8 h-0.5 bg-stone-200"></div>
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 3 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                3
              </span>
              <span className="text-xs font-semibold text-stone-700">Onboarding</span>
            </div>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-soft-lg border border-stone-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Owner and Restaurant Basics */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
                Step 1: Owner & Restaurant Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Chef Sanjeev"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@myrestaurant.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-stone-900"
                />
              </div>

              <div className="border-t border-stone-100 pt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.restaurantName}
                  onChange={(e) => handleRestaurantNameChange(e.target.value)}
                  placeholder="e.g. Royal Biryani House"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-stone-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Menu URL Slug
                </label>
                <div className="flex items-center rounded-xl border border-stone-300 overflow-hidden bg-stone-50 focus-within:ring-2 focus-within:ring-brand-500">
                  <span className="px-3.5 text-xs text-stone-400 font-medium">menumitra.com/m/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    placeholder="royal-biryani"
                    className="flex-1 py-2.5 pr-4 bg-transparent border-0 focus:outline-none text-sm text-brand-700 font-bold"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  This creates your restaurant&apos;s unique QR menu link
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={nextStep} className="px-6 font-bold shadow-md shadow-brand-500/20">
                  Continue to Package Selection
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Subscription Package */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-900">Step 2: Choose Your Package</h3>
                <span className="text-xs text-stone-500">Can be upgraded anytime</span>
              </div>

              {loadingPackages ? (
                <div className="py-12 text-center text-stone-400 text-sm">Loading package details...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map((pkg) => {
                    const isSelected = formData.packageId === pkg.id;
                    const isPremium = pkg.name === "PREMIUM";
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setFormData({ ...formData, packageId: pkg.id })}
                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/40 shadow-sm"
                            : "border-stone-200 hover:border-stone-300 bg-white"
                        }`}
                      >
                        {isPremium && (
                          <div className="absolute -top-3 right-3 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Best Growth
                          </div>
                        )}
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-stone-900 text-base">{pkg.name}</h4>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-brand-500 bg-brand-500 text-white" : "border-stone-300"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-stone-900">₹{pkg.price}</span>
                            <span className="text-xs text-stone-500">/mo</span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">{pkg.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-xs text-stone-700">
                          {pkg.featuresList.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="capitalize">{f === "reviewReward" ? "Review Scratch Cards" : f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-stone-100">
                <Button variant="ghost" onClick={prevStep} className="font-medium">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep} className="px-6 font-bold shadow-md shadow-brand-500/20">
                  Continue to Onboarding Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Fast Onboarding Setup */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
                Step 3: Fast Onboarding Setup
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Phone / WhatsApp Contact
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Operating Timings
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.timings}
                      onChange={(e) => setFormData({ ...formData, timings: e.target.value })}
                      placeholder="11:00 AM - 11:00 PM"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    City / Region
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Mumbai, Delhi, Pune..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Full Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Shop 4, Main Market, MG Road"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Google Maps Review Link (For Scratch Card Rewards)
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formData.googleReviewLink}
                    onChange={(e) => setFormData({ ...formData, googleReviewLink: e.target.value })}
                    placeholder="https://g.page/r/your-restaurant/review"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Customers who tap &quot;Review on Google&quot; will be taken directly here
                </p>
              </div>

              {/* Logo & Cover Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100 pt-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Restaurant Logo
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.logo ? (
                      <img
                        src={formData.logo}
                        alt="Logo"
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                        <UtensilsCrossed className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="cursor-pointer font-semibold"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {formData.logo ? "Change Logo" : "Upload Logo"}
                        </Button>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "logo")}
                        />
                        {formData.logo && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400">PNG, JPG, or WEBP up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    First Menu Category Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstCategoryName}
                    onChange={(e) => setFormData({ ...formData, firstCategoryName: e.target.value })}
                    placeholder="e.g. Starters & Appetizers"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    You can add more categories anytime from the menu manager
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-stone-100">
                <Button type="button" variant="ghost" onClick={prevStep} className="font-medium">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  className="px-8 py-3 text-base font-bold shadow-lg shadow-brand-500/25"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-200" />
                  Launch My Restaurant
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-500 mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-brand-600 hover:text-brand-700 font-bold underline">
            Sign in to existing account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-stone-400">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

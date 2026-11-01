"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
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
  QrCode,
  Copy,
  CreditCard,
  ShieldCheck,
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
    // Step 4
    utrReference: "",
    promoCode: "",
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // UPI Settings & QR state
  const [businessUpiId, setBusinessUpiId] = useState("menumitra@icici");
  const [businessUpiName, setBusinessUpiName] = useState("MenuMitra SaaS");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Fetch packages and UPI settings
  useEffect(() => {
    async function loadData() {
      try {
        const [pkgRes, settingsRes] = await Promise.all([
          fetch("/api/public/packages"),
          fetch("/api/public/platform-settings"),
        ]);

        const pkgData = await pkgRes.json();
        if (pkgData.packages && pkgData.packages.length > 0) {
          setPackages(pkgData.packages);
          const matching = pkgData.packages.find((p: PackageData) => p.slug === initialPlanSlug.toLowerCase());
          if (matching) {
            setFormData((prev) => ({ ...prev, packageId: matching.id }));
          } else {
            setFormData((prev) => ({ ...prev, packageId: pkgData.packages[0].id }));
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.businessUpiId) setBusinessUpiId(settingsData.businessUpiId);
          if (settingsData.businessUpiName) setBusinessUpiName(settingsData.businessUpiName);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoadingPackages(false);
      }
    }
    loadData();
  }, [initialPlanSlug]);

  const selectedPkg = packages.find((p) => p.id === formData.packageId) || packages[0];
  const basePrice = selectedPkg?.price || 0;
  const finalAmount = Math.max(0, basePrice - discountAmount);

  // Generate QR code for Step 4
  useEffect(() => {
    if (!selectedPkg || !businessUpiId) return;

    const upiUri = `upi://pay?pa=${encodeURIComponent(
      businessUpiId
    )}&pn=${encodeURIComponent(businessUpiName)}&am=${finalAmount.toFixed(
      2
    )}&cu=INR&tn=MenuMitra_${selectedPkg.slug.toUpperCase()}`;

    QRCode.toDataURL(upiUri, {
      width: 250,
      margin: 1,
      color: {
        dark: "#1c1917",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [businessUpiId, businessUpiName, finalAmount, selectedPkg]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(businessUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !selectedPkg) return;
    setValidatingPromo(true);
    setPromoMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/billing/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), planSlug: selectedPkg.slug }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo(data.code);
        setDiscountAmount(data.discountSaved || 0);
        setFormData((prev) => ({ ...prev, promoCode: data.code }));
        setPromoMessage(data.message || `Code ${data.code} applied! Saved ₹${data.discountSaved}.`);
      } else {
        setError(data.error || "Invalid promo code");
      }
    } catch {
      setError("Error validating promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setPromoMessage(null);
    setPromoInput("");
    setFormData((prev) => ({ ...prev, promoCode: "" }));
  };

  // Auto slug generator
  const handleRestaurantNameChange = (name: string) => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({
      ...prev,
      restaurantName: name,
      slug: generatedSlug,
    }));
  };

  // File Upload Helper
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "logo") setUploadingLogo(true);
    else setUploadingCover(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "branding");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setFormData((prev) => ({ ...prev, [field]: data.url }));
    } catch (err: unknown) {
      console.warn("Server upload failed, converting to local preview:", err);
      // Fallback: convert directly to base64 Data URL so the user never gets stuck
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFormData((prev) => ({ ...prev, [field]: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      if (field === "logo") setUploadingLogo(false);
      else setUploadingCover(false);
    }
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) return "Please enter your name";
    if (!formData.email.trim() || !formData.email.includes("@")) return "Please enter a valid email";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    if (!formData.restaurantName.trim()) return "Please enter your restaurant name";
    if (!formData.slug.trim()) return "Please provide a URL slug";
    return null;
  };

  const validateStep3 = () => {
    if (!formData.phone.trim() || formData.phone.length < 8) return "Please enter a valid phone number";
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
    if (step === 3) {
      const err = validateStep3();
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

    const cleanUtr = formData.utrReference.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setError("Please enter a valid 12-digit UPI Reference / UTR Number");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        utrReference: cleanUtr,
        promoCode: appliedPromo || promoInput.trim() || formData.promoCode || undefined,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            Setup your digital menu, QR codes, and review rewards in 4 simple steps
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2.5 mt-8 max-w-md mx-auto">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 1 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                1
              </span>
              <span className="text-xs font-semibold text-stone-700 hidden sm:inline">Account</span>
            </div>
            <div className="w-6 h-0.5 bg-stone-200"></div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 2 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                2
              </span>
              <span className="text-xs font-semibold text-stone-700 hidden sm:inline">Plan</span>
            </div>
            <div className="w-6 h-0.5 bg-stone-200"></div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 3 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                3
              </span>
              <span className="text-xs font-semibold text-stone-700 hidden sm:inline">Details</span>
            </div>
            <div className="w-6 h-0.5 bg-stone-200"></div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step >= 4 ? "bg-brand-500 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                4
              </span>
              <span className="text-xs font-semibold text-stone-700 hidden sm:inline">Payment</span>
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

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="text-lg font-bold text-stone-900">Step 1: Account & Restaurant</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Your credentials and public web link
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rahul@myrestaurant.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Restaurant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.restaurantName}
                    onChange={(e) => handleRestaurantNameChange(e.target.value)}
                    placeholder="e.g. Spice Symphony"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Menu URL Slug <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-mono">
                      /r/
                    </span>
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
                      placeholder="spicesymphony"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end border-t border-stone-100">
                <Button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 text-base font-bold shadow-lg shadow-brand-500/25"
                >
                  Continue to Plan Selection
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Package Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="text-lg font-bold text-stone-900">Step 2: Choose Your Plan</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select the subscription that best matches your restaurant needs
                </p>
              </div>

              {loadingPackages ? (
                <div className="py-12 text-center text-xs text-stone-400">Loading plans...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map((pkg) => {
                    const isSelected = formData.packageId === pkg.id;
                    const isPopular = pkg.slug === "premium";

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setFormData({ ...formData, packageId: pkg.id })}
                        className={`relative rounded-2xl p-5 cursor-pointer border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/40 shadow-soft"
                            : "border-stone-200 hover:border-stone-300 bg-white"
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-brand-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Most Popular
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-stone-900">{pkg.name}</h3>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? "border-brand-500 bg-brand-500 text-white"
                                  : "border-stone-300"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="mb-3">
                            <span className="text-2xl font-black text-stone-900">₹{pkg.price}</span>
                            <span className="text-xs text-stone-500"> /month</span>
                          </div>

                          <p className="text-xs text-stone-500 mb-4">{pkg.description}</p>

                          <ul className="space-y-2 border-t border-stone-100 pt-3 text-xs text-stone-600">
                            {pkg.featuresList.map((f, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-6 flex items-center justify-between border-t border-stone-100">
                <Button type="button" variant="ghost" onClick={prevStep} className="font-medium">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 text-base font-bold shadow-lg shadow-brand-500/25"
                >
                  Continue to Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Restaurant Details & Logo */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="text-lg font-bold text-stone-900">Step 3: Restaurant Details</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Branding and contact details for your menu and website
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Mumbai, Delhi, Bengaluru"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    placeholder="Shop 4, Ground Floor, Linking Road, Bandra West"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Business Timings
                    </label>
                    <input
                      type="text"
                      value={formData.timings}
                      onChange={(e) => setFormData({ ...formData, timings: e.target.value })}
                      placeholder="11:00 AM - 11:00 PM"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Google Review Link
                    </label>
                    <input
                      type="url"
                      value={formData.googleReviewLink}
                      onChange={(e) => setFormData({ ...formData, googleReviewLink: e.target.value })}
                      placeholder="https://g.page/r/your-place/review"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Logo Upload Section */}
                <div className="pt-2 border-t border-stone-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Restaurant Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.logo ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center p-1 relative shadow-sm">
                        <img
                          src={formData.logo}
                          alt="Logo Preview"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400">
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
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 text-base font-bold shadow-lg shadow-brand-500/25"
                >
                  Continue to Payment (₹{finalAmount})
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: UPI QR Payment & Verification */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">Step 4: Scan UPI QR & Pay</h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Pay via Google Pay, PhonePe, Paytm, or BHIM to activate your subscription
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg uppercase tracking-wide">
                    {selectedPkg?.name} Plan
                  </span>
                </div>
              </div>

              {/* Price summary */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    {selectedPkg?.name} Plan Subscription
                  </h4>
                  <p className="text-xs text-stone-500">
                    Includes Digital Menu, QR Codes, and selected growth tools
                  </p>
                </div>

                <div className="text-right">
                  {discountAmount > 0 ? (
                    <div>
                      <span className="text-sm text-stone-400 line-through mr-2">₹{basePrice}</span>
                      <span className="text-2xl font-black text-brand-600">₹{finalAmount}</span>
                      <span className="text-xs text-emerald-600 block font-semibold">
                        Discount Saved: ₹{discountAmount}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-brand-600">₹{finalAmount}</span>
                  )}
                  <span className="text-[10px] text-stone-400 block">GST Included</span>
                </div>
              </div>

              {/* Promo code voucher */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (e.g. NEW098)"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  disabled={validatingPromo || !!appliedPromo}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {appliedPromo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePromo}
                    className="shrink-0 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={validatingPromo || !promoInput.trim()}
                    onClick={handleApplyPromo}
                    className="shrink-0 text-xs"
                  >
                    {validatingPromo ? "Verifying..." : "Apply Voucher"}
                  </Button>
                )}
              </div>
              {promoMessage && (
                <p className="text-xs text-emerald-600 font-semibold">{promoMessage}</p>
              )}

              {/* QR and Payment Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2 border-t border-stone-100">
                {/* UPI QR Display */}
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border-2 border-dashed border-stone-200 shadow-sm">
                  <span className="text-xs font-bold text-stone-800 mb-2 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-brand-500" /> Scan to Pay with Any UPI App
                  </span>

                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="UPI QR Code"
                      className="w-48 h-48 rounded-xl shadow-sm border border-stone-100"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-xl bg-stone-100 animate-pulse flex items-center justify-center text-stone-400 text-xs">
                      Generating QR...
                    </div>
                  )}

                  {/* UPI ID Copy Card */}
                  <div className="mt-3 w-full">
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                      <span className="font-mono text-stone-700 truncate">{businessUpiId}</span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="text-brand-600 hover:text-brand-700 font-bold shrink-0 flex items-center gap-1"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy UPI
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-400 font-medium">
                    <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
                  </div>
                </div>

                {/* Instructions & UTR input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Payment Steps:
                    </h5>
                    <ol className="text-xs text-stone-600 space-y-1 list-decimal list-inside">
                      <li>Scan the QR code with any UPI app on your phone.</li>
                      <li>Pay exactly <strong>₹{finalAmount}</strong>.</li>
                      <li>Find the 12-digit <strong>UPI Reference / UTR Number</strong> in your transaction receipt.</li>
                      <li>Enter it below and click Launch Restaurant.</li>
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                      <span>12-Digit UPI Reference / UTR Number <span className="text-red-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 430123456789"
                      value={formData.utrReference}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          utrReference: e.target.value.replace(/[^0-9a-zA-Z]/g, ""),
                        })
                      }
                      maxLength={22}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 font-mono tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                    />
                    <span className="text-[11px] text-stone-400 block">
                      Admin verifies this reference to approve your account within 15–30 mins.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Safe & Direct: 100% Zero platform gateway commission</span>
                  </div>
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
                  disabled={submitting || !formData.utrReference.trim()}
                  className="px-8 py-3 text-base font-bold shadow-lg shadow-brand-500/25 bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-200" />
                  Submit Payment & Launch Restaurant
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-stone-400">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

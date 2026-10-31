"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Gift,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebsiteData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    cover: string | null;
    phone: string | null;
    timings: string | null;
    address: string | null;
    city: string | null;
  };
  template: "MODERN" | "TRADITIONAL" | "MINIMAL";
  sections: {
    hero: {
      headline: string;
      subheadline: string;
      ctaText: string;
      badge: string;
    };
    about: {
      title: string;
      story: string;
      signatureDish: string;
    };
    hours: {
      weekday: string;
      weekend: string;
      note: string;
    };
    contact: {
      phone: string;
      email: string;
      address: string;
    };
    gallery: string[];
  };
  reviewSettings: {
    popupEnabled: boolean;
    popupDelaySeconds: number;
    googleReviewLink: string | null;
  } | null;
  features: string[];
}

export default function PublicRestaurantWebsite() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string)?.toLowerCase();

  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewPopup, setShowReviewPopup] = useState(false);

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/public/website/${slug}`);
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to load website");
        }
        if (result.unpublished) {
          setError("This restaurant website is currently being updated. Please check back soon!");
        } else {
          setData(result);
        }
      } catch (err: unknown) {
        setError((err as Error).message || "Could not load website");
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchSite();
  }, [slug]);

  // Review popup logic
  useEffect(() => {
    if (
      !data?.reviewSettings ||
      !data.reviewSettings.popupEnabled ||
      !data.features.includes("reviewReward")
    ) {
      return;
    }

    const storageKey = `menumitra_review_popup_${slug}`;
    const lastDismissed = localStorage.getItem(storageKey);
    const now = Date.now();

    if (lastDismissed && now - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    const delay = (data.reviewSettings.popupDelaySeconds || 6) * 1000;
    const timer = setTimeout(() => {
      setShowReviewPopup(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [data, slug]);

  const dismissReviewPopup = () => {
    setShowReviewPopup(false);
    localStorage.setItem(`menumitra_review_popup_${slug}`, Date.now().toString());
  };

  const handleReviewClick = () => {
    dismissReviewPopup();
    if (data?.reviewSettings?.googleReviewLink) {
      window.open(data.reviewSettings.googleReviewLink, "_blank");
    }
    router.push(`/reward/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-300 flex items-center justify-center">
        <p className="text-sm font-bold animate-pulse">Loading restaurant...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Website Currently Unavailable</h2>
        <p className="text-xs text-stone-500 max-w-sm">{error || "Please check back later."}</p>
        <Link href={`/m/${slug}`}>
          <Button size="sm">Open Digital Menu &rarr;</Button>
        </Link>
      </div>
    );
  }

  const { restaurant, template, sections } = data;

  // Template styling classes
  const isTraditional = template === "TRADITIONAL";
  const isMinimal = template === "MINIMAL";

  const themeBg = isTraditional ? "bg-stone-950 text-stone-200" : isMinimal ? "bg-white text-stone-900" : "bg-[#faf8f5] text-stone-900";
  const cardBg = isTraditional ? "bg-stone-900 border-amber-900/40 text-stone-100" : isMinimal ? "bg-stone-50 border-stone-200" : "bg-white border-stone-200";

  return (
    <div className={`min-h-screen ${themeBg} font-sans selection:bg-brand-500 selection:text-white`}>
      {/* Navigation Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b ${
          isTraditional
            ? "bg-stone-950/80 border-stone-800"
            : "bg-white/80 border-stone-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover border border-stone-300 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xl font-black tracking-tight">{restaurant.name}</span>
              <span className="block text-[10px] text-stone-400 -mt-1 font-semibold">
                {restaurant.city || "Fine Dine & Bistro"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/m/${restaurant.slug}`}>
              <Button size="sm" className="font-bold shadow-md shadow-brand-500/20">
                <UtensilsCrossed className="w-4 h-4 mr-1.5" />
                View Menu & Order
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {restaurant.cover && (
          <div className="absolute inset-0 z-0">
            <img
              src={restaurant.cover}
              alt={restaurant.name}
              className="w-full h-full object-cover opacity-20 filter blur-xs"
            />
            <div
              className={`absolute inset-0 ${
                isTraditional
                  ? "bg-gradient-to-b from-stone-950/90 via-stone-950/95 to-stone-950"
                  : "bg-gradient-to-b from-[#faf8f5]/80 via-[#faf8f5]/95 to-[#faf8f5]"
              }`}
            />
          </div>
        )}

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
          {sections.hero.badge && (
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 font-extrabold text-xs uppercase tracking-widest shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{sections.hero.badge}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.12]">
            {sections.hero.headline}
          </h1>

          <p className="text-base sm:text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
            {sections.hero.subheadline}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`/m/${restaurant.slug}`}>
              <Button size="lg" className="px-8 py-4 font-black text-base shadow-lg shadow-brand-500/25">
                {sections.hero.ctaText || "Explore Our Menu"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Us Story Section */}
      <section className="py-16 border-t border-stone-200/40">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4">
            <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
              Authentic Tradition
            </span>
            <h2 className="text-3xl font-black">{sections.about.title}</h2>
            <p className="text-stone-500 leading-relaxed text-sm sm:text-base">
              {sections.about.story}
            </p>
          </div>

          <div className="md:col-span-5">
            <div className={`p-6 rounded-3xl border shadow-soft space-y-3 ${cardBg}`}>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                ★
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Chef&apos;s Recommendation
              </span>
              <h3 className="text-lg font-black">{sections.about.signatureDish}</h3>
              <p className="text-xs text-stone-400">
                Prepared with our signature slow charcoal dum technique. A guest favorite since opening.
              </p>
              <div className="pt-2">
                <Link
                  href={`/m/${restaurant.slug}`}
                  className="text-xs font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                >
                  Order on digital menu &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery Grid */}
      {sections.gallery && sections.gallery.length > 0 && (
        <section className="py-16 border-t border-stone-200/40">
          <div className="max-w-6xl mx-auto px-4 space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
                Visual Feast
              </span>
              <h2 className="text-3xl font-black mt-1">Our Culinary Gallery</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {sections.gallery.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl overflow-hidden aspect-square border border-stone-200/60 shadow-soft hover:scale-[1.02] transition-transform"
                >
                  <img
                    src={imgUrl}
                    alt={`Culinary Dish ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Opening Hours & Contact */}
      <section className="py-16 border-t border-stone-200/40">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Hours Card */}
          <div className={`p-8 rounded-3xl border shadow-soft space-y-4 ${cardBg}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black">Opening Hours</h3>
                <span className="text-xs text-stone-400">Dine-in and Takeaway</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 text-sm">
              <div className="flex justify-between py-1 border-b border-stone-100/10">
                <span className="text-stone-400">Monday – Friday:</span>
                <span className="font-bold">{sections.hours.weekday}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100/10">
                <span className="text-stone-400">Saturday – Sunday:</span>
                <span className="font-bold">{sections.hours.weekend}</span>
              </div>
            </div>

            {sections.hours.note && (
              <p className="text-xs text-brand-600 font-semibold pt-2">
                ✨ {sections.hours.note}
              </p>
            )}
          </div>

          {/* Contact & Address Card */}
          <div className={`p-8 rounded-3xl border shadow-soft space-y-4 ${cardBg}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black">Visit & Connect</h3>
                <span className="text-xs text-stone-400">Reservations & Location</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-sm text-stone-400">
              {sections.contact.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 shrink-0 text-brand-600 mt-0.5" />
                  <span>{sections.contact.address}</span>
                </div>
              )}
              {sections.contact.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 text-brand-600" />
                  <a href={`tel:${sections.contact.phone}`} className="hover:underline">
                    {sections.contact.phone}
                  </a>
                </div>
              )}
              {sections.contact.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 shrink-0 text-brand-600" />
                  <a href={`mailto:${sections.contact.email}`} className="hover:underline">
                    {sections.contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`py-12 border-t text-xs text-center ${
          isTraditional ? "bg-black border-stone-900 text-stone-500" : "bg-stone-100 border-stone-200 text-stone-500"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p className="font-bold text-stone-800">
            © {new Date().getFullYear()} {restaurant.name}. All rights reserved.
          </p>
          <p className="text-[11px] text-stone-400">
            Powered by MenuMitra Smart Restaurant Platform
          </p>
        </div>
      </footer>

      {/* GOOGLE REVIEW POPUP (Matches public menu) */}
      {showReviewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-white text-stone-900 rounded-3xl p-6 shadow-soft-lg text-center space-y-4 border border-brand-200">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-500 to-amber-400 text-white flex items-center justify-center mx-auto shadow-md">
              <Gift className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full mb-2">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Win a Scratch Card Reward!
              </div>
              <h3 className="text-xl font-black text-stone-900 leading-snug">
                Enjoyed Your Visit to {restaurant.name}?
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Post your 5-star Google review and scratch to win a discount coupon for your next meal! 🎁
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleReviewClick}
                className="w-full py-3 text-xs font-black shadow-md shadow-brand-500/25 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                Review on Google & Scratch Card
              </Button>

              <button
                onClick={dismissReviewPopup}
                className="text-xs text-stone-400 hover:text-stone-600 font-semibold py-1.5 block mx-auto"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

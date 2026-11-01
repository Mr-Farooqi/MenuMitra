"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Globe,
  Sparkles,
  Upload,
  Check,
  ExternalLink,
  Eye,
  Save,
  Clock,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/ui/feature-gate";

interface WebsiteSections {
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
}

export default function WebsiteBuilderPage() {
  const [userFeatures, setUserFeatures] = useState<string[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Form State
  const [template, setTemplate] = useState<"MODERN" | "TRADITIONAL" | "MINIMAL">("MODERN");
  const [published, setPublished] = useState<boolean>(true);
  const [sections, setSections] = useState<WebsiteSections>({
    hero: {
      headline: "Authentic North Indian Charcoal Flavours in Mumbai",
      subheadline: "Experience wood-fired kebabs, slow-simmered curries, and warm hospitality.",
      ctaText: "Explore Our Menu",
      badge: "Awarded Best Mughlai 2024",
    },
    about: {
      title: "Our Culinary Story",
      story: "Founded by passionate master chefs, we roast every spice in-house and slow-simmer curries over glowing charcoal.",
      signatureDish: "24-Hour Slow Charcoal Dal Makhani Royale",
    },
    hours: {
      weekday: "12:00 PM – 11:30 PM",
      weekend: "11:30 AM – 12:00 Midnight",
      note: "Happy Hours: 4 PM to 7 PM on weekdays",
    },
    contact: {
      phone: "+91 98765 43210",
      email: "reservations@restaurant.com",
      address: "45, Khau Galli, Opp. Royal Plaza, MG Road",
    },
    gallery: [],
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Load Website Config
  useEffect(() => {
    async function init() {
      try {
        const [meRes, webRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/website"),
        ]);
        const meData = await meRes.json();
        const webData = await webRes.json();

        if (meData.user?.restaurant) {
          setUserFeatures(meData.user.restaurant.features || []);
          setRestaurantSlug(meData.user.restaurant.slug);
          setRestaurantName(meData.user.restaurant.name);
        }

        if (webData.config) {
          setTemplate(webData.config.template || "MODERN");
          setPublished(webData.config.published);
          if (webData.config.sectionsData) {
            setSections((prev) => ({
              ...prev,
              ...webData.config.sectionsData,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load website settings", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/website", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          published,
          sections,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGallery(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "gallery");

      const res = await fetch("/api/upload", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setSections((prev) => ({
        ...prev,
        gallery: [...(prev.gallery || []), result.url],
      }));
    } catch (err: unknown) {
      console.warn("Upload to server failed, using local FileReader fallback:", err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSections((prev) => ({
            ...prev,
            gallery: [...(prev.gallery || []), reader.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      if (e.target) e.target.value = "";
      setUploadingGallery(false);
    }
  };

  const removeGalleryPhoto = (index: number) => {
    setSections((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-400">Loading website builder...</div>;
  }

  return (
    <FeatureGate feature="website" features={userFeatures}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Website Builder
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Customize your restaurant&apos;s branded mini-site, choose themes, and publish instantly
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/r/${restaurantSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors bg-white shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>View Live Website</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>

            <Button
              onClick={handleSave}
              isLoading={saving}
              className="font-bold shadow-md shadow-brand-500/25"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-300" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" /> Save & Publish
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Publish Status & Tab Toggle */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
            <div>
              <p className="text-xs font-bold text-stone-900">
                Website Status:{" "}
                <span className={published ? "text-emerald-600 font-extrabold" : "text-stone-400"}>
                  {published ? "Published & Live Online" : "Draft / Private"}
                </span>
              </p>
              <p className="text-[11px] text-stone-400">
                Public URL: <span className="font-mono text-brand-700">menumitra.com/r/{restaurantSlug}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setPreviewTab("edit")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                previewTab === "edit" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setPreviewTab("preview")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                previewTab === "preview" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              Live Preview
            </button>
          </div>
        </div>

        {previewTab === "edit" ? (
          <div className="space-y-6">
            {/* Template Selector */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4">
              <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider text-stone-500">
                1. Choose Design Template
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Modern Bistro */}
                <div
                  onClick={() => setTemplate("MODERN")}
                  className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                    template === "MODERN"
                      ? "border-brand-500 bg-brand-50/30 shadow-sm"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-stone-900 text-sm">Modern Bistro</h4>
                    {template === "MODERN" && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Warm amber gradients, clean cards, modern typography, and soft culinary shadows.
                  </p>
                </div>

                {/* Traditional Royal */}
                <div
                  onClick={() => setTemplate("TRADITIONAL")}
                  className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                    template === "TRADITIONAL"
                      ? "border-brand-500 bg-brand-50/30 shadow-sm"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-stone-900 text-sm">Traditional Royal</h4>
                    {template === "TRADITIONAL" && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Heritage Mughlai styling, dark charcoal backdrop, saffron accents, and ornate borders.
                  </p>
                </div>

                {/* Minimal Zen */}
                <div
                  onClick={() => setTemplate("MINIMAL")}
                  className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                    template === "MINIMAL"
                      ? "border-brand-500 bg-brand-50/30 shadow-sm"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-stone-900 text-sm">Minimalist Cafe</h4>
                    {template === "MINIMAL" && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Airy whitespace, bold headline typography, clean monochrome accents, and focus on photos.
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4">
              <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider text-stone-500">
                2. Hero Banner Content
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={sections.hero.badge}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        hero: { ...sections.hero, badge: e.target.value },
                      })
                    }
                    placeholder="e.g. Awarded Best Dining 2024"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={sections.hero.ctaText}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        hero: { ...sections.hero, ctaText: e.target.value },
                      })
                    }
                    placeholder="e.g. View Digital Menu"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Headline</label>
                <input
                  type="text"
                  value={sections.hero.headline}
                  onChange={(e) =>
                    setSections({
                      ...sections,
                      hero: { ...sections.hero, headline: e.target.value },
                    })
                  }
                  placeholder="Catchy welcome headline"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Subheadline</label>
                <textarea
                  rows={2}
                  value={sections.hero.subheadline}
                  onChange={(e) =>
                    setSections({
                      ...sections,
                      hero: { ...sections.hero, subheadline: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4">
              <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider text-stone-500">
                3. About Our Story & Signature Dish
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">About Section Title</label>
                  <input
                    type="text"
                    value={sections.about.title}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        about: { ...sections.about, title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Signature Dish Highlight</label>
                  <input
                    type="text"
                    value={sections.about.signatureDish}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        about: { ...sections.about, signatureDish: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-bold text-brand-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Restaurant Story</label>
                <textarea
                  rows={3}
                  value={sections.about.story}
                  onChange={(e) =>
                    setSections({
                      ...sections,
                      about: { ...sections.about, story: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>
            </div>

            {/* Opening Hours & Contact */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4">
              <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider text-stone-500">
                4. Operating Hours & Contact Info
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Weekday Hours</label>
                  <input
                    type="text"
                    value={sections.hours.weekday}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        hours: { ...sections.hours, weekday: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Weekend Hours</label>
                  <input
                    type="text"
                    value={sections.hours.weekend}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        hours: { ...sections.hours, weekend: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Happy Hours Note</label>
                  <input
                    type="text"
                    value={sections.hours.note}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        hours: { ...sections.hours, note: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={sections.contact.phone}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        contact: { ...sections.contact, phone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
                  <input
                    type="text"
                    value={sections.contact.email}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        contact: { ...sections.contact, email: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={sections.contact.address}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        contact: { ...sections.contact, address: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider text-stone-500">
                  5. Photo Gallery Showcase ({sections.gallery?.length || 0})
                </h3>

                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={uploadingGallery}
                    onClick={() => galleryInputRef.current?.click()}
                    className="cursor-pointer font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Photo
                  </Button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleGalleryUpload}
                  />
                </div>
              </div>

              {sections.gallery && sections.gallery.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sections.gallery.map((photo, pIdx) => (
                    <div key={pIdx} className="relative group rounded-2xl overflow-hidden aspect-video border border-stone-200">
                      <img src={photo} alt={`Gallery ${pIdx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeGalleryPhoto(pIdx)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">No photos in gallery yet. Click &apos;Add Photo&apos; to showcase your ambiance and dishes!</p>
              )}
            </div>
          </div>
        ) : (
          /* Live Preview Embedded iframe / view */
          <div className="bg-stone-900 p-4 rounded-3xl shadow-soft-lg">
            <div className="flex items-center justify-between text-xs text-stone-400 pb-3 border-b border-stone-800">
              <span className="font-mono">Preview: menumitra.com/r/{restaurantSlug}</span>
              <span className="font-bold text-amber-400 uppercase">Template: {template}</span>
            </div>
            <div className="mt-3 rounded-2xl overflow-hidden bg-white h-[650px]">
              <iframe
                src={`/r/${restaurantSlug}`}
                className="w-full h-full border-0"
                title="Website Preview"
              />
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Globe,
  Clock,
  ShieldCheck,
  Zap,
  Gift,
  HelpCircle,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "MenuMitra";

  const faqs = [
    {
      q: "How does MenuMitra help my restaurant get more Google reviews?",
      a: "Our Premium plan gives your guests a fun scratch card reward after they leave a review. When they upload a review screenshot, our automated duplicate-checking engine validates it and reveals their discount coupon. Customers love winning rewards, and you gain real 5-star Google ratings!",
    },
    {
      q: "Do my dining guests need to download an app or sign up?",
      a: "No! Guests simply open their phone camera, point it at the table QR code, and your beautiful menu loads instantly in any mobile browser with zero app installation.",
    },
    {
      q: "Can I manage different prices or table numbers?",
      a: "Yes! You can generate distinct QR codes for Table 1 through Table N. When guests scan their table's QR, orders automatically sync to your Kitchen Kanban board tagged with their exact table number.",
    },
    {
      q: "Can I upgrade or downgrade my package anytime?",
      a: "Absolutely. You can start on Basic for a simple QR menu and upgrade to Standard (online ordering & website) or Premium (review rewards) from your billing tab at any time.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 selection:bg-brand-500 selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-brand-900 text-brand-100 text-xs py-2 px-4 text-center font-medium">
        🎉 <span className="font-semibold text-white">Smart Restaurant OS:</span> Digital QR Menu, Live Kitchen Orders & Google Review Rewards.{" "}
        <Link
          href="/register"
          className="underline font-bold text-amber-300 hover:text-white ml-1 inline-flex items-center gap-1"
        >
          Register Your Restaurant &rarr;
        </Link>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 py-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-soft shadow-brand-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-stone-900">
                {appName.slice(0, 4)}
                <span className="text-brand-500">{appName.slice(4)}</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 -mt-1">
                Restaurant Growth OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#how-it-works" className="hover:text-brand-600 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-brand-600 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-brand-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-brand-600 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Owner Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="shadow-md shadow-brand-500/25">
                Register Restaurant
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-brand-50/60 via-[#faf8f5] to-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Chakh ke dekho digital ka naya maza</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.12]">
              Smart QR Menu, Online Orders &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-amber-500">
                Google Review Rewards
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-stone-600 font-normal leading-relaxed">
              Empower your restaurant with contactless QR dining, instant kitchen ordering, a stunning mini-website, and gamified scratch card rewards that turn diners into loyal 5-star Google reviewers.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 py-4 shadow-lg shadow-brand-500/25">
                  Register Your Restaurant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-4 border-stone-300 hover:bg-stone-50"
                >
                  Owner Login
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 text-xs text-stone-500 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>Setup in under 5 minutes</span>
              </div>
            </div>
          </div>

          {/* Hero Banner Showcase */}
          <div className="mt-14 relative max-w-5xl mx-auto rounded-3xl p-3 bg-gradient-to-b from-brand-200 to-stone-200 shadow-soft-lg">
            <div className="bg-white rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Feature 1 */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Smart Table QR</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Table-wise QR codes. Zero menu printing costs, instant price updates.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Kitchen Kanban & KOT</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Live orders routed straight to your chef with sound alert & printable tickets.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-2xl bg-red-50/70 border border-red-100 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Scratch Card Rewards</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Reward Google reviews with discounts. Verified by AI duplicate hash check.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-2">
              Kaise Kaam Karta Hai MenuMitra?
            </h2>
            <p className="text-stone-600 mt-3 text-base">
              From onboarding your menu in minutes to collecting hundreds of 5-star Google reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative p-8 rounded-3xl bg-stone-50 border border-stone-200/80 hover:border-brand-300 transition-all shadow-soft group">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 font-black text-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Create Digital Menu & QR</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Add your mouthwatering dishes, prices, veg/non-veg tags, and photos. Download customized table QR codes or printable table tents with your restaurant branding.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-8 rounded-3xl bg-stone-50 border border-stone-200/80 hover:border-brand-300 transition-all shadow-soft group">
              <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white font-black text-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Guests Scan & Place Orders</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Customers scan the table QR on their phone. They browse your menu with veg filters, add special notes, and place orders directly to your kitchen Kanban screen.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-8 rounded-3xl bg-stone-50 border border-stone-200/80 hover:border-brand-300 transition-all shadow-soft group">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-stone-900 font-black text-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Scratch Card Review Rewards</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                A gentle prompt invites diners to post a Google review. Once they upload their review screenshot, an interactive scratch card reveals a discount coupon for their next visit!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section id="pricing" className="py-20 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
              Flexible Subscriptions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-2">
              Khushiyo Bhari Bachat, Transparent Pricing
            </h2>
            <p className="text-stone-600 mt-3 text-base">
              Choose the package that fits your stage. Upgrade or downgrade anytime with 1-click.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Basic Plan */}
            <div className="rounded-3xl p-8 bg-white border border-stone-200 flex flex-col justify-between hover:shadow-soft transition-all">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Starter
                </span>
                <h3 className="text-2xl font-black text-stone-900 mt-1">BASIC</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-stone-900">₹499</span>
                  <span className="text-sm text-stone-500 font-medium">/month</span>
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  Best for cafes and eateries wanting a clean contactless digital QR menu.
                </p>

                <div className="mt-8 space-y-3.5 border-t border-stone-100 pt-6">
                  <div className="flex items-center gap-3 text-sm text-stone-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Digital Menu (Categories & Items)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Table-wise QR Studio & PDF Export</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Veg / Non-Veg Badges & Item Tags</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-400">
                    <span className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 font-bold shrink-0">
                      ✕
                    </span>
                    <span className="line-through">Online Table Ordering & KOT</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-400">
                    <span className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 font-bold shrink-0">
                      ✕
                    </span>
                    <span className="line-through">Custom Mini-Website Builder</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-400">
                    <span className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 font-bold shrink-0">
                      ✕
                    </span>
                    <span className="line-through">Google Review Scratch & Win</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6">
                <Link href="/register?plan=basic" className="block">
                  <Button variant="outline" className="w-full font-bold">
                    Choose Basic
                  </Button>
                </Link>
              </div>
            </div>

            {/* Standard Plan */}
            <div className="rounded-3xl p-8 bg-white border-2 border-brand-300 relative flex flex-col justify-between shadow-soft-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                Most Popular
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  Growth
                </span>
                <h3 className="text-2xl font-black text-stone-900 mt-1">STANDARD</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-stone-900">₹1,499</span>
                  <span className="text-sm text-stone-500 font-medium">/month</span>
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  Ideal for busy dine-in restaurants wanting streamlined table ordering & a website.
                </p>

                <div className="mt-8 space-y-3.5 border-t border-stone-100 pt-6">
                  <div className="flex items-center gap-3 text-sm text-stone-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Everything in Basic</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-700 font-semibold text-brand-700">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Online Table Ordering from Menu</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-700 font-semibold text-brand-700">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Live Kitchen Kanban & Printable KOT</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-700 font-semibold text-brand-700">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Mini-Website Builder (3 Themes)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Customer Order Tracking Screen</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-400">
                    <span className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 font-bold shrink-0">
                      ✕
                    </span>
                    <span className="line-through">Google Review Scratch & Win</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6">
                <Link href="/register?plan=standard" className="block">
                  <Button className="w-full font-bold shadow-md shadow-brand-500/20">
                    Choose Standard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="rounded-3xl p-8 bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-amber-300 flex flex-col justify-between hover:shadow-soft transition-all">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Full Power Suite
                </span>
                <h3 className="text-2xl font-black text-stone-900 mt-1">PREMIUM</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-stone-900">₹2,999</span>
                  <span className="text-sm text-stone-500 font-medium">/month</span>
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  For top restaurants looking to dominate Google rankings and drive repeat walk-ins.
                </p>

                <div className="mt-8 space-y-3.5 border-t border-amber-200/60 pt-6">
                  <div className="flex items-center gap-3 text-sm text-stone-800 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Everything in Standard</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-brand-900 font-bold">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Google Review Scratch & Win Engine</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-brand-900 font-bold">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>AI Duplicate Screenshot Hash Prevention</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-brand-900 font-bold">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Weighted Reward Rules & Discount Coupons</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-800 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Staff POS Coupon Redemption Screen</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-800 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited Scans & Lifetime Scan Analytics</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6">
                <Link href="/register?plan=premium" className="block">
                  <Button className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20">
                    Get Premium Suite
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
              Real Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-2">
              Loved by 500+ Indian Restaurateurs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-stone-700 text-sm leading-relaxed italic">
                &ldquo;Our Google reviews jumped from 140 to 820 in just two months! The scratch card reward gives customers an instant dopamine hit, and our staff loves how easy it is to verify coupons.&rdquo;
              </p>
              <div className="pt-2 border-t border-stone-100">
                <p className="font-bold text-stone-900 text-sm">Vikram Oberoi</p>
                <p className="text-xs text-stone-500">Founder, Tandoori Nights — Mumbai</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-stone-700 text-sm leading-relaxed italic">
                &ldquo;Printing menus every time we changed a dish price was costing us ₹15,000 every quarter. MenuMitra lets us edit prices in 5 seconds from the phone, and orders go directly to our kitchen screen.&rdquo;
              </p>
              <div className="pt-2 border-t border-stone-100">
                <p className="font-bold text-stone-900 text-sm">Gurpreet Singh</p>
                <p className="text-xs text-stone-500">Partner, Dilli Chaat Bhandar — Delhi</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-stone-700 text-sm leading-relaxed italic">
                &ldquo;The mini website was ready in 10 minutes. Guests coming from Instagram immediately check our hours, map, and menu before reserving tables. Best investment for our cafe.&rdquo;
              </p>
              <div className="pt-2 border-t border-stone-100">
                <p className="font-bold text-stone-900 text-sm">Ananya Rao</p>
                <p className="text-xs text-stone-500">Owner, The Roastery Cafe — Bengaluru</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
              Have Questions?
            </span>
            <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-stone-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-stone-900 hover:bg-stone-50 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-brand-500 shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-stone-400 transition-transform ${
                      openFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-stone-600 text-sm leading-relaxed border-t border-stone-100 bg-stone-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-brand-600 to-amber-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-black">Ready to Supercharge Your Restaurant?</h2>
          <p className="mt-3 text-amber-100 text-base max-w-xl mx-auto">
            Join hundreds of thriving restaurants. Get your smart QR menu and review growth engine running today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-stone-900 hover:bg-stone-100 font-extrabold px-8">
                Register Your Restaurant Now
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="border-white/40 text-white hover:bg-white/10"
              >
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 text-xs py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-base">{appName}</span>
            <span className="text-stone-500">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <Link href="/login" className="hover:text-white transition-colors">
              Owner Login
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

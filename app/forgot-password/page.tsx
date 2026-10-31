"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-soft">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <span className="text-3xl font-black text-stone-900">
            Menu<span className="text-brand-500">Mitra</span>
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-extrabold text-stone-900">
          Reset Your Password
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Enter your registered email and we’ll dispatch a secure reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-soft border border-stone-200">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">Reset Link Dispatched!</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                If an account matches <strong>{email}</strong>, a password reset link has been generated.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900">
                <span className="font-bold">Developer Notice:</span> In development mode, the reset token and link have also been logged directly to your terminal console!
              </div>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-stone-900"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-3 text-sm font-bold shadow-md shadow-brand-500/25 mt-2"
              >
                Send Reset Link
              </Button>

              <div className="pt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

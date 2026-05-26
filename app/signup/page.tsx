"use client";

import { useState, FormEvent } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import Link from "next/link";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || password !== confirmPassword) return;

    setIsSubmitting(true);
    // Mock registration delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow flex items-center justify-center py-20 px-margin-mobile">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 md:p-12 rounded-[32px] soft-lift border border-outline-variant/10 animate-fade-in">
          <div className="text-center mb-8">
            <span className="font-serif text-3xl font-bold text-primary italic">Revela</span>
            <h1 className="text-2xl font-serif font-bold text-on-surface mt-4">Create Your Account</h1>
            <p className="text-sm text-on-surface-variant mt-2">
              Start preserving your life&apos;s most cherished memories.
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center py-8 flex flex-col items-center justify-center animate-fade-in">
              <span className="material-symbols-outlined text-green-600 text-5xl mb-4">check_circle</span>
              <h2 className="text-xl font-serif font-bold text-on-surface mb-2">Registration Complete</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6 font-sans">
                Your account was created successfully. Let&apos;s get you signed in.
              </p>
              <Link
                href="/login"
                className="bg-primary text-on-primary font-sans font-semibold text-sm px-8 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all text-center block"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                  placeholder="hello@domain.com"
                />
              </div>

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Password
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Confirm Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-surface-bright border-none ring-1 rounded-xl px-4 py-3.5 focus:ring-2 quint-ease outline-none text-sm font-sans ${
                    confirmPassword && password !== confirmPassword
                      ? "ring-red-300 focus:ring-red-400"
                      : "ring-outline-variant/30 focus:ring-primary"
                  }`}
                  placeholder="••••••••"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-red-500 font-sans px-1">Passwords do not match</p>
                )}
              </div>

              <div className="flex items-start gap-2 px-1">
                <input
                  required
                  type="checkbox"
                  id="agree"
                  className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 mt-0.5 cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-on-surface-variant font-sans cursor-pointer select-none leading-relaxed">
                  I agree to the{" "}
                  <a href="#" className="text-primary font-semibold hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary font-semibold hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <button
                disabled={isSubmitting || (confirmPassword !== "" && password !== confirmPassword)}
                type="submit"
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-sans font-semibold text-sm hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    Creating Account...
                  </>
                ) : (
                  "Create Your Archive"
                )}
              </button>

              <div className="text-center pt-4 border-t border-outline-variant/10 text-xs text-on-surface-variant font-sans">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

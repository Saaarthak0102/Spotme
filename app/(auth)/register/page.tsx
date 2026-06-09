"use client";

import { useState, FormEvent } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { sanitizeText, validateRegisterForm } from "@/lib/auth-validate";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // ── Client-side validation ──────────────────────────────────────────────
    const cleanName = sanitizeText(fullName);
    const cleanEmail = sanitizeText(email).toLowerCase();

    const validationErrors = validateRegisterForm(cleanName, cleanEmail, password);
    if (validationErrors) {
      setFieldErrors(validationErrors);
      return;
    }
    // ───────────────────────────────────────────────────────────────────────

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (authError) {
        const msg = authError.message?.toLowerCase() ?? "";

        if (msg.includes("invalid email") || msg.includes("unable to validate email")) {
          setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
        } else if (msg.includes("already registered") || msg.includes("user already exists")) {
          setFieldErrors((prev) => ({ ...prev, email: "An account with this email already exists." }));
        } else if (msg.includes("password")) {
          setFieldErrors((prev) => ({ ...prev, password: "Password does not meet requirements." }));
        } else {
          setFieldErrors((prev) => ({ ...prev, general: "Something went wrong. Please try again." }));
        }
        setIsSubmitting(false);
        return;
      }

      // ── Duplicate email detection ─────────────────────────────────────────
      // Supabase's signUp() does NOT error on duplicate emails (to prevent
      // user enumeration). Instead it returns an empty `identities` array.
      // We detect this and show a helpful message rather than falsely claiming
      // the verification email was sent.
      if (data.user && data.user.identities?.length === 0) {
        setFieldErrors((prev) => ({ ...prev, email: "An account with this email already exists." }));
        setIsSubmitting(false);
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      setSuccess(true);
      setIsSubmitting(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const msg = message.toLowerCase();

      if (msg.includes("invalid email") || msg.includes("unable to validate email")) {
        setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      } else if (msg.includes("already registered") || msg.includes("user already exists")) {
        setFieldErrors((prev) => ({ ...prev, email: "An account with this email already exists." }));
      } else if (msg.includes("password")) {
        setFieldErrors((prev) => ({ ...prev, password: "Password does not meet requirements." }));
      } else {
        setFieldErrors((prev) => ({ ...prev, general: "Something went wrong. Please try again." }));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow flex items-center justify-center py-20 px-margin-mobile">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 md:p-12 rounded-[32px] soft-lift border border-outline-variant/10 animate-fade-in">
          <div className="text-center mb-8">
            <span className="font-serif text-3xl font-bold text-primary italic">Spotme</span>
            <h1 className="text-2xl font-serif font-bold text-on-surface mt-4">Create your account</h1>
            <p className="text-sm text-on-surface-variant mt-2">
              Start preserving your event memories today.
            </p>
          </div>

          {success ? (
            <div className="text-center py-8 flex flex-col items-center justify-center animate-fade-in">
              <span className="material-symbols-outlined text-primary text-5xl mb-4">mark_email_read</span>
              <h2 className="text-xl font-serif font-bold text-on-surface mb-2">Verify your email</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                We&apos;ve sent a verification link to <strong className="text-primary">{sanitizeText(email).toLowerCase()}</strong>. Please check your inbox and follow the instructions to verify your account.
              </p>
              <div className="text-xs text-on-surface-variant border-t border-outline-variant/10 pt-4 w-full mb-6">
                Didn&apos;t receive the email? Check your spam folder or try signing up again.
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {fieldErrors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in flex gap-2 items-start">
                  <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">warning</span>
                  <span>{fieldErrors.general}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={200}
                  autoComplete="name"
                  className={`w-full bg-surface-bright border-none ring-1 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans ${
                    fieldErrors.fullName ? "ring-red-400" : "ring-outline-variant/30"
                  }`}
                  placeholder="Your full name"
                />
                {fieldErrors.fullName && (
                  <p className="text-red-600 text-xs px-1">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  maxLength={320}
                  autoComplete="email"
                  className={`w-full bg-surface-bright border-none ring-1 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans ${
                    fieldErrors.email ? "ring-red-400" : "ring-outline-variant/30"
                  }`}
                  placeholder="hello@domain.com"
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-xs px-1">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className={`w-full bg-surface-bright border-none ring-1 rounded-xl pl-4 pr-11 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans ${
                      fieldErrors.password ? "ring-red-400" : "ring-outline-variant/30"
                    }`}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface flex items-center justify-center p-1 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-red-600 text-xs px-1">{fieldErrors.password}</p>
                ) : (
                  <p className="text-xs text-on-surface-variant px-1">
                    Minimum 8 characters
                  </p>
                )}
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-sans font-semibold text-sm hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="text-center pt-4 border-t border-outline-variant/10 text-xs text-on-surface-variant font-sans">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Sign in
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

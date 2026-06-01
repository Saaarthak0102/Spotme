"use client";

import { useState, FormEvent, useEffect } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const handleRecovery = async () => {
      try {
        const supabase = createClient();
        
        // 1. Check if there is a code in the URL query parameters (PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          setIsVerifying(true);
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setSessionError("This password reset link has expired or is no longer valid. Please request a new one.");
          }
          setIsVerifying(false);
        } else {
          // 2. If no code, check if we have a session (either already loaded or from hash fragment parsed by the client)
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                setSessionError("You must access this page through a valid password reset link.");
              }
              setIsVerifying(false);
            } catch {
              setSessionError("Something went wrong while verifying your session. Please request a new reset link.");
              setIsVerifying(false);
            }
          }, 800);
        }
      } catch {
        setSessionError("Something went wrong. Please request a new password reset link.");
        setIsVerifying(false);
      }
    };

    handleRecovery();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError) {
        setError(getAuthErrorMessage(authError.message, "Unable to update your password. Please try again."));
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);

      // Redirect to dashboard after a short success message
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.message, "Something went wrong while updating your password. Please try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow flex items-center justify-center py-20 px-margin-mobile">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 md:p-12 rounded-[32px] soft-lift border border-outline-variant/10 animate-fade-in">
          <div className="text-center mb-8">
            <span className="font-serif text-3xl font-bold text-primary italic">Revela</span>
            <h1 className="text-2xl font-serif font-bold text-on-surface mt-4">New password</h1>
            <p className="text-sm text-on-surface-variant mt-2">
              Create a strong new password for your account.
            </p>
          </div>

          {isVerifying ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2D2D2D]/10 border-t-[#D67D5C]" />
              <p className="text-sm text-[#827970]">Initializing password reset session...</p>
            </div>
          ) : sessionError ? (
            <div className="text-center py-8 flex flex-col items-center justify-center animate-fade-in">
              <span className="material-symbols-outlined text-red-600 text-5xl mb-4">error</span>
              <h2 className="text-xl font-serif font-bold text-on-surface mb-2">Invalid Session</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                {sessionError}
              </p>
              <Link 
                href="/forgot-password" 
                className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
              >
                Request a new password reset link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-8 flex flex-col items-center justify-center animate-fade-in">
              <span className="material-symbols-outlined text-green-600 text-5xl mb-4">check_circle</span>
              <h2 className="text-xl font-serif font-bold text-on-surface mb-2">Password Updated!</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Your password has been changed. Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="font-sans font-semibold text-xs text-on-surface-variant px-1 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl pl-4 pr-11 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface flex items-center justify-center p-1 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-sans font-semibold text-sm hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    Saving Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

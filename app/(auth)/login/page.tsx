"use client";

import { useState, FormEvent, useEffect } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage, getUrlAuthErrorMessage } from "@/lib/auth-errors";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      const urlErrorDesc = params.get("error_description");
      if (urlError) {
        const friendlyMessage = getUrlAuthErrorMessage(urlError, urlErrorDesc);
        if (friendlyMessage) setError(friendlyMessage);
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(getAuthErrorMessage(authError.message));
        setIsSubmitting(false);
        return;
      }

      // Redirect to dashboard on success
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.message, "Something went wrong during sign in. Please try again."));
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
            <h1 className="text-2xl font-serif font-bold text-on-surface mt-4">Welcome Back</h1>
            <p className="text-sm text-on-surface-variant mt-2">
              Sign in to manage your memories and galleries.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-sm rounded-2xl p-4 flex gap-3 items-start animate-fade-in">
                <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0 mt-0.5">warning</span>
                <div className="flex-1">
                  <>
                    <h4 className="font-semibold text-red-900 mb-0.5">Sign In Failed</h4>
                    <p className="text-red-700 text-xs">{error}</p>
                  </>
                </div>
              </div>
            )}

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
              <div className="flex justify-between items-center px-1">
                <label className="font-sans font-semibold text-xs text-on-surface-variant block">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl pl-4 pr-11 py-3.5 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                  placeholder="••••••••"
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
            </div>

            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="remember"
                className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="remember" className="text-xs text-on-surface-variant font-sans cursor-pointer select-none">
                Keep me signed in on this device
              </label>
            </div>

            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-sans font-semibold text-sm hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  Signing in...
                </>
              ) : (
                "Sign In to Archive"
              )}
            </button>

            <div className="text-center pt-4 border-t border-outline-variant/10 text-xs text-on-surface-variant font-sans">
              New to Revela?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Create an account
              </Link>
            </div>
          </form>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

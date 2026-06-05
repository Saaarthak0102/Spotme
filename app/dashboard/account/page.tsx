"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardShell, PageHeading } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth-validate";



function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px] text-[#D67D5C]">{icon}</span>
      <h2 className="text-lg font-semibold tracking-tight text-[#2D2D2D]">{title}</h2>
    </div>
  );
}

/* ─── change plan modal ─── */
function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: "free" | "pro" | "unlimited";
  onUpdated: () => void;
}) {
  const plans = [
    {
      id: "free",
      name: "Starter",
      price: "₹0",
      period: "Free forever",
      desc: "For casual photographers at small events.",
      features: ["1 Active Event", "10 GB Cloud Storage", "AI Face Matching", "Dynamic QR Access"]
    },
    {
      id: "pro",
      name: "Personal Pro",
      price: "₹999",
      period: "/month",
      desc: "For full-time freelance photographers.",
      features: ["Up to 10 Events", "100 GB Cloud Storage", "AI Face Matching", "Privacy Mode", "Priority AI Processing", "Custom Branding"]
    },
    {
      id: "unlimited",
      name: "Studio",
      price: "₹2,499",
      period: "/month",
      desc: "For studios managing high-volume events.",
      features: ["Unlimited Events", "500 GB Cloud Storage", "Branded Galleries", "Priority Support", "Multi-Photographer Workflows"]
    },
  ];

  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
  const [loading, setLoading] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    setSelectedPlan(currentPlan);
  }, [currentPlan, isOpen]);

  if (!isOpen) return null;

  // Load Razorpay Checkout dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpdate = async () => {
    if (selectedPlan === currentPlan) {
      alert("This is already your active plan tier.");
      onClose();
      return;
    }

    setLoading(true);

    // ── Free downgrade: no payment needed ─────────────────────────────────
    if (selectedPlan === "free") {
      try {
        const res = await fetch("/api/payments/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "free" }),
        });
        if (!res.ok) throw new Error();
        alert("Plan changed to Starter (Free).");
        onUpdated();
        onClose();
      } catch {
        alert("Failed to change plan. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Paid upgrade: create server-side Razorpay order first ─────────────
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!orderRes.ok) throw new Error("Failed to initiate payment.");
      const orderData = await orderRes.json();

      // If Razorpay is not configured on the server → sandbox simulator
      if (orderData.sandbox) {
        setLoading(false);
        setShowSimulator(true);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setLoading(false);
        setShowSimulator(true);
        return;
      }

      const planLabelMap: Record<string, string> = {
        pro: "Personal Pro Plan",
        unlimited: "Studio Plan",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: any = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId, // Real order ID from Razorpay
        name: "Spotme Photos",
        description: planLabelMap[selectedPlan] || "Plan Upgrade",
        theme: { color: "#D67D5C" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          setLoading(true);
          try {
            const upgradeRes = await fetch("/api/payments/upgrade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                plan: selectedPlan,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!upgradeRes.ok) throw new Error();
            alert(`You are now on the ${planLabelMap[selectedPlan] || selectedPlan} plan!`);
            onUpdated();
            onClose();
          } catch {
            alert("Payment completed but plan update failed. Please contact support with your payment ID.");
          } finally {
            setLoading(false);
          }
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const simulateSuccess = async () => {
    setShowSimulator(false);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan })
      });
      if (!res.ok) throw new Error();
      alert(`[Razorpay Sandbox Simulator] Success! You are now subscribed to the ${selectedPlan.toUpperCase()} tier.`);
      onUpdated();
      onClose();
    } catch (err) {
      alert("Sandbox update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#2D2D2D]/8 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 animate-page-enter">
          <button onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 border border-[#2D2D2D]/6 hover:bg-[#FDF8F1] transition">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">Subscription</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#2D2D2D]">Change your plan</h2>
          <p className="mt-2 text-sm text-[#827970]">Select the pricing plan that best fits your photographer scale.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`flex flex-col text-left p-5 rounded-2xl border transition-all ${
                  selectedPlan === p.id
                    ? "border-[#D67D5C] bg-[#D67D5C]/5 shadow-sm"
                    : "border-[#2D2D2D]/6 bg-white/50 hover:bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <h3 className="font-semibold text-[#2D2D2D]">{p.name}</h3>
                  {currentPlan === p.id && (
                    <span className="text-[10px] bg-[#D67D5C]/12 px-1.5 py-0.5 rounded text-[#B36144] font-semibold">Active</span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#2D2D2D]">{p.price}</span>
                  <span className="text-xs text-[#827970]">{p.period}</span>
                </div>
                <p className="mt-2 text-xs text-[#827970] leading-normal flex-1">{p.desc}</p>
                <ul className="mt-4 space-y-2 border-t border-[#2D2D2D]/5 pt-4 w-full">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px] text-[#574F49]">
                      <span className="material-symbols-outlined text-[13px] text-green-600">check</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[#2D2D2D]/8 bg-white py-3 text-sm font-semibold text-[#574F49] hover:bg-[#FDF8F1] transition">Cancel</button>
            <button onClick={handleUpdate} disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-3 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50">
              {loading ? "Processing Upgrade..." : selectedPlan === currentPlan ? "Current Plan" : "Upgrade Subscription"}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Simulator Modal */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#2D2D2D]/60 backdrop-blur-md" onClick={() => setShowSimulator(false)} />
          <div className="relative w-full max-w-sm rounded-[24px] border border-[#2D2D2D]/8 bg-white p-6 shadow-2xl animate-page-enter">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-[#D67D5C] mb-2">payments</span>
              <h3 className="text-lg font-bold text-[#2D2D2D]">Razorpay Payment Simulator</h3>
              <p className="text-xs text-[#827970] mt-1">
                You are upgrading to the <strong className="capitalize">{selectedPlan} Plan</strong>. Complete simulation below.
              </p>
              <div className="mt-4 rounded-xl bg-[#FDF8F1] p-3 text-left space-y-1.5 text-xs text-[#574F49]">
                <div className="flex justify-between">
                  <span>Merchant:</span> <span className="font-semibold">Spotme Photos</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>{" "}
                  <span className="font-semibold">
                    {selectedPlan === "pro" ? "₹999.00" : "₹2,499.00"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={simulateSuccess}
                className="w-full rounded-xl bg-green-600 hover:bg-green-700 py-3 text-sm font-semibold text-white transition"
              >
                Simulate Successful Payment
              </button>
              <button
                onClick={() => setShowSimulator(false)}
                className="w-full rounded-xl border border-[#2D2D2D]/8 bg-white py-3 text-sm font-semibold text-[#574F49] hover:bg-[#FDF8F1] transition"
              >
                Cancel / Fail Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const focusFirstError = (errs: typeof errors) => {
    if (errs.newPassword && newPasswordRef.current) {
      newPasswordRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      newPasswordRef.current.focus();
    } else if (errs.confirmPassword && confirmPasswordRef.current) {
      confirmPasswordRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      confirmPasswordRef.current.focus();
    }
  };

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const passwordErr = validatePassword(newPassword);
    if (passwordErr) {
      newErrors.newPassword = passwordErr;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    setSubmitError(null);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#2D2D2D]/8 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 animate-page-enter">
        <button onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 border border-[#2D2D2D]/6 hover:bg-[#FDF8F1] transition">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">Security</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#2D2D2D]">Change password</h2>
        <p className="mt-2 text-sm text-[#827970]">Update your account password below.</p>

        <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#574F49]">New Password</label>
            <div className="relative">
              <input
                ref={newPasswordRef}
                type={showPassword ? "text" : "password"}
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); clearError("newPassword"); }}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-[#2D2D2D]/8 bg-white/70 pl-3.5 pr-10 py-2.5 text-xs text-[#2D2D2D] focus:border-[#D67D5C]/40 focus:ring-1 focus:ring-[#D67D5C]/40 outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827970] hover:text-[#2D2D2D] transition flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-[#827970]">Minimum 8 characters</p>
            {errors.newPassword && (
              <p className="text-[10px] font-semibold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                {errors.newPassword}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#574F49]">Confirm New Password</label>
            <div className="relative">
              <input
                ref={confirmPasswordRef}
                type={showPassword ? "text" : "password"}
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-[#2D2D2D]/8 bg-white/70 pl-3.5 pr-10 py-2.5 text-xs text-[#2D2D2D] focus:border-[#D67D5C]/40 focus:ring-1 focus:ring-[#D67D5C]/40 outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827970] hover:text-[#2D2D2D] transition flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[10px] font-semibold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {submitError && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
              {submitError}
            </p>
          )}

          <div className="mt-8 flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#2D2D2D]/8 bg-white py-3 text-sm font-semibold text-[#574F49] hover:bg-[#FDF8F1] transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-3 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50">
              {loading ? (
                <><span className="material-symbols-outlined text-[14px] animate-spin inline-block mr-1">sync</span> Saving…</>
              ) : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── page ─── */
export default function AccountPage() {
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string | null;
    email: string;
    plan: "free" | "pro" | "unlimited";
    phone: string | null;
    bio: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const loadProfile = () => {
    fetch("/api/photographer/stats")
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          console.error("STATS API ERROR RESPONSE:", text);
          throw new Error("Failed to load: " + text);
        }
        return r.json();
      })
      .then((data) => {
        setProfile(data.profile);
      })
      .catch((err) => console.error("Error loading account profile:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const getPlanPriceLabel = (plan: string) => {
    if (plan === "free") return "₹0 / month";
    if (plan === "pro") return "₹999 / month";
    return "₹2,499 / month";
  };

  const getPlanNameLabel = (plan: string) => {
    if (plan === "free") return "Starter";
    if (plan === "pro") return "Personal Pro";
    return "Studio Plan";
  };

  const securityRows = [
    { label: "Change password", detail: "Last changed 3 months ago", icon: "lock", action: "Update" },
  ];

  if (loading) {
    return (
      <DashboardShell active="Settings">
        <main className="p-4 sm:p-6 lg:p-9">
          <PageHeading
            eyebrow="Account"
            title="Account settings"
            detail="Manage your profile, notification preferences and billing."
          />
          <div className="flex flex-col items-center justify-center py-20 text-[#827970] gap-3">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2D2D2D]/10 border-t-[#D67D5C]" />
            <p className="text-sm">Fetching credentials...</p>
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!profile) {
    return (
      <DashboardShell active="Settings">
        <main className="p-4 sm:p-6 lg:p-9">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
            Failed to load photographer profile information.
          </div>
        </main>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active="Settings" userName={profile.full_name ?? undefined}>
      <main className="p-4 sm:p-6 lg:p-9">
        <PageHeading
          eyebrow="Account"
          title="Account settings"
          detail="Manage your profile, notification preferences and billing."
        />

        <div className="grid gap-7 xl:grid-cols-2">
          {/* ── Profile Card ── */}
          <div className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
            <SectionTitle icon="person" title="Profile" />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#F4A261]/20 text-2xl font-bold text-[#F4A261] uppercase">
                {(profile.full_name ?? profile.email ?? "P")[0]}
                {(profile.full_name ?? "").split(" ")[1]?.[0] || ""}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tracking-tight text-[#2D2D2D]">{profile.full_name ?? "Photographer"}</p>
                <p className="mt-1 text-sm text-[#827970]">{profile.email}</p>
                <span className="mt-2 inline-block rounded-full bg-[#D67D5C]/12 px-3 py-1 text-xs font-semibold text-[#B36144]">
                  Photographer
                </span>
              </div>
            </div>
          </div>

          {/* ── Billing & Plan ── */}
          <div className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
            <SectionTitle icon="credit_card" title="Billing & Plan" />

            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold tracking-tight text-[#2D2D2D]">{getPlanNameLabel(profile.plan)}</p>
                  <span className="rounded-full bg-[#D67D5C]/12 px-2.5 py-0.5 text-xs font-semibold text-[#B36144]">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#827970]">{getPlanPriceLabel(profile.plan)}</p>
              </div>
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, #D67D5C, #F4A261)" }}
              >
                <span className="material-symbols-outlined text-[22px] text-white">workspace_premium</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[#FDF8F1] px-4 py-3">
                <span className="text-[#827970]">Billing period</span>
                <span className="font-medium text-[#2D2D2D]">Monthly Recurring</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#FDF8F1] px-4 py-3">
                <span className="text-[#827970]">Payment processor</span>
                <span className="font-medium text-[#2D2D2D]">Razorpay Secure</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsPlanOpen(true)}
                className="rounded-xl bg-[#D67D5C] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(214,125,92,0.18)] transition hover:-translate-y-0.5 hover:bg-[#C76F50]"
              >
                Change Plan / Upgrade
              </button>
            </div>
          </div>

          {/* ── Security ── */}
          <div className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
            <SectionTitle icon="shield" title="Security" />

            <div className="space-y-1">
              {securityRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 rounded-2xl px-1 py-3.5 transition hover:bg-[#F4A261]/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0EBE4]">
                      <span className="material-symbols-outlined text-[18px] text-[#827970]">{row.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2D2D2D]">{row.label}</p>
                      <p className="mt-0.5 text-xs text-[#827970]">{row.detail}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPasswordOpen(true)}
                    className="shrink-0 rounded-lg border border-[#2D2D2D]/8 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2D2D2D] transition hover:border-[#D67D5C]/40 hover:bg-[#FDF8F1]"
                  >
                    {row.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ChangePlanModal
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        currentPlan={profile.plan}
        onUpdated={loadProfile}
      />

      <ChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />
    </DashboardShell>
  );
}

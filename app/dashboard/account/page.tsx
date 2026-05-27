"use client";

import { useState } from "react";
import { DashboardShell, PageHeading } from "@/components/dashboard/shell";

/* ─── helpers ─── */
function Toggle({ on }: { on: boolean }) {
  const [active, setActive] = useState(on);
  return (
    <button
      type="button"
      onClick={() => setActive(!active)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition ${
        active ? "bg-[#D67D5C]" : "bg-[#E0DBD5]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          active ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px] text-[#D67D5C]">{icon}</span>
      <h2 className="text-lg font-semibold tracking-tight text-[#2D2D2D]">{title}</h2>
    </div>
  );
}

/* ─── modals ─── */
function ChangePlanModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const plans = [
    { name: "Starter", price: "$19", desc: "For hobbyists and casual shooters", features: ["5 events", "100 GB Storage", "Standard support"] },
    { name: "Pro", price: "$49", desc: "Best for active professional photographers", features: ["20 events", "500 GB Storage", "Priority support", "Custom branding"] },
    { name: "Studio", price: "$99", desc: "Unmatched scale for busy studios", features: ["Unlimited events", "2 TB Storage", "24/7 dedicated support", "Custom branding", "Multiple team members"] },
  ];

  const [selectedPlan, setSelectedPlan] = useState("Pro");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert(`Plan updated to ${selectedPlan}!`);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#2D2D2D]/8 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 animate-page-enter">
        <button onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 border border-[#2D2D2D]/6 hover:bg-[#FDF8F1] transition">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">Subscription</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#2D2D2D]">Change your plan</h2>
        <p className="mt-2 text-sm text-[#827970]">Select the workspace plan that best fits your photographer workflow.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {plans.map((p) => (
            <button
              key={p.name}
              onClick={() => setSelectedPlan(p.name)}
              className={`flex flex-col text-left p-5 rounded-2xl border transition-all ${
                selectedPlan === p.name
                  ? "border-[#D67D5C] bg-[#D67D5C]/5 shadow-sm"
                  : "border-[#2D2D2D]/6 bg-white/50 hover:bg-white/80"
              }`}
            >
              <h3 className="font-semibold text-[#2D2D2D]">{p.name}</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-2xl font-bold text-[#2D2D2D]">{p.price}</span>
                <span className="text-xs text-[#827970]">/mo</span>
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
            {loading ? "Updating..." : "Update Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpdatePaymentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: "", card: "", expiry: "", cvc: "" });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Payment method updated successfully!");
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#2D2D2D]/8 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 animate-page-enter">
        <button onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 border border-[#2D2D2D]/6 hover:bg-[#FDF8F1] transition">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">Security</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#2D2D2D]">Update payment method</h2>
        <p className="mt-2 text-sm text-[#827970]">Provide your billing details below to update your payment option.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Cardholder Name</label>
            <input
              required
              placeholder="Ari Vance"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white/95 px-4 text-sm outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Card Number</label>
            <div className="relative mt-2 flex items-center">
              <input
                required
                maxLength={19}
                placeholder="•••• •••• •••• 4242"
                value={formData.card}
                onChange={(e) => setFormData({ ...formData, card: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white/95 pl-4 pr-10 text-sm outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
              <span className="material-symbols-outlined absolute right-3 text-[#A69C93]">credit_card</span>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Expiry Date</label>
              <input
                required
                placeholder="MM / YY"
                value={formData.expiry}
                onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white/95 px-4 text-sm outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">CVC</label>
              <input
                required
                maxLength={3}
                placeholder="123"
                value={formData.cvc}
                onChange={(e) => setFormData({ ...formData, cvc: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white/95 px-4 text-sm outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#2D2D2D]/8 bg-white py-3 text-sm font-semibold text-[#574F49] hover:bg-[#FDF8F1] transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-3 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50">
              {loading ? "Updating..." : "Save Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── page ─── */
export default function AccountPage() {
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const notifications = [
    { label: "Email notifications", detail: "Receive updates about new uploads and gallery activity", on: true },
    { label: "WhatsApp alerts", detail: "Get instant alerts when guests access their photos", on: true },
    { label: "Weekly digest", detail: "Summary of all activity across your events", on: false },
    { label: "New guest notifications", detail: "Alert when new guests register via QR code", on: true },
  ];

  const securityRows = [
    { label: "Change password", detail: "Last changed 3 months ago", icon: "lock", action: "Update" },
    { label: "Two-factor authentication", detail: "Currently enabled via authenticator app", icon: "verified_user", action: "Manage" },
    { label: "Active sessions", detail: "3 devices currently signed in", icon: "devices", action: "View" },
  ];

  return (
    <DashboardShell active="Settings">
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
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#F4A261]/20 text-2xl font-bold text-[#F4A261]">
                AV
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tracking-tight text-[#2D2D2D]">Ari Vance</p>
                <p className="mt-1 text-sm text-[#827970]">ari@revela.photos</p>
                <span className="mt-2 inline-block rounded-full bg-[#D67D5C]/12 px-3 py-1 text-xs font-semibold text-[#B36144]">
                  Photographer
                </span>
              </div>
              <button className="shrink-0 self-start rounded-xl border border-[#2D2D2D]/8 bg-white px-5 py-2.5 text-sm font-semibold text-[#2D2D2D] transition hover:border-[#D67D5C]/40 hover:bg-[#FDF8F1]">
                Edit Profile
              </button>
            </div>
          </div>

          {/* ── Notification Preferences ── */}
          <div className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
            <SectionTitle icon="notifications" title="Notification Preferences" />

            <div className="space-y-1">
              {notifications.map((n) => (
                <div
                  key={n.label}
                  className="flex items-center justify-between gap-4 rounded-2xl px-1 py-3.5 transition hover:bg-[#F4A261]/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2D2D2D]">{n.label}</p>
                    <p className="mt-0.5 text-xs text-[#827970]">{n.detail}</p>
                  </div>
                  <Toggle on={n.on} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Billing & Plan ── */}
          <div className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
            <SectionTitle icon="credit_card" title="Billing & Plan" />

            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Pro Plan</p>
                  <span className="rounded-full bg-[#D67D5C]/12 px-2.5 py-0.5 text-xs font-semibold text-[#B36144]">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#827970]">$49 / month</p>
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
                <span className="text-[#827970]">Next billing date</span>
                <span className="font-medium text-[#2D2D2D]">June 1, 2026</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#FDF8F1] px-4 py-3">
                <span className="text-[#827970]">Payment method</span>
                <span className="font-medium text-[#2D2D2D]">•••• 4242</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsPlanOpen(true)}
                className="rounded-xl bg-[#D67D5C] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(214,125,92,0.18)] transition hover:-translate-y-0.5 hover:bg-[#C76F50]"
              >
                Change Plan
              </button>
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="rounded-xl border border-[#2D2D2D]/8 bg-white px-5 py-2.5 text-sm font-semibold text-[#2D2D2D] transition hover:border-[#D67D5C]/40 hover:bg-[#FDF8F1]"
              >
                Update Payment
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
                  <button className="shrink-0 rounded-lg border border-[#2D2D2D]/8 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2D2D2D] transition hover:border-[#D67D5C]/40 hover:bg-[#FDF8F1]">
                    {row.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Danger Zone ─── */}
        <div className="mt-8 rounded-[26px] border border-red-200/60 bg-red-50/40 p-7 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-red-500/70">warning</span>
            <h2 className="text-lg font-semibold tracking-tight text-[#2D2D2D]">Danger Zone</h2>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#2D2D2D]">Delete Account</p>
              <p className="mt-0.5 text-xs text-[#827970]">
                Permanently remove your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button className="shrink-0 rounded-xl border border-red-300/60 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
              Delete Account
            </button>
          </div>
        </div>
      </main>

      {/* Pop-up Modals */}
      <ChangePlanModal isOpen={isPlanOpen} onClose={() => setIsPlanOpen(false)} />
      <UpdatePaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
    </DashboardShell>
  );
}

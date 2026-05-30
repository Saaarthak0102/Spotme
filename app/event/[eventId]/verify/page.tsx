"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { registerGuest } from "@/lib/guest-data-client";

type Step = "form" | "success";

export default function VerifyPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone length rules per country
  const phoneRules: Record<string, number> = {
    "+91": 10, // India
    "+1": 10,  // USA
    "+44": 10, // UK (simplified)
    "+33": 9,  // France
    "+49": 10, // Germany
    "+81": 10, // Japan
    "+61": 9,  // Australia
    "+971": 9, // UAE
    "+65": 8,  // Singapore
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const expectedLength = phoneRules[countryCode];
    if (phone.length !== expectedLength) {
      setError(`Phone number must be ${expectedLength} digits for ${countryCode}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const fullPhone = `${countryCode}${phone}`;

    const guest = await registerGuest(eventId, fullPhone, name.trim());

    if (!guest) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    localStorage.setItem(`guest_id_${eventId}`, guest.id);
    localStorage.setItem(`guest_name_${eventId}`, name.trim());

    setStep("success");

    setTimeout(() => {
      router.push(`/event/${eventId}/gallery`);
    }, 1500);
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-sm">
        {/* ── Step: Form ────────────────────────────── */}
        {step === "form" && (
          <div className="animate-fade-in">
            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
              Join the event
            </h1>
            <p className="mt-2 text-center text-sm text-[#827970]">
              Enter your name and WhatsApp number to access your photos.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">
                  Your Name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="mt-2 h-12 w-full rounded-xl border px-4 text-base outline-none"
                />
              </div>

              {/* Phone field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">
                  WhatsApp Number
                </label>
                <div className="mt-2 flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-12 w-[88px] shrink-0 rounded-xl border px-2.5 text-sm font-medium outline-none"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+65">🇸🇬 +65</option>
                  </select>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className="h-12 flex-1 rounded-xl border px-4 text-base font-medium tracking-wide outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || name.length < 2 || phone.length < 6}
                className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-base font-semibold text-white"
              >
                {submitting ? "Submitting..." : "View Event Photos"}
              </button>
            </form>
          </div>
        )}

        {/* ── Step: Success ─────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#D67D5C]/20 border-t-[#D67D5C]" />
              <span className="material-symbols-outlined text-[28px] text-[#D67D5C]">check</span>
            </div>
            <h2 className="mt-6 text-lg font-semibold">Welcome, {name}!</h2>
            <p className="mt-2 text-sm text-[#827970]">Taking you to the gallery...</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { registerGuest, sendOtpCode, getEventDetails } from "@/lib/guest-data-client";
import { useGuestRedirect } from "@/lib/use-guest-redirect";

type Step = "phone_input" | "otp_verify" | "success";

export default function VerifyPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  // Auto-redirect if verified session already exists
  useGuestRedirect(eventId);

  const [step, setStep] = useState<Step>("phone_input");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Phone length rules per country
  const phoneRules: Record<string, number> = {
    "+91": 10, // India
    "+1": 10,  // USA
    "+44": 10, // UK
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const expectedLength = phoneRules[countryCode];
    if (phone.length !== expectedLength) {
      setError(`Phone number must be ${expectedLength} digits for ${countryCode}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfoMessage(null);

    const fullPhone = `${countryCode}${phone}`;
    const result = await sendOtpCode(fullPhone);

    if (result.success && result.sessionId) {
      setSessionId(result.sessionId);
      setStep("otp_verify");
      if (result.method === "mock") {
        setInfoMessage("Development mode: Enter 123456 as the verification code.");
      }
    } else {
      setError(result.error || "Failed to send verification code. Please check your number and try again.");
    }
    setSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !sessionId) return;

    setSubmitting(true);
    setError(null);

    const fullPhone = `${countryCode}${phone}`;

    try {
      // Register guest after verifying code
      const guest = await registerGuest(eventId, fullPhone, name.trim(), otp, sessionId);

      if (!guest) {
        throw new Error("Failed to register. Please try again.");
      }

      localStorage.setItem(`guest_id_${eventId}`, guest.id);
      localStorage.setItem(`guest_name_${eventId}`, name.trim());

      setStep("success");

      // Check event details to route properly
      const details = await getEventDetails(eventId);
      const isHackathon = details?.event_type === "hackathon";
      const isPrivate = details?.privacy_mode === true;

      setTimeout(() => {
        // Force selfie upload if event is a hackathon or privacy mode is enabled
        if (isHackathon || isPrivate) {
          router.push(`/event/${eventId}/find-me`);
        } else {
          router.push(`/event/${eventId}/gallery`);
        }
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-sm">
        {/* Step Indicator */}
        <div className="mb-8 flex justify-center items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${step === "phone_input" ? "bg-[#D67D5C] w-6" : "bg-[#E2D8CE]"}`} />
          <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${step === "otp_verify" ? "bg-[#D67D5C] w-6" : "bg-[#E2D8CE]"}`} />
          <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${step === "success" ? "bg-[#D67D5C] w-6" : "bg-[#E2D8CE]"}`} />
        </div>

        {/* ── Step: Phone Input ────────────────────────────── */}
        {step === "phone_input" && (
          <div className="animate-fade-in">
            <h1 className="text-center text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
              Join the event
            </h1>
            <p className="mt-2 text-center text-sm text-[#827970]">
              Enter your name and WhatsApp number to verify and access event photos.
            </p>

            <form onSubmit={handleSendOtp} className="mt-8 space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">
                  Your Name
                </label>
                <input
                  required
                  type="text"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C] font-medium"
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
                    className="h-12 w-[88px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium outline-none focus:border-[#D67D5C]"
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
                    maxLength={12}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className="h-12 flex-1 rounded-xl border border-slate-200 px-4 text-base font-medium tracking-wide outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C]"
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
                disabled={submitting || name.trim().length < 2 || phone.length < 6}
                className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-base font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Sending code..." : "Get Verification Code"}
              </button>
            </form>
          </div>
        )}

        {/* ── Step: OTP Verify ────────────────────────────── */}
        {step === "otp_verify" && (
          <div className="animate-fade-in text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
              Verify your number
            </h1>
            <p className="mt-2 text-sm text-[#827970]">
              Enter the 6-digit OTP code sent to <span className="font-semibold text-slate-800">{countryCode} {phone}</span>.
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-8 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66] text-center">
                  Verification Code
                </label>
                <input
                  required
                  type="text"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="------"
                  className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C] placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-300"
                />
              </div>

              {infoMessage && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 font-medium">
                  {infoMessage}
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-base font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify & Access Photos"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone_input");
                    setError(null);
                    setOtp("");
                  }}
                  className="text-xs font-medium text-[#827970] hover:text-[#2D2D2D] underline underline-offset-4"
                >
                  Change phone number
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step: Success ─────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center animate-fade-in text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#D67D5C]/20 border-t-[#D67D5C]" />
              <span className="material-symbols-outlined text-[28px] text-[#D67D5C]">check</span>
            </div>
            <h2 className="mt-6 text-lg font-bold text-slate-800">Welcome, {name}!</h2>
            <p className="mt-2 text-sm text-[#827970]">Phone number verified successfully.</p>
            <p className="mt-1 text-xs text-[#A69C93] animate-pulse">Redirecting you to your event photos...</p>
          </div>
        )}
      </div>
    </div>
  );
}

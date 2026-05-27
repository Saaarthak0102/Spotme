"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Step = "phone" | "otp" | "verifying";

export default function VerifyPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [sending, setSending] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Send Code ────────────────────────────────── */
  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStep("otp");
    }, 1200);
  };

  /* ── OTP Input ────────────────────────────────── */
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);

    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /* ── Auto-verify when OTP is complete ──────────── */
  useEffect(() => {
    if (otp.every((d) => d !== "")) {
      setStep("verifying");
      const timer = setTimeout(() => {
        router.push(`/event/${eventId}/gallery`);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [otp, eventId, router]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-sm">

        {/* ── Step: Phone Number ──────────────────── */}
        {step === "phone" && (
          <div className="animate-fade-in">
            {/* WhatsApp icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#25D366]/10">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>

            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
              Verify with WhatsApp
            </h1>
            <p className="mt-2 text-center text-sm text-[#827970]">
              Enter your phone number to receive a verification code on WhatsApp.
            </p>

            <form onSubmit={handleSendCode} className="mt-8">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">
                Phone Number
              </label>
              <div className="mt-2 flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-12 w-[88px] shrink-0 rounded-xl border border-[#2D2D2D]/8 bg-white px-2.5 text-sm font-medium outline-none transition focus:border-[#25D366]/50"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="h-12 flex-1 rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-base font-medium tracking-wide outline-none transition focus:border-[#25D366]/50 focus:shadow-[0_0_0_3px_rgba(37,211,102,0.08)]"
                />
              </div>

              <button
                type="submit"
                disabled={sending || phone.length < 6}
                className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-semibold text-white shadow-[0_10px_24px_rgba(37,211,102,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(37,211,102,0.28)] active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {sending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    Send WhatsApp Code
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-[#A69C93] leading-4">
              We&apos;ll send a 4-digit code to your WhatsApp. <br />
              Standard messaging rates may apply.
            </p>
          </div>
        )}

        {/* ── Step: OTP Entry ─────────────────────── */}
        {step === "otp" && (
          <div className="animate-fade-in">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#25D366]/10">
              <span className="material-symbols-outlined text-[30px] text-[#25D366]">lock</span>
            </div>

            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
              Enter verification code
            </h1>
            <p className="mt-2 text-center text-sm text-[#827970]">
              We sent a code to <span className="font-semibold text-[#2D2D2D]">{countryCode} {phone}</span>
            </p>

            {/* OTP Boxes */}
            <div className="mt-8 flex justify-center gap-3">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-14 w-14 rounded-2xl border-2 border-[#2D2D2D]/8 bg-white text-center text-2xl font-bold outline-none transition-all focus:border-[#25D366] focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] sm:h-16 sm:w-16"
                />
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-[#827970]">
              Didn&apos;t receive the code?{" "}
              <button className="font-semibold text-[#25D366] hover:underline">Resend</button>
            </p>

            <button
              onClick={() => { setStep("phone"); setOtp(["", "", "", ""]); }}
              className="mx-auto mt-4 flex items-center gap-1 text-xs text-[#A69C93] hover:text-[#2D2D2D] transition"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              Change number
            </button>
          </div>
        )}

        {/* ── Step: Verifying Spinner ─────────────── */}
        {step === "verifying" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#25D366]/20 border-t-[#25D366]" />
              <span className="material-symbols-outlined text-[28px] text-[#25D366]">check</span>
            </div>
            <h2 className="mt-6 text-lg font-semibold">Verifying...</h2>
            <p className="mt-2 text-sm text-[#827970]">Hang tight, redirecting you to the gallery.</p>
          </div>
        )}
      </div>
    </div>
  );
}

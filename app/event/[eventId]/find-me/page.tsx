"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type UploadStep = "idle" | "uploading" | "processing";

export default function FindMePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<UploadStep>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDots, setProcessingDots] = useState(0);

  /* ── Simulate upload + processing ──────────────── */
  const startUpload = () => {
    setStep("uploading");
    setUploadProgress(0);

    const uploadInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          // Switch to processing
          setStep("processing");

          // Animate processing dots
          let dotCount = 0;
          const dotInterval = setInterval(() => {
            dotCount++;
            setProcessingDots(dotCount % 4);
          }, 400);

          // After processing, navigate to results
          setTimeout(() => {
            clearInterval(dotInterval);
            router.push(`/event/${eventId}/my-photos`);
          }, 3000);

          return 100;
        }
        return prev + 8;
      });
    }, 100);
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-sm">

        {/* ── Idle: Upload Zone ────────────────────── */}
        {step === "idle" && (
          <div className="animate-fade-in text-center">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Find your photos
            </h1>
            <p className="mt-2 text-sm text-[#827970]">
              Upload a selfie or any photo of yourself and we&apos;ll find all photos you appear in.
            </p>

            {/* Upload circle */}
            <button
              onClick={startUpload}
              className="group mx-auto mt-8 flex h-48 w-48 flex-col items-center justify-center rounded-full border-[3px] border-dashed border-[#D67D5C]/30 bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] transition-all duration-300 hover:border-[#D67D5C]/60 hover:shadow-[0_0_40px_rgba(214,125,92,0.1)] active:scale-[0.97] sm:h-56 sm:w-56"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D67D5C]/10 text-[#B36144] transition-transform duration-300 group-hover:scale-110">
                <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
              </span>
              <p className="mt-3 text-sm font-semibold text-[#2D2D2D]">Tap to upload</p>
              <p className="mt-1 text-[10px] text-[#A69C93]">or take a selfie</p>
            </button>

            {/* Secondary option */}
            <button
              onClick={startUpload}
              className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-xl border border-[#2D2D2D]/8 bg-white px-5 text-xs font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">photo_library</span>
              Choose from gallery
            </button>

            <Link
              href={`/event/${eventId}/gallery`}
              className="mt-8 inline-flex items-center gap-1 text-xs text-[#A69C93] transition hover:text-[#2D2D2D]"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back to all photos
            </Link>
          </div>
        )}

        {/* ── Uploading ───────────────────────────── */}
        {step === "uploading" && (
          <div className="animate-fade-in text-center">
            {/* Circular progress */}
            <div className="mx-auto flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#EFE6DD" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke="url(#warmGradient)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - uploadProgress / 100)}`}
                  className="transition-all duration-200"
                />
                <defs>
                  <linearGradient id="warmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D67D5C" />
                    <stop offset="100%" stopColor="#F4A261" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-2xl font-bold text-[#2D2D2D]">{uploadProgress}%</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold">Uploading your photo</h2>
            <p className="mt-1 text-sm text-[#827970]">Almost there...</p>
          </div>
        )}

        {/* ── Processing ──────────────────────────── */}
        {step === "processing" && (
          <div className="animate-fade-in text-center">
            {/* Animated scanning icon */}
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] sm:h-48 sm:w-48">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#D67D5C]/10" />
                <span className="absolute inset-2 animate-pulse rounded-full bg-[#D67D5C]/5" />
                <span className="material-symbols-outlined text-[36px] text-[#D67D5C]">face_retouching_natural</span>
              </div>
            </div>
            <h2 className="mt-6 text-lg font-semibold">
              Searching for you{".".repeat(processingDots)}
            </h2>
            <p className="mt-2 text-sm text-[#827970]">
              Scanning through event photos to find your moments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type UploadStep = "idle" | "camera" | "uploading" | "processing" | "done";

export default function FindMePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // Custom camera refs and states
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const [step, setStep] = useState<UploadStep>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDots, setProcessingDots] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`guest_id_${eventId}`);
    setGuestId(stored);
  }, [eventId]);

  // Clean up camera stream when component unmounts or step changes
  useEffect(() => {
    if (step !== "camera") {
      stopCamera();
    }
  }, [step]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (mode: "user" | "environment" = "user") => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Unable to access your camera. Falling back to manual upload.");
      setStep("idle");
      // Graceful fallback: trigger native file upload / camera capture
      cameraInputRef.current?.click();
    } finally {
      setIsCameraLoading(false);
    }
  };

  const toggleCamera = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    const canvas = document.createElement("canvas");
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    // Crop to square matching our circular viewfinder UI representation
    const size = Math.min(videoWidth, videoHeight);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      const sx = (videoWidth - size) / 2;
      const sy = (videoHeight - size) / 2;

      // Front cameras should be mirrored for a natural looking selfie
      if (facingMode === "user") {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(
        video,
        sx,
        sy,
        size,
        size,
        0,
        0,
        size,
        size
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
            handleFileSelect(file);
          } else {
            alert("Failed to capture image. Please try again.");
          }
        },
        "image/jpeg",
        0.95
      );
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > 10 * 1024 * 1024) return "Image must be under 10 MB.";
    if (!["image/jpeg","image/png","image/webp","image/heic"].includes(file.type)) {
      return "Please upload a JPEG, PNG, WebP, or HEIC image.";
    }
    return null;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setStep("uploading");
    setUploadProgress(0);

    // Slow progress animation while we wait for the upload
    let prog = 0;
    const progressInterval = setInterval(() => {
      prog = Math.min(prog + 3, 85);
      setUploadProgress(prog);
    }, 150);

    try {
      // ── Step 1: Ask the server for a signed upload URL ──────────────
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const urlRes = await fetch("/api/selfie/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, guestId, ext }),
      });

      if (!urlRes.ok) {
        const body = await urlRes.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server error ${urlRes.status}`);
      }

      const { signedUrl, storagePath } = (await urlRes.json()) as {
        signedUrl: string;
        storagePath: string;
        token: string;
      };

      setUploadProgress(20);

      // ── Step 2: PUT the file directly to Supabase ───────────────────
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => "");
        throw new Error(
          `Storage upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`
        );
      }

      setUploadProgress(90);

      // ── Step 3: Confirm — server saves the DB record ─────────────────
      const confirmRes = await fetch("/api/selfie/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, guestId, eventId }),
      });

      if (!confirmRes.ok) {
        console.warn("[find-me] Confirm failed (non-fatal):", await confirmRes.text());
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // ── Step 4: Switch to processing animation ───────────────────────
      setStep("processing");
      let dotCount = 0;
      const dotInterval = setInterval(() => {
        dotCount++;
        setProcessingDots(dotCount % 4);
      }, 400);

      setTimeout(() => {
        clearInterval(dotInterval);
        setStep("done");
        router.push(`/event/${eventId}/my-photos`);
      }, 3000);
    } catch (err) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : "Network error";
      console.error("[find-me] Upload error:", msg);
      setStep("idle");
      alert(`Upload failed: ${msg}`);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-sm">

        {/* ── Hidden camera input (fallback/opens front camera on mobile) ── */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const err = validateFile(file);
              if (err) {
                setCameraError(err);
                if (cameraInputRef.current) cameraInputRef.current.value = "";
                e.target.value = "";
                return;
              }
              setCameraError(null);
              handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {/* ── Hidden gallery input (no capture — shows photo library) ── */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const err = validateFile(file);
              if (err) {
                setGalleryError(err);
                if (galleryInputRef.current) galleryInputRef.current.value = "";
                e.target.value = "";
                return;
              }
              setGalleryError(null);
              handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {/* ── Idle: Upload Zone ─────────────────────────────────────── */}
        {step === "idle" && (
          <div className="animate-fade-in text-center">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Find your photos
            </h1>
            <p className="mt-2 text-sm text-[#827970]">
              Upload a selfie and we&apos;ll find all photos you appear in.
            </p>

            {!guestId && (
              <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                Please{" "}
                <Link
                  href={`/event/${eventId}/verify`}
                  className="font-semibold underline"
                >
                  register first
                </Link>{" "}
                before uploading a selfie.
              </div>
            )}

            {/* Upload circle — opens custom camera feed */}
            <button
              onClick={async () => {
                if (typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
                  setStep("camera");
                  await startCamera("user");
                } else {
                  cameraInputRef.current?.click();
                }
              }}
              disabled={!guestId || step !== "idle"}
              className="group mx-auto mt-8 flex h-48 w-48 flex-col items-center justify-center rounded-full border-[3px] border-dashed border-[#D67D5C]/30 bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] transition-all duration-300 hover:border-[#D67D5C]/60 hover:shadow-[0_0_40px_rgba(214,125,92,0.1)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed sm:h-56 sm:w-56"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D67D5C]/10 text-[#B36144] transition-transform duration-300 group-hover:scale-110">
                <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
              </span>
              <p className="mt-3 text-sm font-semibold text-[#2D2D2D]">Take a selfie</p>
              <p className="mt-1 text-[10px] text-[#A69C93]">opens your camera</p>
            </button>

            {/* Secondary button — opens photo library */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={!guestId || step !== "idle"}
              className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-xl border border-[#2D2D2D]/8 bg-white px-5 text-xs font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">photo_library</span>
              Choose from gallery
            </button>

            {cameraError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 text-left">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
                <span>{cameraError}</span>
              </div>
            )}
            {galleryError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 text-left">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
                <span>{galleryError}</span>
              </div>
            )}

            <Link
              href={`/event/${eventId}/gallery`}
              className="mt-8 inline-flex items-center gap-1 text-xs text-[#A69C93] transition hover:text-[#2D2D2D]"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back to all photos
            </Link>
          </div>
        )}

        {/* ── Camera Viewport ────────────────────────────────────────── */}
        {step === "camera" && (
          <div className="animate-fade-in text-center flex flex-col items-center relative">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Take a selfie
            </h1>
            <p className="mt-2 text-sm text-[#827970] max-w-[280px]">
              Center your face in the circular frame.
            </p>

            {/* Circular viewfinder */}
            <div className="relative mt-8 h-64 w-64 sm:h-72 sm:w-72 overflow-hidden rounded-full border-4 border-[#D67D5C] shadow-[0_0_30px_rgba(214,125,92,0.15)] bg-stone-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />

              {/* Centered Guide ring overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="h-4/5 w-4/5 rounded-full border border-dashed border-white/30 animate-pulse" />
              </div>

              {/* Shutter flash overlay */}
              <div
                className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 ${
                  flashActive ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Camera loading indicator */}
              {isCameraLoading && (
                <div className="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center text-white">
                  <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                  <span className="mt-2 text-xs font-medium text-stone-300">Accessing camera...</span>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="mt-8 flex items-center justify-center gap-6 w-full max-w-[280px]">
              {/* Close / Return button */}
              <button
                onClick={() => {
                  stopCamera();
                  setStep("idle");
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2D2D2D]/8 bg-white text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-95 shadow-sm"
                title="Cancel"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              {/* Custom Shutter Button */}
              <button
                onClick={captureSelfie}
                disabled={isCameraLoading}
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#D67D5C]/20 bg-white p-1 transition hover:border-[#D67D5C]/55 active:scale-95 shadow-md disabled:opacity-50"
                title="Capture Photo"
              >
                <div className="h-full w-full rounded-full bg-gradient-to-br from-[#D67D5C] to-[#F4A261] active:from-[#B36144] active:to-[#D67D5C]" />
              </button>

              {/* Toggle camera source */}
              <button
                onClick={toggleCamera}
                disabled={isCameraLoading}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2D2D2D]/8 bg-white text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-95 shadow-sm disabled:opacity-50"
                title="Switch Camera"
              >
                <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
              </button>
            </div>

            {/* Manual upload fallback option inside camera panel */}
            <button
              onClick={() => {
                stopCamera();
                setStep("idle");
                galleryInputRef.current?.click();
              }}
              className="mt-8 text-xs text-[#827970] hover:text-[#2D2D2D] transition underline underline-offset-4"
            >
              Camera not working? Upload from gallery
            </button>
          </div>
        )}

        {/* ── Uploading ─────────────────────────────────────────────── */}
        {step === "uploading" && (
          <div className="animate-fade-in text-center">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Selfie preview"
                className="mx-auto mb-6 h-24 w-24 rounded-full object-cover border-4 border-[#D67D5C]/20"
              />
            )}
            <div className="mx-auto flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48 relative">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#EFE6DD" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke="url(#warmGradient)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - uploadProgress / 100)}`}
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="warmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D67D5C" />
                    <stop offset="100%" stopColor="#F4A261" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-2xl font-bold text-[#2D2D2D]">
                {uploadProgress}%
              </span>
            </div>
            <h2 className="mt-4 text-lg font-semibold">Uploading your photo</h2>
            <p className="mt-1 text-sm text-[#827970]">Almost there...</p>
          </div>
        )}

        {/* ── Processing ─────────────────────────────────────────────── */}
        {(step === "processing" || step === "done") && (
          <div className="animate-fade-in text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] sm:h-48 sm:w-48">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#D67D5C]/10" />
                <span className="absolute inset-2 animate-pulse rounded-full bg-[#D67D5C]/5" />
                <span className="material-symbols-outlined text-[36px] text-[#D67D5C]">
                  face_retouching_natural
                </span>
              </div>
            </div>
            <h2 className="mt-6 text-lg font-semibold">
              Searching for you{"...".slice(0, processingDots + 1)}
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


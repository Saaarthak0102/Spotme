"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchMyPhotos,
  getGuestSelfieStatus,
  fetchGuestGalleryClient,
  getEventPrivacyMode,
} from "@/lib/guest-data-client";
import { getOptimizedStorageUrl } from "@/lib/image-optimizer";
import type { EventPhoto } from "@/types/database";

// Tiny static blur placeholder for photos that don't have a blur_hash yet
const FALLBACK_BLUR =
  "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoIAAgAAkA4JZACdAEO/gHOAAD++2f/xRf/v/yf/OWv/qP/vSv/2v/6n/mj/v7/73////8AAAA=";

export default function MyPhotosPage() {
  const { eventId } = useParams<{ eventId: string }>();

  // Photo state
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Guest & AI state
  const [loading, setLoading] = useState(true);
  const [hasGuestRecord, setHasGuestRecord] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [selfieId, setSelfieId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<string | null>(null); // 'processing' | 'matched' | 'no_face' | null
  const [aiMatched, setAiMatched] = useState(false);

  // Polling ref for processing state
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    loadGuestAndPhotos();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadGuestAndPhotos() {
    try {
      setLoading(true);
      const storedGuestId = localStorage.getItem(`guest_id_${eventId}`);

      // Check privacy mode first — affects all fallback behaviour
      const isPrivate = await getEventPrivacyMode(eventId);
      setPrivacyMode(isPrivate);

      if (!storedGuestId) {
        setHasGuestRecord(false);
        if (!isPrivate) {
          // Only load general gallery if NOT in privacy mode
          const { photos: allPhotos, nextCursor: cursor } =
            await fetchGuestGalleryClient(eventId);
          setPhotos(allPhotos);
          setNextCursor(cursor);
        }
        return;
      }

      setHasGuestRecord(true);

      const { selfieId: sid, selfieUrl: sUrl, status, matchCount } =
        await getGuestSelfieStatus(storedGuestId, eventId);

      setSelfieUrl(sUrl);
      setSelfieId(sid);
      setMatchStatus(status);

      if (!sUrl) {
        // No selfie yet
        if (!isPrivate) {
          // Show general gallery only when privacy mode is off
          const { photos: allPhotos, nextCursor: cursor } =
            await fetchGuestGalleryClient(eventId);
          setPhotos(allPhotos);
          setNextCursor(cursor);
        }
        // In privacy mode: show empty with CTA to upload selfie
        return;
      }

      if (status === "matched" || (matchCount > 0 && status !== "uploaded" && status !== "processing")) {
        const matched = await fetchMyPhotos(storedGuestId, eventId);
        setPhotos(matched);
        setAiMatched(true);
        setMatchStatus("matched");
      } else if (status === "processing") {
        setPhotos([]);
        setAiMatched(false);
        schedulePoll(storedGuestId);
      } else if (status === "no_face") {
        // Privacy mode: never fall back to all photos — show re-upload prompt
        if (!isPrivate) {
          const { photos: allPhotos, nextCursor: cursor } =
            await fetchGuestGalleryClient(eventId);
          setPhotos(allPhotos);
          setNextCursor(cursor);
        }
      } else {
        // 'uploaded' — trigger AI and poll
        if (sid && sUrl) {
          setPhotos([]);
          setAiMatched(false);
          triggerEmbedSelfie(storedGuestId, sUrl, sid);
          schedulePoll(storedGuestId);
        }
      }
    } catch (e) {
      console.error("Failed to load guest gallery:", e);
    } finally {
      setLoading(false);
    }
  }

  function triggerEmbedSelfie(
    guestId: string,
    selfieUrl: string,
    selfieId: string
  ) {
    // Kick off the AI embed-selfie via a Next.js API route (which calls Python)
    fetch("/api/ai/embed-selfie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_id: guestId, event_id: eventId, selfie_url: selfieUrl, selfie_id: selfieId }),
    }).catch((err) => console.error("embed-selfie trigger failed:", err));
  }

  function schedulePoll(guestId: string) {
    if (pollRef.current) clearTimeout(pollRef.current);
    setMatchStatus("processing");
    pollRef.current = setTimeout(async () => {
      try {
        const { status, matchCount } = await getGuestSelfieStatus(guestId, eventId);
        setMatchStatus(status);
        if (status === "matched" || matchCount > 0) {
          const matched = await fetchMyPhotos(guestId, eventId);
          setPhotos(matched);
          setAiMatched(true);
        } else if (status === "processing" || status === "uploaded") {
          schedulePoll(guestId); // keep polling
        } else if (status === "no_face") {
          const { photos: allPhotos } = await fetchGuestGalleryClient(eventId);
          setPhotos(allPhotos);
        }
      } catch (e) {
        console.error("Poll failed:", e);
      }
    }, 3000);
  }

  // ── Infinite scroll (unfiltered gallery only) ──────────────
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || aiMatched) return;
    setLoadingMore(true);
    try {
      const storedGuestId = localStorage.getItem(`guest_id_${eventId}`);
      const { photos: more, nextCursor: cursor } = await fetchGuestGalleryClient(
        eventId,
        nextCursor
      );
      // If we have a guest but no AI match yet, still paginate all photos
      setPhotos((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...more.filter((p) => !ids.has(p.id))];
      });
      setNextCursor(cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, aiMatched, eventId]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#D67D5C]/20 border-t-[#D67D5C]" />
          <p className="text-sm text-[#827970] font-medium animate-pulse">
            Loading your gallery...
          </p>
        </div>
      </div>
    );
  }

  const isProcessing = matchStatus === "processing" || matchStatus === "uploaded";

  return (
    <div className="min-h-[calc(100vh-56px)] pb-10 bg-slate-50/50">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#FDF8F1] to-[#FEFCFB] border-b border-orange-100/50 px-5 py-8 text-center sm:px-8 sm:py-10">

        {/* Status Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D67D5C] to-[#F4A261] shadow-[0_8px_24px_rgba(214,125,92,0.25)] relative">
          {isProcessing && (
            <span className="absolute inset-0 animate-ping rounded-full bg-[#D67D5C]/20" />
          )}
          <span className="material-symbols-outlined text-[30px] text-white">
            {isProcessing
              ? "sync"
              : aiMatched
              ? "face_retouching_natural"
              : "auto_awesome"}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
          {isProcessing ? (
            "AI is scanning photos for your face…"
          ) : !hasGuestRecord ? (
            "Welcome to the Event Gallery!"
          ) : !selfieUrl ? (
            "Find your photos instantly!"
          ) : matchStatus === "no_face" ? (
            "We couldn't detect a face in your selfie"
          ) : photos.length > 0 && aiMatched ? (
            <>
              We found{" "}
              <span className="text-[#D67D5C]">{photos.length} photos</span> of
              you!
            </>
          ) : aiMatched && photos.length === 0 ? (
            "No matching photos found yet"
          ) : (
            <>
              Here are{" "}
              <span className="text-[#D67D5C]">{photos.length} photos</span>{" "}
              from the event!
            </>
          )}
        </h1>

        <p className="mt-2.5 mx-auto max-w-md text-xs sm:text-sm text-[#827970]">
          {isProcessing
            ? "Our AI is matching your selfie against all event photos. This only runs once."
            : !hasGuestRecord
            ? "Register to enable AI face recognition and find your photos in seconds."
            : !selfieUrl
            ? "Upload a selfie to instantly filter the gallery to only your photos."
            : matchStatus === "no_face"
            ? "Please re-upload a well-lit selfie with your face clearly visible."
            : aiMatched && photos.length > 0
            ? "Powered by InsightFace AI. Here are your moments from the event!"
            : aiMatched && photos.length === 0
            ? "The photographer may still be uploading, or try a different selfie."
            : "Showing all event photos. Upload a selfie to find just yours."}
        </p>

        {/* CTAs */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!hasGuestRecord && (
            <Link
              href={`/event/${eventId}/verify`}
              className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              Register to Find My Photos
            </Link>
          )}

          {hasGuestRecord && !selfieUrl && (
            <Link
              href={`/event/${eventId}/find-me`}
              className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
              Upload Selfie for AI Match
            </Link>
          )}

          {hasGuestRecord && selfieUrl && !isProcessing && (
            <Link
              href={`/event/${eventId}/find-me`}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Use Different Selfie
            </Link>
          )}

          {aiMatched && photos.length > 0 && (
            <button
              onClick={() => {
                photos.forEach((photo) => {
                  if (photo.public_url) {
                    const link = document.createElement("a");
                    link.href = photo.public_url;
                    link.download = photo.original_filename || "event-photo.jpg";
                    link.target = "_blank";
                    link.click();
                  }
                });
              }}
              className="flex h-11 items-center gap-2 rounded-2xl bg-[#2D2D2D] hover:bg-[#1E1E1E] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(45,45,45,0.15)] transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download All ({photos.length})
            </button>
          )}
        </div>
      </div>

      {/* ── AI Processing Banner ──────────────── */}
      {isProcessing && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-200/60 p-4 text-blue-800 text-xs sm:text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">AI is processing your selfie.</span>{" "}
              This usually takes 10–30 seconds. This page will update automatically.
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO GRID ─────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-6">

        {!aiMatched && photos.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Showing All Event Photos ({photos.length})
            </h3>
          </div>
        )}

        {photos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100/50 shadow-sm transition hover:shadow-md sm:rounded-2xl"
                >
                  <Image
                    src={getOptimizedStorageUrl(
                      (photo as EventPhoto & { thumb_url?: string }).thumb_url ||
                      photo.public_url,
                      { quality: 75 }
                    )}
                    alt={photo.original_filename ?? `Photo ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={
                      (photo as EventPhoto & { blur_hash?: string }).blur_hash ??
                      FALLBACK_BLUR
                    }
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                  <div className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#2D2D2D] opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-[16px] font-bold">
                      download
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Infinite scroll sentinel (unfiltered gallery only) */}
            {!aiMatched && nextCursor && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {loadingMore ? (
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D67D5C]/20 border-t-[#D67D5C]" />
                ) : (
                  <span className="text-xs text-slate-400">Scroll for more photos</span>
                )}
              </div>
            )}
          </>
        ) : !isProcessing ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <span className="material-symbols-outlined text-[32px]">photo_library</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">No photos available</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-[240px]">
              No photos have been uploaded yet. Check back soon!
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Browse All Link ────────────────── */}
      {aiMatched && !privacyMode && (
        <div className="mt-12 text-center">
          <Link
            href={`/event/${eventId}/gallery`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-[#574F49] shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">photo_library</span>
            Browse All Event Photos
          </Link>
        </div>
      )}

      {/* ── LIGHTBOX ───────────────────────────────── */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-fade-in">

          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-6"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          )}

          {/* Use medium_url in lightbox for quality balance */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOptimizedStorageUrl(
              (photos[lightboxIndex] as EventPhoto & { medium_url?: string }).medium_url ||
              photos[lightboxIndex].public_url,
              { quality: 80 }
            )}
            alt={
              photos[lightboxIndex].original_filename ??
              `Photo ${lightboxIndex + 1}`
            }
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl animate-scale-in"
          />

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-black/55 px-5 py-3 text-sm text-white/90 backdrop-blur-md border border-white/5 sm:bottom-8">
            <span className="text-xs font-medium opacity-80">
              {lightboxIndex + 1} of {photos.length}
            </span>
            <div className="w-[1px] h-3 bg-white/20" />
            <a
              href={photos[lightboxIndex].public_url ?? "#"}
              download={photos[lightboxIndex].original_filename || "event-photo.jpg"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-white transition hover:text-[#F4A261]"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download Original
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

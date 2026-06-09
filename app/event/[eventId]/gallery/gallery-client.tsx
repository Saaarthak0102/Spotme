"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventPhoto } from "@/types/database";
import { fetchGuestGalleryClient } from "@/lib/guest-data-client";
import { getOptimizedStorageUrl } from "@/lib/image-optimizer";

// Fallback blur placeholder
const FALLBACK_BLUR =
  "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoIAAgAAkA4JZACdAEO/gHOAAD++2f/xRf/v/yf/OWv/qP/vSv/2v/6n/mj/v7/73////8AAAA=";

export function GalleryPageClient({
  eventId,
  photos: initialPhotos,
  initialCursor,
}: {
  eventId: string;
  photos: EventPhoto[];
  initialCursor?: string | null;
}) {
  const [photos, setPhotos] = useState<EventPhoto[]>(initialPhotos);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialCursor ?? null
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { photos: more, nextCursor: cursor } =
        await fetchGuestGalleryClient(eventId, nextCursor);
      setPhotos((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...more.filter((p) => !ids.has(p.id))];
      });
      setNextCursor(cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, eventId]);

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

  type PhotoWithVariants = EventPhoto & {
    thumb_url?: string | null;
    medium_url?: string | null;
    blur_hash?: string | null;
  };

  return (
    <div className="min-h-[calc(100vh-56px)] pb-28">
      {/* ── Header ─────────────────────────────────── */}
      <div className="sticky top-14 z-20 border-b border-[#2D2D2D]/5 bg-white/80 px-5 py-3 backdrop-blur-xl sm:top-16 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">
              Event Gallery
            </h1>
            <p className="text-xs text-[#827970]">{photos.length} photos</p>
          </div>
          <Link
            href={`/event/${eventId}/find-me`}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
              face
            </span>
            Find My Photos
          </Link>
        </div>
      </div>

      {/* ── Photo Grid ─────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-5">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#827970]">
            <span className="material-symbols-outlined text-5xl text-[#D67D5C]/30 mb-4">
              photo_library
            </span>
            <p className="text-base font-medium text-[#2D2D2D]">
              Photos coming soon
            </p>
            <p className="text-sm mt-1">
              The photographer is uploading. Check back soon!
            </p>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-2.5 sm:columns-3 sm:gap-3">
              {photos.map((photo, index) => {
                const p = photo as PhotoWithVariants;
                const aspectClass =
                  index % 5 === 0
                    ? "aspect-[3/4]"
                    : index % 3 === 0
                    ? "aspect-square"
                    : "aspect-[4/3]";
                return (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxIndex(index)}
                    className={`group relative mb-2.5 block w-full overflow-hidden rounded-xl sm:mb-3 sm:rounded-2xl ${aspectClass}`}
                  >
                    <Image
                      src={getOptimizedStorageUrl(p.thumb_url || p.public_url, { quality: 75 })}
                      alt={p.original_filename ?? `Event photo ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={p.blur_hash ?? FALLBACK_BLUR}
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  </button>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loadingMore ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D67D5C]/20 border-t-[#D67D5C]" />
              ) : nextCursor ? (
                <span className="text-xs text-slate-400">
                  Scroll to load more photos
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* ── Sticky Bottom Bar ──────────────────────── */}
      {photos.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#2D2D2D]/6 bg-white/85 px-5 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <p className="text-xs text-[#827970] sm:text-sm">
              Want to find{" "}
              <span className="font-semibold text-[#2D2D2D]">only your photos</span>?
            </p>
            <Link
              href={`/event/${eventId}/find-me`}
              className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition-all hover:-translate-y-0.5 active:scale-[0.98] sm:h-12 sm:px-6"
            >
              <span className="material-symbols-outlined text-[18px]">face</span>
              Upload Selfie
            </Link>
          </div>
        </div>
      )}

      {/* ── Lightbox Overlay ───────────────────────── */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
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
              <span className="material-symbols-outlined text-[22px]">
                chevron_left
              </span>
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6"
            >
              <span className="material-symbols-outlined text-[22px]">
                chevron_right
              </span>
            </button>
          )}

          {/* Use medium_url in lightbox, fallback to public_url */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              getOptimizedStorageUrl(
                (photos[lightboxIndex] as PhotoWithVariants).medium_url ||
                photos[lightboxIndex].public_url,
                { quality: 80 }
              )
            }
            alt={
              photos[lightboxIndex].original_filename ??
              `Photo ${lightboxIndex + 1}`
            }
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-black/40 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm sm:bottom-8">
            <span>
              {lightboxIndex + 1} / {photos.length}
            </span>
            <a
              href={photos[lightboxIndex].public_url ?? "#"}
              download={photos[lightboxIndex].original_filename}
              className="flex items-center gap-1.5 font-semibold text-white transition hover:text-[#F4A261]"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

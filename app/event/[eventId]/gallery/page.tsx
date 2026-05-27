"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { guestGalleryImages } from "@/lib/guest-data";

export default function GalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos = guestGalleryImages;

  return (
    <div className="min-h-[calc(100vh-56px)] pb-28">
      {/* ── Header ─────────────────────────────────── */}
      <div className="sticky top-14 z-20 border-b border-[#2D2D2D]/5 bg-white/80 px-5 py-3 backdrop-blur-xl sm:top-16 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">Event Gallery</h1>
            <p className="text-xs text-[#827970]">{photos.length} photos</p>
          </div>
          <Link
            href={`/event/${eventId}/find-me`}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">face</span>
            Find My Photos
          </Link>
        </div>
      </div>

      {/* ── Photo Grid ─────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="columns-2 gap-2.5 sm:columns-3 sm:gap-3">
          {photos.map((photo, index) => (
            <button
              key={photo}
              onClick={() => setLightboxIndex(index)}
              className={`group relative mb-2.5 block w-full overflow-hidden rounded-xl sm:mb-3 sm:rounded-2xl ${
                index % 5 === 0 ? "aspect-[3/4]" : index % 3 === 0 ? "aspect-square" : "aspect-[4/3]"
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                style={{ backgroundImage: `url("${photo}")` }}
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Sticky Bottom Bar ──────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#2D2D2D]/6 bg-white/85 px-5 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-xs text-[#827970] sm:text-sm">
            Want to find <span className="font-semibold text-[#2D2D2D]">only your photos</span>?
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

      {/* ── Lightbox Overlay ───────────────────────── */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-6"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>
          )}

          {/* Next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          )}

          {/* Image */}
          <img
            src={photos[lightboxIndex]}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />

          {/* Counter + Download */}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-black/40 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm sm:bottom-8">
            <span>{lightboxIndex + 1} / {photos.length}</span>
            <button className="flex items-center gap-1.5 font-semibold text-white transition hover:text-[#F4A261]">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

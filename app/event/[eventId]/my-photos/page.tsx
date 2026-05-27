"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { myPhotosResults } from "@/lib/guest-data";

export default function MyPhotosPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = myPhotosResults;

  return (
    <div className="min-h-[calc(100vh-56px)] pb-10">
      {/* ── Success Header ─────────────────────────── */}
      <div className="bg-gradient-to-b from-[#FDF8F1] to-[#FEFCFB] px-5 py-8 text-center sm:px-8 sm:py-10">
        {/* Checkmark */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D67D5C] to-[#F4A261] shadow-[0_8px_24px_rgba(214,125,92,0.25)]">
          <span className="material-symbols-outlined text-[30px] text-white">auto_awesome</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          We found <span className="text-[#D67D5C]">{photos.length} photos</span> of you!
        </h1>
        <p className="mt-2 text-sm text-[#827970]">
          These are all the event photos you appear in. Download or share them below.
        </p>

        {/* Action buttons */}
        <div className="mt-5 flex justify-center gap-3">
          <button className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download All
          </button>
          <button className="flex h-11 items-center gap-2 rounded-2xl border border-[#2D2D2D]/8 bg-white px-5 text-sm font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share
          </button>
        </div>
      </div>

      {/* ── Photo Grid ─────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {photos.map((photo, index) => (
            <button
              key={photo}
              onClick={() => setLightboxIndex(index)}
              className="group relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                style={{ backgroundImage: `url("${photo}")` }}
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              {/* Download icon on hover */}
              <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#2D2D2D] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <span className="material-symbols-outlined text-[16px]">download</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Browse all link ────────────────────────── */}
      <div className="mt-8 text-center">
        <Link
          href={`/event/${eventId}/gallery`}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2D2D2D]/8 bg-white px-5 py-3 text-sm font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">photo_library</span>
          Browse All Event Photos
        </Link>

        <Link
          href={`/event/${eventId}/find-me`}
          className="mt-3 flex items-center justify-center gap-1 text-xs text-[#A69C93] transition hover:text-[#2D2D2D]"
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Try with a different photo
        </Link>
      </div>

      {/* ── Lightbox ───────────────────────────────── */}
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

          <img
            src={photos[lightboxIndex]}
            alt={`Your photo ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />

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

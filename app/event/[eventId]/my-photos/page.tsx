"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchGuestGalleryClient } from "@/lib/guest-data-client";
import type { EventPhoto } from "@/types/database";

export default function MyPhotosPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Flow State
  const [guestId, setGuestId] = useState<string | null>(null);
  const [hasGuestRecord, setHasGuestRecord] = useState(true);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [aiMatched, setAiMatched] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    async function loadGuestAndSearch() {
      try {
        setLoading(true);
        const storedGuestId = localStorage.getItem(`guest_id_${eventId}`);
        if (!storedGuestId) {
          setHasGuestRecord(false);
          // Unregistered fallback: just show event photos but prompt to register
          const allPhotos = await fetchGuestGalleryClient(eventId);
          setPhotos(allPhotos);
          setLoading(false);
          return;
        }

        setGuestId(storedGuestId);
        setHasGuestRecord(true);

        // Fetch latest guest selfie from Supabase
        const supabase = createClient();
        const { data: selfieData, error: selfieError } = await (supabase as any)
          .from("guest_selfies")
          .select("public_url")
          .eq("guest_id", storedGuestId)
          .eq("event_id", eventId)
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (selfieError) {
          console.error("Error fetching guest selfie:", selfieError);
        }

        if (selfieData && selfieData.public_url) {
          setSelfieUrl(selfieData.public_url);
          setSearching(true);

          // Trigger cosine similarity search to the Python AI service
          try {
            const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";
            const response = await fetch(`${aiServiceUrl}/search`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event_id: eventId,
                selfie_url: selfieData.public_url,
                threshold: 0.65 // Recommended Cosine Similarity threshold
              })
            });

            if (!response.ok) {
              throw new Error(`AI Service returned status ${response.status}`);
            }

            const searchResult = await response.json();
            if (searchResult.success) {
              setPhotos(searchResult.matches || []);
              setAiMatched(true);
            } else {
              throw new Error("AI Service returned search success=false");
            }
          } catch (err) {
            console.error("AI Face Recognition service offline or failed. Falling back to showing all photos.", err);
            setAiError(true);
            const allPhotos = await fetchGuestGalleryClient(eventId);
            setPhotos(allPhotos);
          } finally {
            setSearching(false);
          }
        } else {
          // No selfie found: fall back to showing all photos
          setSelfieUrl(null);
          const allPhotos = await fetchGuestGalleryClient(eventId);
          setPhotos(allPhotos);
        }
      } catch (e) {
        console.error("Failed to load guest gallery:", e);
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadGuestAndSearch();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#D67D5C]/20 border-t-[#D67D5C]" />
          <p className="text-sm text-[#827970] font-medium animate-pulse">Loading your custom gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] pb-10 bg-slate-50/50">
      
      {/* ── HEADER & FLOW STATUS ─────────────────────────── */}
      <div className="bg-gradient-to-b from-[#FDF8F1] to-[#FEFCFB] border-b border-orange-100/50 px-5 py-8 text-center sm:px-8 sm:py-10">
        
        {/* Status Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D67D5C] to-[#F4A261] shadow-[0_8px_24px_rgba(214,125,92,0.25)] relative">
          {searching ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-[#D67D5C]/20" />
          ) : null}
          <span className="material-symbols-outlined text-[30px] text-white">
            {searching ? "sync" : aiMatched ? "face_retouching_natural" : "auto_awesome"}
          </span>
        </div>

        {/* Dynamic Title */}
        <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
          {searching ? (
            "Scanning photos for your face..."
          ) : !hasGuestRecord ? (
            "Welcome to the Event Gallery!"
          ) : !selfieUrl ? (
            "Find your photos instantly!"
          ) : aiError ? (
            <>Here are <span className="text-[#D67D5C]">{photos.length} photos</span> from the event!</>
          ) : photos.length > 0 ? (
            <>We found <span className="text-[#D67D5C]">{photos.length} photos</span> of you!</>
          ) : (
            "No matching photos found yet"
          )}
        </h1>

        {/* Dynamic Subtitle / Alert Info */}
        <p className="mt-2.5 mx-auto max-w-md text-xs sm:text-sm text-[#827970]">
          {searching ? (
            "Our AI is matching your selfie with the professional photographer's uploads."
          ) : !hasGuestRecord ? (
            "Please register to enable premium AI Face Recognition and find your photos in seconds."
          ) : !selfieUrl ? (
            "Upload a selfie to filter the entire gallery and view only the photos you appear in."
          ) : aiError ? (
            "AI Matching is currently offline. Enjoy browsing the full event gallery!"
          ) : photos.length > 0 ? (
            "Powered by state-of-the-art AI Face Recognition. Here are your beautiful moments!"
          ) : (
            "The photographer is still uploading, or the lighting in your selfie was unclear."
          )}
        </p>

        {/* ── DYNAMIC CALLS TO ACTION ───────────────────── */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          
          {/* Action: Register */}
          {!hasGuestRecord && (
            <Link
              href={`/event/${eventId}/verify`}
              className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              Register to Find My Photos
            </Link>
          )}

          {/* Action: Upload Selfie (First Time) */}
          {hasGuestRecord && !selfieUrl && (
            <Link
              href={`/event/${eventId}/find-me`}
              className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
              Upload Selfie for AI Match
            </Link>
          )}

          {/* Action: Re-upload Selfie (Change Photo) */}
          {hasGuestRecord && selfieUrl && !searching && (
            <Link
              href={`/event/${eventId}/find-me`}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Use Different Selfie
            </Link>
          )}

          {/* Action: Download All Matched Photos */}
          {aiMatched && photos.length > 0 && (
            <button 
              onClick={() => {
                // Download all photos sequentially or alert user
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
              Download All Matches
            </button>
          )}
        </div>
      </div>

      {/* ── OFFLINE / AI WARNING BANNER ──────────────── */}
      {aiError && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200/60 p-4 text-amber-800 text-xs sm:text-sm">
            <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
            <div className="flex-1">
              <span className="font-semibold">AI Match offline:</span> The face-matching server is starting up or unreachable. We are displaying all available photos instead.
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO GRID ─────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-6">
        
        {/* Preview Message for Unfiltered Gallery */}
        {!aiMatched && photos.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Showing All Event Photos ({photos.length})
            </h3>
          </div>
        )}

        {/* Gallery Content */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100/50 shadow-sm transition hover:shadow-md sm:rounded-2xl"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                  style={{ backgroundImage: `url("${photo.public_url}")` }}
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                
                {/* Download Overlay button */}
                <div className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#2D2D2D] opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                  <span className="material-symbols-outlined text-[16px] font-bold">download</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <span className="material-symbols-outlined text-[32px]">photo_library</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">No photos available</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-[240px]">
              No photos have been uploaded for this event yet. Check back later!
            </p>
          </div>
        )}
      </div>

      {/* ── BROWSE ALL LINK ────────────────────────── */}
      <div className="mt-12 text-center flex flex-col items-center gap-3">
        {aiMatched && (
          <Link
            href={`/event/${eventId}/gallery`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-[#574F49] shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">photo_library</span>
            Browse All Event Photos
          </Link>
        )}
      </div>

      {/* ── LIGHTBOX ───────────────────────────────── */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-fade-in">
          
          {/* Close Lightbox */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          {/* Previous Button */}
          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-6"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>
          )}

          {/* Next Button */}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-6"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          )}

          {/* Lightbox Image */}
          <img
            src={photos[lightboxIndex].public_url ?? ""}
            alt={photos[lightboxIndex].original_filename ?? `Photo ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl animate-scale-in"
          />

          {/* Bottom Toolbar */}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-black/55 px-5 py-3 text-sm text-white/90 backdrop-blur-md border border-white/5 sm:bottom-8">
            <span className="text-xs font-medium opacity-80">{lightboxIndex + 1} of {photos.length}</span>
            <div className="w-[1px] h-3 bg-white/20" />
            <a
              href={photos[lightboxIndex].public_url ?? "#"}
              download={photos[lightboxIndex].original_filename || "event-photo.jpg"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-white transition hover:text-[#F4A261]"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


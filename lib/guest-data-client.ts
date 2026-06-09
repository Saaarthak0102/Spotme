// ============================================================
// guest-data-client.ts — Client-only Supabase data access
// Safe to import in Client Components ("use client")
// ============================================================
import { createClient } from "@/lib/supabase/client";
import type { Guest, EventPhoto } from "@/types/database";

export type { Guest, EventPhoto };

/**
 * Register (or re-find) a guest by phone number for an event, verifying their OTP code.
 */
export async function registerGuest(
  eventId: string,
  phone: string,
  displayName: string,
  code: string,
  sessionId: string
): Promise<Guest | null> {
  try {
    const res = await fetch(`/api/guest/${eventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, displayName, code, sessionId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Registration failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("registerGuest fetch error:", error);
    throw error;
  }
}

/**
 * Request an OTP code to be sent to a guest's phone number.
 */
export async function sendOtpCode(phone: string): Promise<{ success: boolean; sessionId?: string; error?: string; method?: "2factor" | "mock" }> {
  try {
    const res = await fetch("/api/guest/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || "Failed to send verification code" };
    }

    return { success: true, sessionId: data.sessionId, method: data.method };
  } catch (error) {
    console.error("sendOtpCode fetch error:", error);
    return { success: false, error: "Network error sending code. Please try again." };
  }
}

/**
 * Fetch detailed event status/information (type, privacy mode) for guests.
 */
export async function getEventDetails(eventId: string): Promise<{ privacy_mode: boolean; event_type: string } | null> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("events")
    .select("privacy_mode, event_type")
    .eq("id", eventId)
    .single();
  return data as { privacy_mode: boolean; event_type: string } | null;
}

/**
 * Save a guest selfie record after uploading to storage.
 */
export async function uploadGuestSelfie(payload: {
  guest_id: string;
  event_id: string;
  storage_path: string;
  public_url: string;
}): Promise<{ id: string } | null> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("guest_selfies")
    .insert({
      guest_id: payload.guest_id,
      event_id: payload.event_id,
      storage_path: payload.storage_path,
      public_url: payload.public_url,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (error) {
    console.error("uploadGuestSelfie db error:", error.message);
    return null;
  }

  return data as { id: string };
}

/**
 * Check if an event has privacy_mode enabled.
 * Client-safe: uses the anon key — only reads the events table.
 */
export async function getEventPrivacyMode(eventId: string): Promise<boolean> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("events")
    .select("privacy_mode")
    .eq("id", eventId)
    .single();
  return data?.privacy_mode === true;
}

const GALLERY_PAGE_SIZE = 24;

/**
 * Fetch event photos with cursor-based pagination (24 per page).
 * Returns empty if the event has privacy_mode enabled — guests must use the selfie flow.
 * Uses thumb_url for fast grid rendering when available.
 */
export async function fetchGuestGalleryClient(
  eventId: string,
  cursor?: string // ISO timestamp of the last item from previous page
): Promise<{ photos: EventPhoto[]; nextCursor: string | null }> {
  try {
    const url = cursor
      ? `/api/guest/${eventId}/gallery?cursor=${encodeURIComponent(cursor)}`
      : `/api/guest/${eventId}/gallery`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("fetchGuestGalleryClient server error:", res.statusText);
      return { photos: [], nextCursor: null };
    }
    const data = await res.json();
    return {
      photos: data.photos || [],
      nextCursor: data.nextCursor || null,
    };
  } catch (error) {
    console.error("fetchGuestGalleryClient fetch error:", error);
    return { photos: [], nextCursor: null };
  }
}

/**
 * Fetch photos matched to a specific guest from the photo_matches cache table.
 * This is a pure DB read — no AI call on page load.
 */
export async function fetchMyPhotos(
  guestId: string,
  eventId: string
): Promise<EventPhoto[]> {
  try {
    const res = await fetch(`/api/guest/${eventId}/photos?guestId=${guestId}`);
    if (!res.ok) {
      console.error("fetchMyPhotos server error:", res.statusText);
      return [];
    }
    const data = await res.json();
    return data.photos || [];
  } catch (error) {
    console.error("fetchMyPhotos fetch error:", error);
    return [];
  }
}

/**
 * Check whether a guest has any cached photo matches (non-blocking status check).
 * Returns 'processing', 'matched', 'no_face', 'uploaded', or null if no selfie found.
 */
export async function getGuestSelfieStatus(
  guestId: string,
  eventId: string
): Promise<{
  selfieId: string | null;
  selfieUrl: string | null;
  status: string | null;
  matchCount: number;
}> {
  try {
    const res = await fetch(`/api/guest/${eventId}/status?guestId=${guestId}`);
    if (!res.ok) {
      console.error("getGuestSelfieStatus server error:", res.statusText);
      return { selfieId: null, selfieUrl: null, status: null, matchCount: 0 };
    }
    return await res.json();
  } catch (error) {
    console.error("getGuestSelfieStatus fetch error:", error);
    return { selfieId: null, selfieUrl: null, status: null, matchCount: 0 };
  }
}

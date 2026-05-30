// ============================================================
// guest-data-client.ts — Client-only Supabase data access
// Safe to import in Client Components ("use client")
// ============================================================
import { createClient } from "@/lib/supabase/client";
import type { Guest, EventPhoto } from "@/types/database";

export type { Guest, EventPhoto };

/**
 * Register (or re-find) a guest by phone number for an event.
 */
export async function registerGuest(
  eventId: string,
  phone: string,
  displayName: string
): Promise<Guest | null> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .eq("phone", phone)
    .single();

  if (existing) return existing as Guest;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("guests")
    .insert({ event_id: eventId, phone, display_name: displayName })
    .select()
    .single();

  if (error) {
    console.error("registerGuest error:", error.message);
    return null;
  }

  return data as Guest;
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
  const supabase = createClient();

  // Respect privacy mode — never show general gallery if enabled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventData } = await (supabase as any)
    .from("events")
    .select("privacy_mode")
    .eq("id", eventId)
    .single();

  if (eventData?.privacy_mode === true) {
    return { photos: [], nextCursor: null };
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("event_photos")
    .select(
      "id, storage_path, public_url, thumb_url, medium_url, blur_hash, original_filename, uploaded_at, file_size_bytes, mime_type"
    )
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false })
    .limit(GALLERY_PAGE_SIZE);

  if (cursor) {
    query = query.lt("uploaded_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchGuestGalleryClient error:", error.message);
    return { photos: [], nextCursor: null };
  }

  const photos = (data ?? []) as EventPhoto[];
  const nextCursor =
    photos.length === GALLERY_PAGE_SIZE
      ? (photos[photos.length - 1] as EventPhoto & { uploaded_at: string })
          .uploaded_at
      : null;

  return { photos, nextCursor };
}

/**
 * Fetch photos matched to a specific guest from the photo_matches cache table.
 * This is a pure DB read — no AI call on page load.
 */
export async function fetchMyPhotos(
  guestId: string,
  eventId: string
): Promise<EventPhoto[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("photo_matches")
    .select(
      `
      similarity,
      event_photos:event_photos!photo_id (
        id, storage_path, public_url, thumb_url, medium_url, blur_hash,
        original_filename, uploaded_at, file_size_bytes, mime_type
      )
      `
    )
    .eq("guest_id", guestId)
    .eq("event_id", eventId)
    .order("similarity", { ascending: false });

  if (error) {
    console.error("fetchMyPhotos error:", error.message);
    return [];
  }

  return ((data ?? []) as Array<{ event_photos: EventPhoto }>)
    .map((row) => row.event_photos)
    .filter(Boolean);
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
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: selfieData } = await (supabase as any)
    .from("guest_selfies")
    .select("id, public_url, status, uploaded_at")
    .eq("guest_id", guestId)
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selfieData) {
    return { selfieId: null, selfieUrl: null, status: null, matchCount: 0 };
  }

  // Count cached matches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("photo_matches")
    .select("id", { count: "exact", head: true })
    .eq("guest_id", guestId)
    .eq("event_id", eventId);

  let status = selfieData.status as string;

  // Cache Stale Detection: If photographer uploaded new photos after the guest last matched,
  // we force the status back to 'uploaded' to trigger a background re-run of the AI match.
  if (status === "matched" || status === "uploaded") {
    // 1. Get the latest match time for this guest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latestMatch } = await (supabase as any)
      .from("photo_matches")
      .select("matched_at")
      .eq("guest_id", guestId)
      .eq("event_id", eventId)
      .order("matched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Get the latest photo upload time for this event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latestPhoto } = await (supabase as any)
      .from("event_photos")
      .select("uploaded_at")
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastMatchTime = latestMatch 
      ? new Date(latestMatch.matched_at) 
      : new Date(selfieData.uploaded_at || 0);

    if (latestPhoto && new Date(latestPhoto.uploaded_at) > lastMatchTime) {
      status = "uploaded";
    }
  }

  return {
    selfieId: selfieData.id as string,
    selfieUrl: selfieData.public_url as string,
    status: status,
    matchCount: count ?? 0,
  };
}

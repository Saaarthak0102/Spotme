import { cache } from "react";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Event, EventPhoto } from "@/types/database";
import { hasEventSession } from "@/lib/guest-session";

export type { Event, EventPhoto };

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Fetch a single active event by ID for guest display.
 * Server-safe: use this in Server Components.
 * Cached to prevent duplicate database calls between generateMetadata and page rendering.
 */
export const getGuestEvent = cache(async (eventId: string): Promise<Event | null> => {
  const supabase = await createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("status", "active")
    .eq("qr_active", true)
    .single();

  if (error) {
    console.error("getGuestEvent error:", error.message);
    return null;
  }

  return data as Event;
});

/**
 * Fetch all photos for a public event gallery.
 * Requires a valid guest session cookie. Guests without a session are
 * redirected to /verify by the gallery page before this is called.
 * Returns an empty array if the event has privacy_mode enabled.
 * Server-safe: use this in Server Components.
 */
export async function fetchGuestGallery(eventId: string): Promise<EventPhoto[]> {
  // 1. Verify guest session cookie for this event
  const isAuthorized = await hasEventSession(eventId);
  if (!isAuthorized) {
    return [];
  }

  const adminClient = getAdminClient();

  // Check privacy_mode first (cheap, single-row read)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventData } = await (adminClient as any)
    .from("events")
    .select("privacy_mode")
    .eq("id", eventId)
    .single();

  if (eventData?.privacy_mode === true) {
    // Privacy Mode is ON — never leak general gallery photos server-side
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("event_photos")
    .select("*")
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("fetchGuestGallery error:", error.message);
    return [];
  }

  return (data ?? []) as EventPhoto[];
}

/**
 * Returns the number of photos for a non-private event without requiring
 * a guest session cookie. Used solely for the landing page photo-count badge.
 * Always returns 0 for privacy-mode events to avoid leaking counts.
 * Server-safe: use this in Server Components.
 */
export async function getPublicPhotoCount(eventId: string): Promise<number> {
  const adminClient = getAdminClient();

  // Check privacy_mode — never reveal count for private events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventData } = await (adminClient as any)
    .from("events")
    .select("privacy_mode")
    .eq("id", eventId)
    .single();

  if (eventData?.privacy_mode === true) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (adminClient as any)
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    console.error("getPublicPhotoCount error:", error.message);
    return 0;
  }

  return count ?? 0;
}

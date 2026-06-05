import { cache } from "react";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Event, EventPhoto } from "@/types/database";
import { hasEventSession } from "@/lib/guest-session";

export type { Event, EventPhoto };

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
 * Returns an empty array if the event has privacy_mode enabled —
 * guests must upload a selfie and go through AI matching to see any photos.
 * Server-safe: use this in Server Components.
 */
export async function fetchGuestGallery(eventId: string): Promise<EventPhoto[]> {
  // 1. Verify guest session cookie for this event
  const isAuthorized = await hasEventSession(eventId);
  if (!isAuthorized) {
    return [];
  }

  const supabase = await createServerClient();

  // Check privacy_mode first (cheap, single-row read)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventData } = await (supabase as any)
    .from("events")
    .select("privacy_mode")
    .eq("id", eventId)
    .single();

  if (eventData?.privacy_mode === true) {
    // Privacy Mode is ON — never leak general gallery photos server-side
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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

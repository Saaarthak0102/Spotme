// ============================================================
// dashboard-data.ts — Async Supabase data access layer
// All functions are server-side only (use server Supabase client)
// ============================================================
import { createClient } from "@/lib/supabase/server";
import type { Event, EventPhoto, Guest } from "@/types/database";

// Re-export types for convenience
export type { Event as EventRecord, EventPhoto, Guest };

// -------------------------------------------------------
// Events
// -------------------------------------------------------

/**
 * Fetch all events owned by the current authenticated user OR shared with them as collaborator.
 */
export async function fetchEvents(): Promise<(Event & { photo_count?: number; guest_count?: number })[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch event IDs from event_collaborators where email matches user's email
  const { data: collabEvents } = await (supabase as any)
    .from("event_collaborators")
    .select("event_id")
    .eq("email", user.email);

  const collabIds = (collabEvents ?? []).map((c: any) => c.event_id);

  let query = (supabase as any).from("events").select("*, event_photos(id), guests(id)");
  if (collabIds.length > 0) {
    query = query.or(`owner_id.eq.${user.id},id.in.(${collabIds.join(",")})`);
  } else {
    query = query.eq("owner_id", user.id);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("fetchEvents error:", (error as { message: string }).message);
    return [];
  }

  // Calculate counts in memory from returned relations
  const eventsWithCounts = (data ?? []).map((event: any) => ({
    ...event,
    photo_count: event.event_photos?.length ?? 0,
    guest_count: event.guests?.length ?? 0,
  }));

  return eventsWithCounts;
}

/**
 * Check if the user is owner, collaborator, or has no access.
 */
export async function checkEventAccess(eventId: string): Promise<{
  isOwner: boolean;
  isCollaborator: boolean;
  event: Event | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isOwner: false, isCollaborator: false, event: null };

  // Fetch event (bypass owner filter)
  const { data: event, error } = await (supabase as any)
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    return { isOwner: false, isCollaborator: false, event: null };
  }

  if (event.owner_id === user.id) {
    return { isOwner: true, isCollaborator: false, event };
  }

  // Check if collaborator
  const { data: collab } = await (supabase as any)
    .from("event_collaborators")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", user.email)
    .maybeSingle();

  if (collab) {
    return { isOwner: false, isCollaborator: true, event };
  }

  return { isOwner: false, isCollaborator: false, event: null };
}

/**
 * Fetch a single event by ID (owner or collaborator scoped).
 */
export async function fetchEvent(eventId: string): Promise<Event | null> {
  const access = await checkEventAccess(eventId);
  return access.event;
}

/**
 * Create a new event for the current user.
 */
export async function createEvent(
  payload: Omit<
    Event,
    "id" | "owner_id" | "created_at" | "updated_at" | "qr_active" | "status"
  >
): Promise<Event | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("events")
    .insert({ ...payload, owner_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("createEvent error:", error.message);
    return null;
  }

  return data as Event;
}

// -------------------------------------------------------
// Event Photos
// -------------------------------------------------------

/**
 * Fetch photos for an event (dashboard — owner-scoped).
 * Defaults to first 50 photos; pass limit/offset for pagination.
 */
export async function fetchEventPhotos(
  eventId: string,
  limit = 50,
  offset = 0
): Promise<EventPhoto[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("event_photos")
    .select("*")
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("fetchEventPhotos error:", error.message);
    return [];
  }

  return (data ?? []) as EventPhoto[];
}

/**
 * Fetch the exact total count of photos for an event.
 */
export async function fetchEventPhotoCount(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await (supabase as any)
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    console.error("fetchEventPhotoCount error:", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Insert a photo record after uploading to storage.
 */
export async function insertEventPhoto(
  payload: Omit<EventPhoto, "id" | "uploaded_at">
): Promise<EventPhoto | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("event_photos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("insertEventPhoto error:", error.message);
    return null;
  }

  return data as EventPhoto;
}

// -------------------------------------------------------
// Guests
// -------------------------------------------------------

/**
 * Fetch all guests for an event (dashboard — owner-scoped).
 */
export async function fetchGuests(eventId: string): Promise<Guest[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchGuests error:", error.message);
    return [];
  }

  return (data ?? []) as Guest[];
}

// -------------------------------------------------------
// Dashboard aggregate counts
// -------------------------------------------------------

export interface DashboardStats {
  totalEvents: number;
  totalPhotos: number;
  totalGuests: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { totalEvents: 0, totalPhotos: 0, totalGuests: 0 };

  // Fetch event IDs owned by this user OR where they are a collaborator
  const { data: collabEvents } = await (supabase as any)
    .from("event_collaborators")
    .select("event_id")
    .eq("email", user.email);

  const collabIds = (collabEvents ?? []).map((c: any) => c.event_id);

  let query = (supabase as any).from("events").select("id");
  if (collabIds.length > 0) {
    query = query.or(`owner_id.eq.${user.id},id.in.(${collabIds.join(",")})`);
  } else {
    query = query.eq("owner_id", user.id);
  }

  const { data: events } = await query;
  const eventIds = ((events ?? []) as { id: string }[]).map((e) => e.id);

  const [photosRes, guestsRes] = await Promise.all([
    eventIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any)
          .from("event_photos")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
    eventIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any)
          .from("guests")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    totalEvents: eventIds.length,
    totalPhotos: (photosRes as { count: number | null }).count ?? 0,
    totalGuests: (guestsRes as { count: number | null }).count ?? 0,
  };
}

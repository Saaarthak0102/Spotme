// ============================================================
// lib/admin-data.ts — Admin-only Supabase queries
// Uses service role client for full access (server-side only)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import type { Profile, Event, EventPhoto, Guest } from "@/types/database";

export type { Profile, Event, EventPhoto, Guest };

// Service-role client — never expose to browser
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// -------------------------------------------------------
// Auth — validate that the requesting user is an admin
// -------------------------------------------------------
export async function requireAdmin(userId: string): Promise<boolean> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data as { role: string } | null)?.role === "admin";
}

// -------------------------------------------------------
// Company-wide stats
// -------------------------------------------------------
export interface AdminStats {
  totalPhotographers: number;
  totalEvents: number;
  totalPhotos: number;
  totalGuests: number;
  activeEvents: number;
  thisMonthEvents: number;
  thisMonthPhotos: number;
  thisMonthGuests: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = getAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    photographersRes,
    eventsRes,
    photosRes,
    guestsRes,
    activeEventsRes,
    monthEventsRes,
    monthPhotosRes,
    monthGuestsRes,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("profiles").select("id", { count: "exact", head: true }).eq("role", "photographer"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("events").select("id", { count: "exact", head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("event_photos").select("id", { count: "exact", head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("guests").select("id", { count: "exact", head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("events").select("id", { count: "exact", head: true }).eq("status", "active"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("events").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("event_photos").select("id", { count: "exact", head: true }).gte("uploaded_at", monthStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("guests").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
  ]);

  return {
    totalPhotographers: photographersRes.count ?? 0,
    totalEvents: eventsRes.count ?? 0,
    totalPhotos: photosRes.count ?? 0,
    totalGuests: guestsRes.count ?? 0,
    activeEvents: activeEventsRes.count ?? 0,
    thisMonthEvents: monthEventsRes.count ?? 0,
    thisMonthPhotos: monthPhotosRes.count ?? 0,
    thisMonthGuests: monthGuestsRes.count ?? 0,
  };
}

// -------------------------------------------------------
// Photographers — full list with event counts
// -------------------------------------------------------
export interface PhotographerRow extends Profile {
  email: string;
  eventCount: number;
  photoCount: number;
  lastActive: string | null;
}

export async function fetchPhotographers(): Promise<PhotographerRow[]> {
  const supabase = getAdminClient();

  // Get all non-admin profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles, error } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("role", "photographer")
    .order("created_at", { ascending: false });

  if (error || !profiles?.length) return [];

  // Get auth users to pull emails
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  (authData?.users ?? []).forEach((u) => {
    emailMap[u.id] = u.email ?? "";
  });

  // For each profile, get event and photo counts
  const rows = await Promise.all(
    (profiles as Profile[]).map(async (profile) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: events } = await (supabase as any)
        .from("events")
        .select("id, created_at")
        .eq("owner_id", profile.id)
        .order("created_at", { ascending: false });

      const eventIds = ((events as { id: string; created_at: string }[]) ?? []).map((e) => e.id);
      let photoCount = 0;
      if (eventIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any)
          .from("event_photos")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds);
        photoCount = count ?? 0;
      }

      const lastEvent = (events as { id: string; created_at: string }[] | null)?.[0];

      return {
        ...profile,
        email: emailMap[profile.id] ?? "",
        eventCount: eventIds.length,
        photoCount,
        lastActive: lastEvent?.created_at ?? null,
      } as PhotographerRow;
    })
  );

  return rows;
}

// -------------------------------------------------------
// Recent events — all events across the platform
// -------------------------------------------------------
export interface AdminEventRow extends Event {
  ownerName: string | null;
  ownerEmail: string | null;
  photoCount: number;
  guestCount: number;
}

export async function fetchAllEvents(limit = 20): Promise<AdminEventRow[]> {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events, error } = await (supabase as any)
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !events?.length) return [];

  const ownerIds = [...new Set((events as Event[]).map((e) => e.owner_id))];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, full_name")
    .in("id", ownerIds);

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  (authData?.users ?? []).forEach((u) => { emailMap[u.id] = u.email ?? ""; });

  const profileMap: Record<string, string> = {};
  ((profiles as { id: string; full_name: string | null }[]) ?? []).forEach((p) => {
    profileMap[p.id] = p.full_name ?? "";
  });

  return await Promise.all(
    (events as Event[]).map(async (event) => {
      const [photosRes, guestsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("event_photos").select("id", { count: "exact", head: true }).eq("event_id", event.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("guests").select("id", { count: "exact", head: true }).eq("event_id", event.id),
      ]);

      return {
        ...event,
        ownerName: profileMap[event.owner_id] ?? null,
        ownerEmail: emailMap[event.owner_id] ?? null,
        photoCount: photosRes.count ?? 0,
        guestCount: guestsRes.count ?? 0,
      } as AdminEventRow;
    })
  );
}

// -------------------------------------------------------
// Create a photographer account
// -------------------------------------------------------
export async function createPhotographer(payload: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  bio?: string;
  plan?: "free" | "pro" | "unlimited";
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.full_name },
  });

  if (error) return { success: false, error: error.message };

  const plan = payload.plan ?? "free";
  const maxEvents = plan === "free" ? 1 : plan === "pro" ? 5 : 999999;
  const maxStorage = plan === "free" ? 10 : plan === "pro" ? 100 : 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("profiles").upsert({
    id: data.user.id,
    full_name: payload.full_name,
    role: "photographer",
    phone: payload.phone ?? null,
    bio: payload.bio ?? null,
    plan,
    max_events: maxEvents,
    max_storage_gb: maxStorage,
  });

  return { success: true };
}

// -------------------------------------------------------
// Update a photographer profile
// -------------------------------------------------------
export async function updatePhotographer(
  id: string,
  payload: {
    full_name?: string;
    phone?: string;
    bio?: string;
    plan?: "free" | "pro" | "unlimited";
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...payload };
  if (payload.plan) {
    updates.max_events = payload.plan === "free" ? 1 : payload.plan === "pro" ? 5 : 999999;
    updates.max_storage_gb = payload.plan === "free" ? 10 : payload.plan === "pro" ? 100 : 1000;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -------------------------------------------------------
// Delete a photographer account
// -------------------------------------------------------
export async function deletePhotographer(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

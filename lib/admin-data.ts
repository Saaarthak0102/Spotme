// ============================================================
// lib/admin-data.ts — Admin-only Supabase queries
// Uses service role client for full access (server-side only)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import type { Profile, Event, EventPhoto, Guest, Inquiry, InquiryInsert } from "@/types/database";

export type { Profile, Event, EventPhoto, Guest, Inquiry, InquiryInsert };

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
  todayPhotos: number;
  todaySelfies: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = getAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    photographersRes,
    eventsRes,
    photosRes,
    guestsRes,
    activeEventsRes,
    monthEventsRes,
    monthPhotosRes,
    monthGuestsRes,
    todayPhotosRes,
    todaySelfiesRes,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("event_photos").select("id", { count: "exact", head: true }).gte("uploaded_at", todayStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("guest_selfies").select("id", { count: "exact", head: true }).gte("uploaded_at", todayStart),
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
    todayPhotos: todayPhotosRes.count ?? 0,
    todaySelfies: todaySelfiesRes.count ?? 0,
  };
}

// -------------------------------------------------------
// Chart & analytics data
// -------------------------------------------------------
export interface AdminChartData {
  eventTypeBreakdown: { type: string; count: number }[];
  planDistribution: { plan: string; count: number }[];
  monthlyGrowth: { month: string; events: number; photos: number; guests: number }[];
  eventStatusBreakdown: { status: string; count: number }[];
  topPhotographers: { name: string; photos: number; events: number }[];
  recentActivity: { type: string; description: string; time: string }[];
}

export async function fetchEventTypeBreakdown(): Promise<{ type: string; count: number }[]> {
  const supabase = getAdminClient();
  const types = ["marriage", "hackathon", "meetup", "corporate", "other"];
  const results = await Promise.all(
    types.map(async (t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", t);
      return { type: t, count: count ?? 0 };
    })
  );
  return results.filter((r) => r.count > 0);
}

export async function fetchPlanDistribution(): Promise<{ plan: string; count: number }[]> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("plan")
    .eq("role", "photographer");

  if (error || !data) return [];

  // Count occurrences
  const counts: Record<string, number> = {};
  data.forEach((p: { plan: string }) => {
    counts[p.plan] = (counts[p.plan] || 0) + 1;
  });

  // Ensure all active plans are represented, even with 0 counts, so they show up on the admin chart
  const activePlans = ["free", "starter", "pro", "studio_basic", "studio_pro", "custom"];
  activePlans.forEach((p) => {
    if (counts[p] === undefined) {
      counts[p] = 0;
    }
  });

  return Object.entries(counts).map(([plan, count]) => ({ plan, count }));
}

export async function fetchMonthlyGrowth(): Promise<{ month: string; events: number; photos: number; guests: number }[]> {
  const supabase = getAdminClient();
  const months: { month: string; events: number; photos: number; guests: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const label = d.toLocaleDateString("en-US", { month: "short" });

    const [evRes, phRes, guRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("events").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("event_photos").select("id", { count: "exact", head: true }).gte("uploaded_at", start).lt("uploaded_at", end),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("guests").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
    ]);

    months.push({ month: label, events: evRes.count ?? 0, photos: phRes.count ?? 0, guests: guRes.count ?? 0 });
  }

  return months;
}

export async function fetchEventStatusBreakdown(): Promise<{ status: string; count: number }[]> {
  const supabase = getAdminClient();
  const statuses = ["draft", "active", "archived"];
  const results = await Promise.all(
    statuses.map(async (s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      return { status: s, count: count ?? 0 };
    })
  );
  return results;
}

export async function fetchTopPhotographers(limit = 5): Promise<{ name: string; photos: number; events: number }[]> {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, full_name")
    .eq("role", "photographer");

  if (!profiles?.length) return [];

  const rows = await Promise.all(
    (profiles as { id: string; full_name: string | null }[]).map(async (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: events } = await (supabase as any)
        .from("events")
        .select("id")
        .eq("owner_id", p.id);

      const eventIds = ((events as { id: string }[]) ?? []).map((e) => e.id);
      let photoCount = 0;
      if (eventIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any)
          .from("event_photos")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds);
        photoCount = count ?? 0;
      }

      return { name: p.full_name ?? "Unknown", photos: photoCount, events: eventIds.length };
    })
  );

  return rows.sort((a, b) => b.photos - a.photos).slice(0, limit);
}

export async function fetchRecentActivity(limit = 10): Promise<{ type: string; description: string; time: string }[]> {
  const supabase = getAdminClient();
  const activity: { type: string; description: string; time: string }[] = [];

  // Recent events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentEvents } = await (supabase as any)
    .from("events")
    .select("name, event_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  ((recentEvents as { name: string; event_type: string; created_at: string }[]) ?? []).forEach((e) => {
    activity.push({
      type: "event",
      description: `New ${e.event_type} event "${e.name}" created`,
      time: e.created_at,
    });
  });

  // Recent photographers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentPhotographers } = await (supabase as any)
    .from("profiles")
    .select("full_name, created_at")
    .eq("role", "photographer")
    .order("created_at", { ascending: false })
    .limit(5);

  ((recentPhotographers as { full_name: string | null; created_at: string }[]) ?? []).forEach((p) => {
    activity.push({
      type: "photographer",
      description: `${p.full_name ?? "A photographer"} joined the platform`,
      time: p.created_at,
    });
  });

  // Recent guests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentGuests } = await (supabase as any)
    .from("guests")
    .select("display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  ((recentGuests as { display_name: string | null; created_at: string }[]) ?? []).forEach((g) => {
    activity.push({
      type: "guest",
      description: `${g.display_name ?? "A guest"} registered for an event`,
      time: g.created_at,
    });
  });

  // Sort by time descending and take the limit
  return activity
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit);
}

export async function fetchAllChartData(): Promise<AdminChartData> {
  const [eventTypeBreakdown, planDistribution, monthlyGrowth, eventStatusBreakdown, topPhotographers, recentActivity] = await Promise.all([
    fetchEventTypeBreakdown(),
    fetchPlanDistribution(),
    fetchMonthlyGrowth(),
    fetchEventStatusBreakdown(),
    fetchTopPhotographers(),
    fetchRecentActivity(),
  ]);
  return { eventTypeBreakdown, planDistribution, monthlyGrowth, eventStatusBreakdown, topPhotographers, recentActivity };
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
  identifiedCount: number;
  selfieCount: number;
  totalFaces: number;
  indexedPhotoCount: number;
  totalStorageBytes: number;
  totalProcessingTime: number;
}

export interface AdminEventBasicRow {
  id: string;
  name: string;
  event_date: string | null;
  event_type: string;
  venue: string | null;
  status: string;
  ownerName: string | null;
  ownerEmail: string | null;
}

export async function fetchAllEventsBasic(limit = 1000): Promise<AdminEventBasicRow[]> {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events, error } = await (supabase as any)
    .from("events")
    .select("id, name, event_date, event_type, venue, status, owner_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !events?.length) return [];

  const ownerIds = [...new Set((events as { owner_id: string }[]).map((e) => e.owner_id))];

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

  return events.map((event: any) => ({
    id: event.id,
    name: event.name,
    event_date: event.event_date,
    event_type: event.event_type,
    venue: event.venue,
    status: event.status,
    ownerName: profileMap[event.owner_id] ?? null,
    ownerEmail: emailMap[event.owner_id] ?? null,
  }));
}

export async function fetchAllEvents(limit = 10, offset = 0): Promise<AdminEventRow[]> {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events, error } = await (supabase as any)
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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
      const [photosRes, guestsRes, selfiesRes, matchesRes, facesRes, indexedPhotosRes, storageAndProcessingRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("event_photos").select("id", { count: "exact", head: true }).eq("event_id", event.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("guests").select("id", { count: "exact", head: true }).eq("event_id", event.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("guest_selfies").select("id", { count: "exact", head: true }).eq("event_id", event.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("photo_matches").select("guest_id").eq("event_id", event.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("face_embeddings").select("id", { count: "exact", head: true }).eq("event_id", event.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("event_photos").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("face_indexed", true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("event_photos").select("file_size_bytes, processing_time").eq("event_id", event.id),
      ]);

      const matchedGuestIds = new Set(((matchesRes.data as { guest_id: string }[]) ?? []).map((m) => m.guest_id));
      const photoData = (storageAndProcessingRes.data as { file_size_bytes: number | null; processing_time: number | null }[]) ?? [];

      const totalStorageBytes = photoData.reduce((acc, p) => acc + (p.file_size_bytes ?? 0), 0);
      const totalProcessingTime = photoData.reduce((acc, p) => acc + (p.processing_time ?? 0), 0);

      return {
        ...event,
        ownerName: profileMap[event.owner_id] ?? null,
        ownerEmail: emailMap[event.owner_id] ?? null,
        photoCount: photosRes.count ?? 0,
        guestCount: guestsRes.count ?? 0,
        identifiedCount: matchedGuestIds.size,
        selfieCount: selfiesRes.count ?? 0,
        totalFaces: facesRes.count ?? 0,
        indexedPhotoCount: indexedPhotosRes.count ?? 0,
        totalStorageBytes,
        totalProcessingTime,
      } as AdminEventRow;
    })
  );
}

// ── Plan entitlement configuration (single source of truth) ─────────────────
// Keep in sync with app/api/payments/upgrade/route.ts PLAN_CONFIG
const PLAN_ENTITLEMENTS: Record<string, { maxEvents: number; maxStorageGb: number }> = {
  free: { maxEvents: 1, maxStorageGb: 5 },
  starter: { maxEvents: 1, maxStorageGb: 20 },
  pro: { maxEvents: 4, maxStorageGb: 60 },
  studio_basic: { maxEvents: 5, maxStorageGb: 40 },
  studio_pro: { maxEvents: 999999, maxStorageGb: 100 },
  custom: { maxEvents: 999999, maxStorageGb: 1000 },
  // Backwards compatibility for legacy users in DB
  unlimited: { maxEvents: 999999, maxStorageGb: 1000 },
};

// -------------------------------------------------------
// Create a photographer account
// -------------------------------------------------------
export async function createPhotographer(payload: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  bio?: string;
  plan?: "free" | "starter" | "pro" | "studio_basic" | "studio_pro" | "custom";
  disabled_features?: string[];
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
  const { maxEvents, maxStorageGb } = PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("profiles").upsert({
    id: data.user.id,
    full_name: payload.full_name,
    role: "photographer",
    phone: payload.phone ?? null,
    bio: payload.bio ?? null,
    plan,
    max_events: maxEvents,
    max_storage_gb: maxStorageGb,
    disabled_features: payload.disabled_features ?? [],
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
    plan?: "free" | "starter" | "pro" | "studio_basic" | "studio_pro" | "custom";
    disabled_features?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...payload };
  if (payload.plan) {
    const { maxEvents, maxStorageGb } = PLAN_ENTITLEMENTS[payload.plan] ?? PLAN_ENTITLEMENTS.free;
    updates.max_events = maxEvents;
    updates.max_storage_gb = maxStorageGb;
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

// -------------------------------------------------------
// Inquiries — public submission & admin review
// -------------------------------------------------------
export type InquiryRow = Inquiry;

export async function insertInquiry(payload: InquiryInsert): Promise<{ data: Inquiry | null; error?: string }> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("inquiries")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data };
}

export async function fetchInquiries(): Promise<Inquiry[]> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[lib/admin-data] Error fetching inquiries:", error.message);
    return [];
  }
  return data ?? [];
}

export async function deleteInquiry(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("inquiries")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -------------------------------------------------------
// System Settings — Global Feature Flags
// -------------------------------------------------------
export async function fetchGlobalSettings(): Promise<string[]> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("system_settings")
    .select("value")
    .eq("key", "disabled_features")
    .maybeSingle();

  if (error || !data) {
    console.error("[lib/admin-data] Error fetching global settings:", error?.message);
    return [];
  }
  return (data.value as string[]) ?? [];
}

export async function updateGlobalSettings(disabledFeatures: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("system_settings")
    .upsert({
      key: "disabled_features",
      value: disabledFeatures,
      updated_at: new Date().toISOString(),
    });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function restartEventFaceDetection(eventId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // 1. Delete matches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: matchesErr } = await (supabase as any)
    .from("photo_matches")
    .delete()
    .eq("event_id", eventId);

  if (matchesErr) {
    console.error("[admin-data] Failed to clear photo matches:", matchesErr.message);
    return { success: false, error: matchesErr.message };
  }

  // 2. Delete face embeddings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: embeddingsErr } = await (supabase as any)
    .from("face_embeddings")
    .delete()
    .eq("event_id", eventId);

  if (embeddingsErr) {
    console.error("[admin-data] Failed to clear face embeddings:", embeddingsErr.message);
    return { success: false, error: embeddingsErr.message };
  }

  // 3. Reset indexed flag on event photos (legacy polling worker reads face_indexed = false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: photosErr, data: resetPhotos } = await (supabase as any)
    .from("event_photos")
    .update({ face_indexed: false, face_indexed_at: null, processing_time: 0 })
    .eq("event_id", eventId)
    .select("id, public_url");

  if (photosErr) {
    console.error("[admin-data] Failed to reset event photos:", photosErr.message);
    return { success: false, error: photosErr.message };
  }

  // 4. Also cancel stale processing_queue jobs for this event (avoid conflicts with new ones)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("processing_queue")
      .update({ status: "dead", error_msg: "Cancelled by restart face detection" })
      .eq("event_id", eventId)
      .in("status", ["pending", "processing"])
      .eq("job_type", "index_photo");
  } catch {
    // Non-fatal if processing_queue table doesn't exist (pre-migration 018)
  }

  // 5. Insert fresh index_photo jobs into processing_queue for each photo
  //    This works with the queue-based worker (migration 018).
  //    The legacy polling worker already handles face_indexed = false above.
  if (Array.isArray(resetPhotos) && resetPhotos.length > 0) {
    try {
      const queueJobs = (resetPhotos as { id: string; public_url: string }[]).map((photo) => ({
        job_type: "index_photo",
        payload: { photo_id: photo.id, event_id: eventId, public_url: photo.public_url },
        event_id: eventId,
        priority: 10,
      }));

      // Batch insert in chunks of 100 to avoid payload limits
      const CHUNK = 100;
      for (let i = 0; i < queueJobs.length; i += CHUNK) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertErr } = await (supabase as any)
          .from("processing_queue")
          .insert(queueJobs.slice(i, i + CHUNK));
        if (insertErr) {
          console.warn(`[admin-data] Could not insert queue jobs (chunk ${i}):`, insertErr.message);
        }
      }
      console.log(`[admin-data] Enqueued ${queueJobs.length} index_photo jobs for event ${eventId}`);
    } catch (err) {
      // Non-fatal — legacy worker handles face_indexed = false as fallback
      console.warn("[admin-data] processing_queue insert skipped (table may not exist):", err);
    }
  }

  // 6. Reset any stuck guest selfies back to 'uploaded' so they get re-processed
  //    and insert embed_selfie jobs for them as well
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stuckSelfies } = await (supabase as any)
      .from("guest_selfies")
      .update({ status: "uploaded" })
      .eq("event_id", eventId)
      .in("status", ["processing", "no_face"])
      .select("id, guest_id, public_url");

    if (Array.isArray(stuckSelfies) && stuckSelfies.length > 0) {
      const selfieJobs = (stuckSelfies as { id: string; guest_id: string; public_url: string }[]).map(
        (selfie) => ({
          job_type: "embed_selfie",
          payload: {
            selfie_id: selfie.id,
            guest_id: selfie.guest_id,
            event_id: eventId,
            public_url: selfie.public_url,
          },
          event_id: eventId,
          priority: 1,
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("processing_queue").insert(selfieJobs);
      console.log(`[admin-data] Re-queued ${selfieJobs.length} embed_selfie jobs for event ${eventId}`);
    }
  } catch (err) {
    // Non-fatal
    console.warn("[admin-data] Could not re-queue selfie jobs:", err);
  }

  return { success: true };
}


// -------------------------------------------------------
// KPI Analytics — page_visits queries
// -------------------------------------------------------

// -------------------------------------------------------
// KPI Analytics — expanded dashboard queries
// -------------------------------------------------------

export interface ExtendedKPIData {
  // Traffic & Marketing
  totalVisitors: number;
  visitorGrowthRate: number | null; // % growth week-over-week
  topSources: { source: string; visits: number }[];
  signupsBySource: { source: string; signups: number }[];
  conversionRateBySource: { source: string; rate: number }[];
  
  // Sales & Conversion
  homepageToPricingRate: number;
  pricingToInquiryRate: number;
  visitorToCustomerRate: number;
  
  // User Engagement
  returningVisitorRate: number;
  avgPagesPerSession: number;
  avgSessionDurationSec: number | null; // approximate, based on page_visits timestamps
  userRetentionRate: number | null; // % of this-week visitors that also visited last week
  
  // Photographer Success
  activePhotographers: number;
  newPhotographersOnboarded: number; // Last 30 days
  repeatPhotographerRate: number;
  avgEventsPerPhotographer: number;
  
  // Feature & Page Analytics
  pageVisits: { page: string; visits: number }[];
  highestDropOffPage: string | null;
  funnelDropOffStep: string | null;
  
  // Event-based KPIs (from user_events table)
  mostClickedButton: string | null;
  mostClickedButtonCount: number;
  ctaClickRate: number | null; // % of visitors who clicked any CTA
  mostUsedFeature: string | null;
  mostUsedFeatureCount: number;
  leastUsedFeature: string | null;
  leastUsedFeatureCount: number;
  photoSearchCount: number;
  photoSearchRate: number | null; // searches / gallery visitors
  photoDownloadCount: number;
  photoDownloadRate: number | null; // downloads / gallery visitors
  zeroResultSearches: number;
  
  // Business Metrics
  totalInquiries: number;
  payingCustomers: number;
  mrr: number; // in INR (paise) or formatted
  avgRevenuePerCustomer: number;
}

export async function fetchExtendedKPIData(): Promise<ExtendedKPIData> {
  const supabase = getAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const last7Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
  const last14Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14).toISOString();
  const last30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();

  // 1. Fetch page visits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allVisits } = await (supabase as any)
    .from("page_visits")
    .select("page_path, utm_source, session_id, visited_at")
    .order("visited_at", { ascending: false })
    .limit(50000); // Safety cap

  const visits = (allVisits as { page_path: string; utm_source: string | null; session_id: string; visited_at: string }[]) ?? [];

  // 2. Fetch profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, role, plan, signup_session_id, created_at");
    
  const allProfiles = (profiles as { id: string; role: string; plan: string; signup_session_id: string | null; created_at: string }[]) ?? [];

  // 3. Fetch events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .from("events")
    .select("owner_id, created_at, status");
    
  const allEvents = (events as { owner_id: string; created_at: string; status: string }[]) ?? [];

  // 4. Fetch inquiries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inquiries } = await (supabase as any)
    .from("inquiries")
    .select("id, created_at");
    
  const allInquiries = (inquiries as { id: string; created_at: string }[]) ?? [];

  // --- TRAFFIC & MARKETING ---
  const sessionSources: Record<string, string> = {}; // session_id -> utm_source
  const sessionDays: Record<string, Set<string>> = {}; // session_id -> Set of YYYY-MM-DD
  const pageCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  
  let currentWeekVisitors = new Set<string>();
  let previousWeekVisitors = new Set<string>();

  visits.forEach(v => {
    const src = v.utm_source || "Direct";
    if (!sessionSources[v.session_id]) {
      sessionSources[v.session_id] = src;
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    
    pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
    
    const day = v.visited_at.split("T")[0];
    if (!sessionDays[v.session_id]) sessionDays[v.session_id] = new Set();
    sessionDays[v.session_id].add(day);
    
    if (v.visited_at >= last7Start) currentWeekVisitors.add(v.session_id);
    else if (v.visited_at >= last14Start && v.visited_at < last7Start) previousWeekVisitors.add(v.session_id);
  });

  const totalVisitors = Object.keys(sessionSources).length;
  let visitorGrowthRate = null;
  if (previousWeekVisitors.size > 0) {
    visitorGrowthRate = ((currentWeekVisitors.size - previousWeekVisitors.size) / previousWeekVisitors.size) * 100;
  }

  const topSources = Object.entries(sourceCounts)
    .map(([source, visits]) => ({ source, visits }))
    .sort((a, b) => b.visits - a.visits);
    
  const pageVisits = Object.entries(pageCounts)
    .map(([page, visits]) => ({ page, visits }))
    .sort((a, b) => b.visits - a.visits);

  const signupsBySourceMap: Record<string, number> = {};
  let totalSignupsWithSessions = 0;
  allProfiles.forEach(p => {
    if (p.signup_session_id && sessionSources[p.signup_session_id]) {
      const src = sessionSources[p.signup_session_id];
      signupsBySourceMap[src] = (signupsBySourceMap[src] || 0) + 1;
      totalSignupsWithSessions++;
    }
  });
  
  const signupsBySource = Object.entries(signupsBySourceMap)
    .map(([source, signups]) => ({ source, signups }))
    .sort((a, b) => b.signups - a.signups);
    
  const conversionRateBySource = topSources.map(s => {
    const signups = signupsBySourceMap[s.source] || 0;
    return { source: s.source, rate: s.visits > 0 ? (signups / s.visits) * 100 : 0 };
  });

  // --- SALES & CONVERSION ---
  // Funnel tracking per session
  const sessionFunnels: Record<string, Set<string>> = {};
  visits.forEach(v => {
    if (!sessionFunnels[v.session_id]) sessionFunnels[v.session_id] = new Set();
    sessionFunnels[v.session_id].add(v.page_path);
  });

  let sessionsWithHome = 0;
  let sessionsWithPricing = 0;
  let sessionsWithInquire = 0;

  Object.values(sessionFunnels).forEach(pages => {
    if (pages.has("/")) sessionsWithHome++;
    if (pages.has("/pricing")) sessionsWithPricing++;
    if (pages.has("/pricing") && pages.has("/inquire")) sessionsWithInquire++;
  });

  const homepageToPricingRate = sessionsWithHome > 0 ? (sessionsWithPricing / sessionsWithHome) * 100 : 0;
  const pricingToInquiryRate = sessionsWithPricing > 0 ? (sessionsWithInquire / sessionsWithPricing) * 100 : 0;
  
  let customersWithSessions = 0;
  allProfiles.forEach(p => {
    if (p.plan !== 'free' && p.signup_session_id && sessionSources[p.signup_session_id]) {
      customersWithSessions++;
    }
  });
  const visitorToCustomerRate = totalVisitors > 0 ? (customersWithSessions / totalVisitors) * 100 : 0;

  // --- USER ENGAGEMENT ---
  let returningSessions = 0;
  Object.values(sessionDays).forEach(days => {
    if (days.size > 1) returningSessions++;
  });
  const returningVisitorRate = totalVisitors > 0 ? (returningSessions / totalVisitors) * 100 : 0;
  const avgPagesPerSession = totalVisitors > 0 ? visits.length / totalVisitors : 0;

  // --- PHOTOGRAPHER SUCCESS ---
  const photographers = allProfiles.filter(p => p.role === 'photographer');
  let newPhotographersOnboarded = 0;
  photographers.forEach(p => {
    if (p.created_at >= last30Start) newPhotographersOnboarded++;
  });
  
  const eventsPerPhotographer: Record<string, number> = {};
  let activePhotographers = 0;
  
  allEvents.forEach(e => {
    eventsPerPhotographer[e.owner_id] = (eventsPerPhotographer[e.owner_id] || 0) + 1;
    if (e.created_at >= last30Start) activePhotographers++;
  });
  
  // Count unique active photographers in last 30 days
  const activePhotographerIds = new Set(allEvents.filter(e => e.created_at >= last30Start).map(e => e.owner_id));
  activePhotographers = activePhotographerIds.size;
  
  let repeatPhotographers = 0;
  Object.values(eventsPerPhotographer).forEach(count => {
    if (count > 1) repeatPhotographers++;
  });
  
  const repeatPhotographerRate = photographers.length > 0 ? (repeatPhotographers / photographers.length) * 100 : 0;
  const avgEventsPerPhotographer = photographers.length > 0 ? allEvents.length / photographers.length : 0;

  // --- FEATURE & PAGE ANALYTICS ---
  // Highest drop off page
  const sessionLastPage: Record<string, string> = {};
  // Visited_at is descending, so the first one we see per session is the last page they visited
  visits.forEach(v => {
    if (!sessionLastPage[v.session_id]) {
      sessionLastPage[v.session_id] = v.page_path;
    }
  });
  const dropOffCounts: Record<string, number> = {};
  Object.values(sessionLastPage).forEach(page => {
    dropOffCounts[page] = (dropOffCounts[page] || 0) + 1;
  });
  let highestDropOffPage = null;
  let maxDropOffs = 0;
  Object.entries(dropOffCounts).forEach(([page, count]) => {
    if (count > maxDropOffs) {
      maxDropOffs = count;
      highestDropOffPage = page;
    }
  });
  
  // Funnel drop-off step
  let funnelDropOffStep = null;
  if (sessionsWithHome > sessionsWithPricing) {
    funnelDropOffStep = "Homepage to Pricing";
  } else if (sessionsWithPricing > sessionsWithInquire) {
    funnelDropOffStep = "Pricing to Inquire";
  } else if (sessionsWithInquire > 0) {
    funnelDropOffStep = "Inquire Form Submitted";
  }

  // --- BUSINESS METRICS ---
  const totalInquiries = allInquiries.length;
  
  let payingCustomers = 0;
  let mrr = 0; // in Paise
  
  // Map from PLAN_PRICES in create-order/route.ts
  const PLAN_PRICES: Record<string, number> = {
    starter: 49900,
    pro: 99900,
    studio_basic: 69900,
    studio_pro: 159900,
  };
  
  allProfiles.forEach(p => {
    if (p.plan && p.plan !== 'free' && PLAN_PRICES[p.plan]) {
      payingCustomers++;
      mrr += PLAN_PRICES[p.plan];
    }
  });
  
  const avgRevenuePerCustomer = payingCustomers > 0 ? mrr / payingCustomers : 0;

  // --- SESSION DURATION (approximate: gap between first and last page_visits per session) ---
  const sessionTimestamps: Record<string, { min: number; max: number }> = {};
  visits.forEach(v => {
    const ts = new Date(v.visited_at).getTime();
    if (!sessionTimestamps[v.session_id]) {
      sessionTimestamps[v.session_id] = { min: ts, max: ts };
    } else {
      if (ts < sessionTimestamps[v.session_id].min) sessionTimestamps[v.session_id].min = ts;
      if (ts > sessionTimestamps[v.session_id].max) sessionTimestamps[v.session_id].max = ts;
    }
  });
  
  let totalDurationMs = 0;
  let multiPageSessions = 0;
  Object.values(sessionTimestamps).forEach(({ min, max }) => {
    const duration = max - min;
    if (duration > 0) {
      totalDurationMs += duration;
      multiPageSessions++;
    }
  });
  const avgSessionDurationSec = multiPageSessions > 0 ? (totalDurationMs / multiPageSessions) / 1000 : null;

  // --- USER RETENTION (session_id based: % of this-week sessions that also appeared last week) ---
  let userRetentionRate: number | null = null;
  if (currentWeekVisitors.size > 0 && previousWeekVisitors.size > 0) {
    let retained = 0;
    currentWeekVisitors.forEach(sid => {
      if (previousWeekVisitors.has(sid)) retained++;
    });
    userRetentionRate = (retained / currentWeekVisitors.size) * 100;
  }

  // --- EVENT-BASED KPIs (from user_events table) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userEvents } = await (supabase as any)
    .from("user_events")
    .select("event_type, event_label, session_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50000);
  
  const allUserEvents = (userEvents as { event_type: string; event_label: string | null; session_id: string; metadata: Record<string, unknown> | null; created_at: string }[]) ?? [];

  // Most Clicked Button
  const buttonClicks: Record<string, number> = {};
  let totalButtonClicks = 0;
  const ctaClickSessions = new Set<string>();
  
  allUserEvents.forEach(e => {
    if (e.event_type === "button_click" && e.event_label) {
      buttonClicks[e.event_label] = (buttonClicks[e.event_label] || 0) + 1;
      totalButtonClicks++;
      ctaClickSessions.add(e.session_id);
    }
  });
  
  let mostClickedButton: string | null = null;
  let mostClickedButtonCount = 0;
  Object.entries(buttonClicks).forEach(([label, count]) => {
    if (count > mostClickedButtonCount) {
      mostClickedButtonCount = count;
      mostClickedButton = label;
    }
  });
  
  const ctaClickRate = totalVisitors > 0 ? (ctaClickSessions.size / totalVisitors) * 100 : null;

  // Photo Search & Download rates
  let photoSearchCount = 0;
  let zeroResultSearches = 0;
  let photoDownloadCount = 0;
  
  allUserEvents.forEach(e => {
    if (e.event_type === "photo_search") {
      photoSearchCount++;
    }
    if (e.event_type === "zero_result_search") {
      zeroResultSearches++;
    }
    if (e.event_type === "photo_download") {
      photoDownloadCount++;
    }
  });

  const featureCounts: Record<string, number> = {
    "upload_photos": 0,
    "create_event": 0,
    "manage_collaborators": 0,
    "download_photos": 0,
    "share_qr": 0,
  };

  allUserEvents.forEach(e => {
    if (e.event_type === "feature_use") {
      if (e.event_label === "share_qr_download" || e.event_label === "share_qr_copy_link") {
        featureCounts["share_qr"]++;
      } else if (e.event_label && featureCounts[e.event_label] !== undefined) {
        featureCounts[e.event_label]++;
      }
    }
  });

  let mostUsedFeature: string | null = null;
  let mostUsedFeatureCount = 0;
  let leastUsedFeature: string | null = null;
  let leastUsedFeatureCount = 0;

  const featureEntries = Object.entries(featureCounts);
  const totalFeaturesUsed = featureEntries.reduce((sum, [_, c]) => sum + c, 0);

  if (totalFeaturesUsed > 0) {
    featureEntries.sort((a, b) => b[1] - a[1]);
    mostUsedFeature = featureEntries[0][0];
    mostUsedFeatureCount = featureEntries[0][1];
    leastUsedFeature = featureEntries[featureEntries.length - 1][0];
    leastUsedFeatureCount = featureEntries[featureEntries.length - 1][1];
  }

  // Gallery visitors (pages containing /event/ and /gallery or /find-me)
  const galleryVisitorSessions = new Set<string>();
  visits.forEach(v => {
    if (v.page_path.includes('/event/') && (v.page_path.includes('/gallery') || v.page_path.includes('/find-me') || v.page_path.includes('/my-photos'))) {
      galleryVisitorSessions.add(v.session_id);
    }
  });
  const galleryVisitors = galleryVisitorSessions.size;
  
  const photoSearchRate = galleryVisitors > 0 ? (photoSearchCount / galleryVisitors) * 100 : null;
  const photoDownloadRate = galleryVisitors > 0 ? (photoDownloadCount / galleryVisitors) * 100 : null;

  return {
    totalVisitors,
    visitorGrowthRate,
    topSources,
    signupsBySource,
    conversionRateBySource,
    homepageToPricingRate,
    pricingToInquiryRate,
    visitorToCustomerRate,
    returningVisitorRate,
    avgPagesPerSession,
    avgSessionDurationSec,
    userRetentionRate,
    activePhotographers,
    newPhotographersOnboarded,
    repeatPhotographerRate,
    avgEventsPerPhotographer,
    pageVisits,
    highestDropOffPage,
    funnelDropOffStep,
    mostClickedButton,
    mostClickedButtonCount,
    ctaClickRate,
    mostUsedFeature,
    mostUsedFeatureCount,
    leastUsedFeature,
    leastUsedFeatureCount,
    photoSearchCount,
    photoSearchRate,
    photoDownloadCount,
    photoDownloadRate,
    zeroResultSearches,
    totalInquiries,
    payingCustomers,
    mrr,
    avgRevenuePerCustomer
  };
}

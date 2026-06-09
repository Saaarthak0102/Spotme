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
  free:         { maxEvents: 1,      maxStorageGb: 5    },
  starter:      { maxEvents: 1,      maxStorageGb: 20   },
  pro:          { maxEvents: 4,      maxStorageGb: 60   },
  studio_basic: { maxEvents: 5,      maxStorageGb: 40   },
  studio_pro:   { maxEvents: 999999, maxStorageGb: 100  },
  custom:       { maxEvents: 999999, maxStorageGb: 1000 },
  // Backwards compatibility for legacy users in DB
  unlimited:    { maxEvents: 999999, maxStorageGb: 1000 },
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

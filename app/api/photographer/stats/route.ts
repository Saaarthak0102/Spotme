import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch profiles table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: pError } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (pError || !profile) {
    return NextResponse.json({
      error: "Profile not found",
      details: pError ? pError.message : "No profile record",
      code: pError ? pError.code : null,
      hint: pError ? pError.hint : null
    }, { status: 404 });
  }

  // 2. Fetch all events owned by user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events, error: eError } = await (supabase as any)
    .from("events")
    .select("id, name, event_type, status, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (eError) {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }

  const eventIds = (events ?? []).map((e: { id: string }) => e.id);

  // 3. Initialize aggregate structures
  let totalPhotos = 0;
  let totalStorageBytes = 0;
  let rawStorageBytes = 0;
  let jpegStorageBytes = 0;
  let heicStorageBytes = 0;
  let otherStorageBytes = 0;

  const eventStorageMap: Record<string, { name: string; sizeBytes: number; photoCount: number }> = {};
  (events ?? []).forEach((e: { id: string; name: string }) => {
    eventStorageMap[e.id] = { name: e.name, sizeBytes: 0, photoCount: 0 };
  });

  let recentFiles: Array<{
    id: string;
    name: string;
    eventName: string;
    sizeBytes: number;
    mimeType: string;
    uploadedAt: string;
  }> = [];

  // 4. Fetch photos if events exist
  if (eventIds.length > 0) {
    // Fetch photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photos, error: phError } = await (supabase as any)
      .from("event_photos")
      .select("id, event_id, original_filename, file_size_bytes, mime_type, uploaded_at")
      .in("event_id", eventIds)
      .order("uploaded_at", { ascending: false });

    if (!phError && photos) {
      totalPhotos = photos.length;
      
      // Get the 5 most recent files
      const topPhotos = photos.slice(0, 5);
      recentFiles = topPhotos.map((p: {
        id: string;
        event_id: string;
        original_filename: string | null;
        file_size_bytes: number | null;
        mime_type: string | null;
        uploaded_at: string;
      }) => {
        const evName = eventStorageMap[p.event_id]?.name ?? "Unknown Event";
        return {
          id: p.id,
          name: p.original_filename ?? "unnamed_photo.jpg",
          eventName: evName,
          sizeBytes: p.file_size_bytes ?? 0,
          mimeType: p.mime_type ?? "image/jpeg",
          uploadedAt: p.uploaded_at
        };
      });

      // Sum sizes and map per extension/event
      photos.forEach((p: {
        event_id: string;
        original_filename: string | null;
        file_size_bytes: number | null;
        mime_type: string | null;
      }) => {
        const bytes = p.file_size_bytes ?? 0;
        totalStorageBytes += bytes;

        // Map by event
        if (eventStorageMap[p.event_id]) {
          eventStorageMap[p.event_id].sizeBytes += bytes;
          eventStorageMap[p.event_id].photoCount += 1;
        }

        // Map by format extension or mime type
        const filename = (p.original_filename ?? "").toLowerCase();
        const mime = (p.mime_type ?? "").toLowerCase();

        if (
          filename.endsWith(".raw") ||
          filename.endsWith(".dng") ||
          filename.endsWith(".cr2") ||
          filename.endsWith(".nef") ||
          filename.endsWith(".arw") ||
          mime.includes("raw") ||
          mime.includes("dng") ||
          mime.includes("image/x-canon-cr2") ||
          mime.includes("image/x-nikon-nef") ||
          mime.includes("image/x-sony-arw")
        ) {
          rawStorageBytes += bytes;
        } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg") || mime.includes("jpeg")) {
          jpegStorageBytes += bytes;
        } else if (filename.endsWith(".heic") || filename.endsWith(".heif") || mime.includes("heic")) {
          heicStorageBytes += bytes;
        } else {
          otherStorageBytes += bytes;
        }
      });
    }
  }

  // 5. Convert breakdowns to GB for convenient UI display
  const bytesToGb = (b: number) => Number((b / (1024 * 1024 * 1024)).toFixed(3));

  const fileTypesBreakdown = [
    { label: "RAW", sizeGB: bytesToGb(rawStorageBytes), color: "#D67D5C" },
    { label: "JPEG", sizeGB: bytesToGb(jpegStorageBytes), color: "#F4A261" },
    { label: "HEIC", sizeGB: bytesToGb(heicStorageBytes), color: "#E8C9A0" },
    { label: "Other", sizeGB: bytesToGb(otherStorageBytes), color: "#827970" },
  ];

  const eventsBreakdown = Object.entries(eventStorageMap).map(([id, data]) => ({
    id,
    name: data.name,
    sizeGB: bytesToGb(data.sizeBytes),
    sizeBytes: data.sizeBytes,
    photoCount: data.photoCount,
    icon: "photo_library"
  })).sort((a, b) => b.sizeBytes - a.sizeBytes);

  return NextResponse.json({
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: user.email,
      role: profile.role,
      phone: profile.phone,
      bio: profile.bio,
      plan: profile.plan,
      max_events: profile.max_events,
      max_storage_gb: profile.max_storage_gb,
      avatar_url: profile.avatar_url,
      updated_at: user.updated_at || profile.updated_at,
    },
    stats: {
      totalEvents: events.length,
      totalPhotos,
      usedStorageBytes: totalStorageBytes,
      usedStorageGB: bytesToGb(totalStorageBytes),
      fileTypesBreakdown,
      eventsBreakdown,
      recentFiles
    }
  });
}

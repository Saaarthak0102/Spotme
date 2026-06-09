import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasEventSession } from "@/lib/guest-session";

// ── F-17 Fix: Per-request factory — avoids silent env-var failures at module load
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const GALLERY_PAGE_SIZE = 24;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  // 1. Verify guest session cookie for this event
  const isAuthorized = await hasEventSession(eventId);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Fetch event details using the service-role client
    const adminClient = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventData, error: eventError } = await (adminClient as any)
      .from("events")
      .select("status, qr_active, privacy_mode")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData || eventData.status !== "active" || !eventData.qr_active) {
      return NextResponse.json({ error: "Event not found or inactive" }, { status: 404 });
    }

    // If privacy mode is enabled, guests must use the selfie matched photos flow
    if (eventData.privacy_mode === true) {
      return NextResponse.json({ photos: [], nextCursor: null });
    }

    // 3. Fetch event photos with cursor pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminClient as any)
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
      console.error("[guest/gallery] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const photos = data ?? [];
    const nextCursor =
      photos.length === GALLERY_PAGE_SIZE
        ? photos[photos.length - 1].uploaded_at
        : null;

    return NextResponse.json({ photos, nextCursor });
  } catch (err) {
    console.error("[guest/gallery] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { EventPhoto } from "@/types/database";
import { hasGuestSessionFor } from "@/lib/guest-session";

// Service role client needed because anon RLS read is disabled for security
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const guestId = req.nextUrl.searchParams.get("guestId");

  if (!eventId || !guestId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Verify this browser is bound to the requested guest for this event.
  const isAuthorized = await hasGuestSessionFor(eventId, guestId);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch matched photos, ordering by similarity descending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
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
      console.error("[guest/photos] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const photos = ((data ?? []) as Array<{ event_photos: EventPhoto }>)
      .map((row) => row.event_photos)
      .filter(Boolean);

    return NextResponse.json({ photos });
  } catch (err) {
    console.error("[guest/photos] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

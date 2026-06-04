import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasEventSession } from "@/lib/guest-session";

// Server-side admin client — uses service role key
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * POST /api/selfie/confirm
 *
 * Called after the browser has successfully uploaded the file directly to
 * Supabase Storage via a signed URL. Saves the guest_selfies DB record
 * and returns the public URL.
 *
 * Body: { storagePath: string, guestId: string, eventId: string }
 * Response: { publicUrl: string }
 *
 * H-1 fix: validates that `storagePath` follows the pattern
 * `selfies/{eventId}/{guestId}/...` so a caller cannot inject another
 * guest's ID and hijack their photo-match results.
 */
export async function POST(req: NextRequest) {
  try {
    const { storagePath, guestId, eventId } = await req.json();

    if (!storagePath || !eventId || !guestId) {
      return NextResponse.json(
        { error: "Missing storagePath, eventId, or guestId" },
        { status: 400 }
      );
    }

    // Verify guest session cookie for this event
    const isAuthorized = await hasEventSession(eventId);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── H-1 Fix: Validate storagePath ownership ───────────────────────────────
    // The upload-url route always sets: selfies/{eventId}/{guestId}/{timestamp}.{ext}
    // Reject anything that doesn't match this expected prefix.
    const expectedPrefix = `selfies/${eventId}/${guestId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      console.warn(
        `[selfie/confirm] Path mismatch — storagePath "${storagePath}" does not belong to guest "${guestId}" in event "${eventId}"`
      );
      return NextResponse.json(
        { error: "Storage path does not belong to this guest." },
        { status: 403 }
      );
    }

    // Also verify the guestId actually exists in this event (prevents fabricated IDs)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: guestRow } = await (adminSupabase as any)
      .from("guests")
      .select("id")
      .eq("id", guestId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (!guestRow) {
      return NextResponse.json(
        { error: "Guest not registered for this event." },
        { status: 403 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Build the public URL for this object
    const { data: urlData } = adminSupabase.storage
      .from("guest-selfies")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Delete old photo matches for this guest in this event since they are uploading a new selfie
    const { error: deleteMatchesError } = await adminSupabase
      .from("photo_matches")
      .delete()
      .eq("guest_id", guestId)
      .eq("event_id", eventId);

    if (deleteMatchesError) {
      console.error("[selfie/confirm] Failed to delete old photo matches:", deleteMatchesError.message);
    }

    const { error: dbError } = await adminSupabase
      .from("guest_selfies")
      .insert({
        guest_id: guestId,
        event_id: eventId,
        storage_path: storagePath,
        public_url: publicUrl,
        status: "uploaded",
      });

    if (dbError) {
      // Log but don't fail — file is in storage, AI can still pick it up
      console.error("[selfie/confirm] DB insert error:", dbError.message);
    }

    return NextResponse.json({ publicUrl }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[selfie/confirm] Unexpected:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { deleteEventStorage } from "@/lib/storage-cleanup";
import { checkCsrf } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/events/[eventId]
 *
 * Deletes the event database record (cascading table deletes) and purging all
 * related media files in Supabase Storage buckets (event-covers, event-photos, guest-selfies).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const { eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch the event to check ownership and retrieve the cover URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event, error: fetchError } = await (supabase as any)
      .from("events")
      .select("id, cover_url, owner_id")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Ensure the current user is the owner of the event
    if (event.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized to delete this event" }, { status: 403 });
    }

    // 2. Delete the event from public.events
    // This cascades the deletion to other DB tables (event_photos, guests, guest_selfies, face_embeddings, photo_matches)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      console.error(`Database deletion failed for event ${eventId}:`, deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 3. Delete files from Supabase Storage buckets (S3) using the service-role client
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
      await deleteEventStorage(adminSupabase, eventId, event.cover_url);
    } catch (storageErr) {
      // Log storage errors, but don't fail the response since DB records are already deleted
      console.error(`Storage cleanup failed for event ${eventId}:`, storageErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Unexpected error in event DELETE route:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

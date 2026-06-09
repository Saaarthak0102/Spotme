import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";
import { getPathFromUrl } from "@/lib/storage-cleanup";

export async function POST(req: NextRequest) {
  // F-09: CSRF check
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // F-14: Body size limit (photo metadata only — no file bytes come through here)
  const sizeError = checkBodySize(req, 16 * 1024);
  if (sizeError) return sizeError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, storage_path, public_url, original_filename, file_size_bytes, mime_type } = body as {
    event_id: string;
    storage_path: string;
    public_url: string | null;
    original_filename: string | null;
    file_size_bytes: number | null;
    mime_type: string | null;
  };

  if (!event_id || !storage_path) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the user owns this event or is a collaborator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hasAccess = false;
  
  const { data: ownedEvent } = await (supabase as any)
    .from("events")
    .select("id")
    .eq("id", event_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownedEvent) {
    hasAccess = true;
  } else {
    const { data: collab } = await (supabase as any)
      .from("event_collaborators")
      .select("id")
      .eq("event_id", event_id)
      .eq("email", user.email)
      .maybeSingle();
      
    if (collab) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized or Event not found" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("event_photos")
    .insert({ event_id, storage_path, public_url, original_filename, file_size_bytes, mime_type })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  // F-09: CSRF check
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing photo ID" }, { status: 400 });
  }

  // Fetch the photo record to verify ownership via event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: photo, error: fetchError } = await (supabase as any)
    .from("event_photos")
    .select("id, storage_path, thumb_url, medium_url, event_id, events:events!event_id(owner_id)")
    .eq("id", id)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Ensure current user is the owner of the event
  const eventOwnerId = (photo.events as any)?.owner_id;
  if (eventOwnerId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Create admin supabase client to delete from storage and database
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Delete original and variants (medium/thumb) from Supabase Storage (S3 bucket)
  const pathsToDelete = [photo.storage_path];
  
  if (photo.thumb_url) {
    const thumbPath = getPathFromUrl(photo.thumb_url, "event-photos");
    if (thumbPath) pathsToDelete.push(thumbPath);
  }
  
  if (photo.medium_url) {
    const mediumPath = getPathFromUrl(photo.medium_url, "event-photos");
    if (mediumPath) pathsToDelete.push(mediumPath);
  }

  const { error: storageError } = await adminSupabase.storage
    .from("event-photos")
    .remove(pathsToDelete);

  if (storageError) {
    console.error(`[api/photos DELETE] Storage deletion warning for paths [${pathsToDelete.join(", ")}]:`, storageError.message);
  }

  // 2. Delete from database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (adminSupabase as any)
    .from("event_photos")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error(`[api/photos DELETE] Database deletion failed for ${id}:`, dbError.message);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

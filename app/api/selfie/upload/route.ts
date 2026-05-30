import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side only — uses service role key so anon RLS policies don't block uploads
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;
    const guestId = formData.get("guestId") as string | null;

    if (!file || !eventId) {
      return NextResponse.json(
        { error: "Missing file or eventId" },
        { status: 400 }
      );
    }

    // Build a unique storage path
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)
      ? ext
      : "jpg";
    const storagePath = `selfies/${eventId}/${Date.now()}.${safeExt}`;

    // Convert File → ArrayBuffer → Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from("guest-selfies")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[selfie/upload] Storage error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = adminSupabase.storage
      .from("guest-selfies")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Persist record in guest_selfies table if guestId is provided
    if (guestId) {
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
        console.error("[selfie/upload] DB insert error:", dbError);
        // Don't fail — file is uploaded, AI can still process it
      }
    }

    return NextResponse.json({ storagePath, publicUrl }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    console.error("[selfie/upload] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

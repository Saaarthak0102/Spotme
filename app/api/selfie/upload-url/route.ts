import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side admin client — uses service role key
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * POST /api/selfie/upload-url
 *
 * Returns a short-lived signed upload URL so the browser can PUT the file
 * directly to Supabase Storage — completely bypassing Vercel's 4.5MB body limit.
 *
 * Security (S-05 fix): requires a valid `guestId` that exists in the specified
 * event. Without this, any caller with a known eventId could generate unlimited
 * signed upload URLs for storage exhaustion.
 *
 * Body: { eventId: string, guestId: string, ext: string }
 * Response: { signedUrl: string, storagePath: string, token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { eventId, guestId, ext: rawExt } = await req.json();

    if (!eventId || !guestId) {
      return NextResponse.json(
        { error: "Missing eventId or guestId" },
        { status: 400 }
      );
    }

    // ── S-05 Fix: Validate the guestId belongs to this event ─────────────────
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

    const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(
      (rawExt ?? "jpg").toLowerCase()
    )
      ? (rawExt as string).toLowerCase()
      : "jpg";

    // Include guestId in the path for easier per-guest auditing
    const storagePath = `selfies/${eventId}/${guestId}/${Date.now()}.${safeExt}`;

    // Create a signed URL valid for 5 minutes — enough for any upload
    const { data, error } = await adminSupabase.storage
      .from("guest-selfies")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("[selfie/upload-url] Failed to create signed URL:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath,
      token: data.token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[selfie/upload-url] Unexpected:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

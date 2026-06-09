import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasGuestSessionFor } from "@/lib/guest-session";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";

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
 * L-1 fix: admin client is created per-request so missing env vars are caught
 * and surfaced as a proper 500 rather than a silent module-load failure.
 *
 * Body: { eventId: string, guestId: string, ext: string }
 * Response: { signedUrl: string, storagePath: string, token: string }
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars are not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
export async function POST(req: NextRequest) {
  try {
    // F-09: CSRF check
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    // F-14: Body size limit
    const sizeError = checkBodySize(req, 8 * 1024);
    if (sizeError) return sizeError;

    const { eventId, guestId, ext: rawExt } = await req.json();

    if (!eventId || !guestId) {
      return NextResponse.json(
        { error: "Missing eventId or guestId" },
        { status: 400 }
      );
    }

    // Verify this browser is bound to the requested guest for this event.
    const isAuthorized = await hasGuestSessionFor(eventId, guestId);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getAdminClient();

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

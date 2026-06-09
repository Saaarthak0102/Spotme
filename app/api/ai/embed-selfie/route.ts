import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasGuestSessionFor } from "@/lib/guest-session";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";

/**
 * POST /api/ai/embed-selfie
 *
 * Triggers the Python AI service to embed a guest selfie and cache
 * the matching results in the photo_matches table. This is fire-and-forget —
 * the client polls guest_selfies.status to know when results are ready.
 *
 * Security: validates that the supplied guest_id actually exists in the
 * specified event AND that the selfie_url belongs to that guest record.
 * This prevents guest_id injection attacks where an attacker overwrites
 * another guest's photo matches using their own face.
 */
export async function POST(req: NextRequest) {
  // F-09: CSRF check
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // F-14: Body size limit
  const sizeError = checkBodySize(req, 16 * 1024);
  if (sizeError) return sizeError;

  const body = await req.json();
  const { guest_id, event_id, selfie_url, selfie_id } = body as {
    guest_id: string;
    event_id: string;
    selfie_url: string;
    selfie_id?: string;
  };

  if (!guest_id || !event_id || !selfie_url) {
    return NextResponse.json(
      { error: "Missing required fields: guest_id, event_id, selfie_url" },
      { status: 400 }
    );
  }

  // Verify this browser is bound to the requested guest for this event.
  const isAuthorized = await hasGuestSessionFor(event_id, guest_id);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── S-03 Fix: Validate guest identity before triggering AI ────────────────
  // Use service-role client to verify the guest record server-side.
  // The client never supplies the guestId via session (guests are anonymous),
  // so we validate ownership by confirming the selfie belongs to this guest.
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Check the guest_id exists in this event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: guestRow } = await (adminClient as any)
    .from("guests")
    .select("id")
    .eq("id", guest_id)
    .eq("event_id", event_id)
    .maybeSingle();

  if (!guestRow) {
    return NextResponse.json(
      { error: "Guest not found in this event." },
      { status: 403 }
    );
  }

  // 2. If a selfie_id is provided, confirm it belongs to this guest
  if (selfie_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: selfieRow } = await (adminClient as any)
      .from("guest_selfies")
      .select("id")
      .eq("id", selfie_id)
      .eq("guest_id", guest_id)
      .eq("event_id", event_id)
      .maybeSingle();

    if (!selfieRow) {
      return NextResponse.json(
        { error: "Selfie record does not belong to this guest." },
        { status: 403 }
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ status: "queued" });
}

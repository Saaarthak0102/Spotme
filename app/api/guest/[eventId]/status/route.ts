import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    // Fetch event details to determine hackathon / privacy status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventData } = await (adminClient as any)
      .from("events")
      .select("event_type, privacy_mode")
      .eq("id", eventId)
      .maybeSingle();

    // 1. Fetch latest selfie
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: selfieData } = await (adminClient as any)
      .from("guest_selfies")
      .select("id, public_url, status, uploaded_at")
      .eq("guest_id", guestId)
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!selfieData) {
      return NextResponse.json({
        selfieId: null,
        selfieUrl: null,
        status: null,
        matchCount: 0,
        eventType: eventData?.event_type || "other",
        privacyMode: eventData?.privacy_mode || false,
      });
    }

    // 2. Count cached matches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (adminClient as any)
      .from("photo_matches")
      .select("id", { count: "exact", head: true })
      .eq("guest_id", guestId)
      .eq("event_id", eventId);

    let status = selfieData.status as string;

    // 3. Stale cache detection
    if (status === "matched" || status === "uploaded") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: latestMatch } = await (adminClient as any)
        .from("photo_matches")
        .select("matched_at")
        .eq("guest_id", guestId)
        .eq("event_id", eventId)
        .order("matched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: latestPhoto } = await (adminClient as any)
        .from("event_photos")
        .select("uploaded_at")
        .eq("event_id", eventId)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastMatchTime = latestMatch
        ? new Date(latestMatch.matched_at)
        : new Date(selfieData.uploaded_at || 0);

      const lastPhotoTime = latestPhoto
        ? new Date(latestPhoto.uploaded_at)
        : new Date(0);

      if (lastPhotoTime > lastMatchTime) {
        status = "uploaded";
      }
    }

    return NextResponse.json({
      selfieId: selfieData.id,
      selfieUrl: selfieData.public_url,
      status,
      matchCount: count || 0,
      eventType: eventData?.event_type || "other",
      privacyMode: eventData?.privacy_mode || false,
    });
  } catch (err) {
    console.error("[guest/status] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
